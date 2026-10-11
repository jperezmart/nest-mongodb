import { Logger } from '@nestjs/common';
import { MongoClient } from 'mongodb';

import type { MongoModuleOptions } from './interfaces/mongo-options.interface.js';

/**
 * Connection opener: the whole lifecycle of opening a connection, behind
 * {@link openConnection}. It splits the module options from the driver
 * options, creates the {@link MongoClient}, calls `onConnectionCreate`,
 * connects (unless `lazyConnection`), retries with logging, calls
 * `connectionFactory` and, on final failure, maps the error with
 * `connectionErrorFactory`.
 *
 * Unlike `@nestjs/mongoose`, a failed attempt closes its client before the
 * delay and the next attempt, so an unreachable server does not leak one
 * client (with its monitoring and timers) per attempt.
 *
 * Deliberate differences from `@nestjs/mongoose`:
 * - `onConnectionCreate` is also called when `lazyConnection` is set;
 *   upstream skips it for lazy connections.
 * - `connectionFactory` receives the connection's token (its `Db` token, see
 *   `getDbToken`) as its second argument, the same as upstream passes the
 *   connection token.
 */

const logger = new Logger('MongoModule');

const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * Open a connection described by the module `options`. `token` is the
 * connection's token, handed to `connectionFactory`.
 */
export async function openConnection(
  options: MongoModuleOptions,
  token: string,
): Promise<MongoClient> {
  const {
    uri,
    dbName: _dbName,
    connectionName: _connectionName,
    retryAttempts,
    retryDelay,
    verboseRetryLog,
    connectionFactory,
    connectionErrorFactory,
    lazyConnection,
    onConnectionCreate,
    ...clientOptions
  } = options;

  if (!uri) {
    throw new Error('MongoModule: a connection `uri` is required.');
  }

  const attempt = async (): Promise<MongoClient> => {
    const client = new MongoClient(uri, clientOptions);
    try {
      onConnectionCreate?.(client);
      if (!lazyConnection) {
        await client.connect();
      }
      return connectionFactory
        ? await connectionFactory(client, token)
        : client;
    } catch (error) {
      await client.close().catch(() => undefined);
      throw error;
    }
  };

  try {
    return await retry(attempt, retryAttempts, retryDelay, verboseRetryLog);
  } catch (error) {
    throw connectionErrorFactory
      ? connectionErrorFactory(error as Error)
      : error;
  }
}

/**
 * Call `attempt()` and, on failure, retry up to `retryAttempts` times waiting
 * `retryDelay` ms between attempts. The final failure is rethrown.
 */
export async function retry<T>(
  attempt: () => Promise<T>,
  retryAttempts = 9,
  retryDelay = 3000,
  verboseRetryLog = false,
): Promise<T> {
  let lastError: unknown;
  for (let n = 0; n <= retryAttempts; n++) {
    try {
      return await attempt();
    } catch (error) {
      lastError = error;
      if (n >= retryAttempts) break;
      const message = `Unable to connect to the database. Retrying (${n + 1})...`;
      if (verboseRetryLog) {
        const reason = error instanceof Error ? error.stack : String(error);
        logger.error(`${message} ${reason}`);
      } else {
        logger.error(message);
      }
      await sleep(retryDelay);
    }
  }
  throw lastError;
}
