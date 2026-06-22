import { Inject } from '@nestjs/common';

import { getDbToken } from '../common/mongo.utils.js';

/**
 * Injects the {@link import('mongodb').Db} of a connection — for ad-hoc
 * collection access and database commands. Analogous to `@InjectConnection()`.
 *
 * @param connectionName - Optional named connection.
 */
export const InjectDb = (connectionName?: string): ReturnType<typeof Inject> =>
  Inject(getDbToken(connectionName));
