import { Injectable } from '@nestjs/common';
import type {
  ClientSession,
  ClientSessionOptions,
  MongoClient,
  TransactionOptions,
} from 'mongodb';

import { InjectClient } from '../decorators/inject-client.decorator.js';

/** Options accepted by {@link MongoTransactionService.withTransaction}. */
export interface WithTransactionOptions {
  /** Options for the underlying `client.startSession`. */
  session?: ClientSessionOptions;
  /** Options for the transaction (readConcern, writeConcern, readPreference). */
  transaction?: TransactionOptions;
}

/**
 * Convenience wrapper around the native `client.startSession()` +
 * `session.withTransaction()` pattern. `@nestjs/mongoose` has no equivalent —
 * there you would call `connection.startSession()` — but the native driver's
 * `withTransaction` already handles commit/abort and retries, so this is the
 * recommended way to run a transaction.
 *
 * Bound to the default connection. For a named connection, inject its client
 * with `@InjectClient(name)` and call `startSession()` yourself.
 *
 * @remarks Transactions require a replica set (or `mongos`).
 */
@Injectable()
export class MongoTransactionService {
  constructor(@InjectClient() private readonly client: MongoClient) {}

  /**
   * Runs `fn` inside a transaction, committing on success and aborting on a
   * thrown error (the error is rethrown). The session is always ended.
   */
  async withTransaction<T>(
    fn: (session: ClientSession) => Promise<T>,
    options?: WithTransactionOptions,
  ): Promise<T> {
    const session = this.client.startSession(options?.session);
    try {
      let result!: T;
      await session.withTransaction(async () => {
        result = await fn(session);
      }, options?.transaction);
      return result;
    } finally {
      await session.endSession();
    }
  }

  /** Starts a raw session — caller manages commit/abort and `endSession`. */
  startSession(options?: ClientSessionOptions): ClientSession {
    return this.client.startSession(options);
  }
}
