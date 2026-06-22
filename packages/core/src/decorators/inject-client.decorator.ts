import { Inject } from '@nestjs/common';

import { getClientToken } from '../common/mongo.utils.js';

/**
 * Injects the {@link import('mongodb').MongoClient} of a connection — the piece
 * you need for sessions/transactions. Analogous to `@InjectConnection()`.
 *
 * @param connectionName - Optional named connection.
 */
export const InjectClient = (
  connectionName?: string,
): ReturnType<typeof Inject> => Inject(getClientToken(connectionName));
