import type { MongoClient } from 'mongodb';

import { retry } from '../connection-opener.js';
import { DEFAULT_DB_CONNECTION } from '../mongo.constants.js';

/**
 * Injection-token helpers. The native driver splits a Mongoose `Connection`
 * into a {@link MongoClient} (sessions/transactions) and a `Db` (collections),
 * so we expose two connection tokens plus a collection token — keeping the same
 * string format as `@nestjs/mongoose` (`getConnectionToken` / `getModelToken`):
 * a stable default name, or `${name}…` for named connections.
 */

/** Token for the {@link MongoClient} of a connection (≈ `getConnectionToken`). */
export function getClientToken(connectionName?: string): string {
  return connectionName && connectionName !== DEFAULT_DB_CONNECTION
    ? `${connectionName}Client`
    : 'DatabaseClient';
}

/** Token for the `Db` of a connection — the canonical connection token. */
export function getDbToken(connectionName?: string): string {
  return connectionName && connectionName !== DEFAULT_DB_CONNECTION
    ? `${connectionName}Connection`
    : DEFAULT_DB_CONNECTION;
}

/** Token for a `Collection` (≈ `getModelToken('Cat')` → `'CatCollection'`). */
export function getCollectionToken(
  name: string,
  connectionName?: string,
): string {
  if (connectionName === undefined) {
    return `${name}Collection`;
  }
  return `${getDbToken(connectionName)}/${name}Collection`;
}

/**
 * Establish the connection with retries — the async/await analogue of
 * `@nestjs/mongoose`'s RxJS `handleRetry`. Calls `factory()` and, on failure,
 * retries up to `retryAttempts` times waiting `retryDelay` ms between attempts.
 * The final attempt rethrows so module initialization fails loudly.
 *
 * @deprecated Configure retries through the module options instead
 * (`retryAttempts`, `retryDelay`, `verboseRetryLog` on `MongoModule.forRoot`
 * / `forRootAsync`). This helper does not close a failed client before
 * retrying, and will be removed in a future major release.
 */
export async function connectWithRetry(
  factory: () => Promise<MongoClient>,
  retryAttempts = 9,
  retryDelay = 3000,
  verboseRetryLog = false,
): Promise<MongoClient> {
  return retry(factory, retryAttempts, retryDelay, verboseRetryLog);
}
