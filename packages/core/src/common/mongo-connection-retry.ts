import { Logger } from '@nestjs/common';

import type { MongoModuleOptions } from '../interfaces/mongo-options.interface.js';

/** The module options that drive {@link retryConnection}. */
export type ConnectionRetryOptions = Pick<
  MongoModuleOptions,
  'retryAttempts' | 'retryDelay' | 'verboseRetryLog'
>;

const logger = new Logger('MongoModule');

const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * Call `connect()` and, on failure, log a connection error and retry up to
 * `retryAttempts` times (default `9`) waiting `retryDelay` ms (default `3000`)
 * between attempts — the async/await analogue of `@nestjs/mongoose`'s RxJS
 * `handleRetry`. The final failure is rethrown.
 */
export async function retryConnection<T>(
  connect: () => Promise<T>,
  {
    retryAttempts = 9,
    retryDelay = 3000,
    verboseRetryLog = false,
  }: ConnectionRetryOptions = {},
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retryAttempts; attempt++) {
    try {
      return await connect();
    } catch (error) {
      lastError = error;
      if (attempt >= retryAttempts) break;
      const message = `Unable to connect to the database. Retrying (${attempt + 1})...`;
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
