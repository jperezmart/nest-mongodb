import { Inject } from '@nestjs/common';

import { getTransactionServiceToken } from '../common/mongo.utils.js';

/**
 * Injects the `MongoTransactionService` bound to a connection. On the default
 * connection the service can also be injected by its class, without this
 * decorator.
 *
 * @param connectionName - Optional named connection.
 */
export const InjectTransactionService = (
  connectionName?: string,
): ReturnType<typeof Inject> =>
  Inject(getTransactionServiceToken(connectionName));
