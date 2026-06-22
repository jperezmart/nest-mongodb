import { Inject } from '@nestjs/common';

import { getCollectionToken } from '../common/mongo.utils.js';

/**
 * Injects a {@link import('mongodb').Collection} registered via
 * `MongoModule.forFeature`. Analogous to `@InjectModel('Cat')`.
 *
 * @param name           - Collection name passed to `forFeature`.
 * @param connectionName - Optional named connection.
 */
export const InjectCollection = (
  name: string,
  connectionName?: string,
): ReturnType<typeof Inject> =>
  Inject(getCollectionToken(name, connectionName));
