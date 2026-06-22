import type { InjectionToken, Provider } from '@nestjs/common';
import type { Collection, CollectionOptions, Db } from 'mongodb';

import { getCollectionToken, getDbToken } from './common/mongo.utils.js';
import type {
  AsyncCollectionFactory,
  CollectionInput,
} from './interfaces/collection-definition.interface.js';

/**
 * Builds one provider per collection — analogous to Mongoose's
 * `createMongooseProviders`. Each provider resolves the connection's `Db` and
 * returns `db.collection(name, options)`.
 */
export function createMongoProviders(
  connectionName: string | undefined,
  collections: CollectionInput[] = [],
): Provider[] {
  return collections.map((input): Provider => {
    const definition = typeof input === 'string' ? { name: input } : input;
    return {
      provide: getCollectionToken(definition.name, connectionName),
      useFactory: (db: Db): Collection =>
        db.collection(definition.name, definition.options),
      inject: [getDbToken(connectionName)],
    };
  });
}

/**
 * Builds collection providers whose options are resolved asynchronously —
 * analogous to Mongoose's `createMongooseAsyncProviders`.
 */
export function createMongoAsyncProviders(
  connectionName: string | undefined,
  factories: AsyncCollectionFactory[] = [],
): Provider[] {
  return factories.map((factory): Provider => {
    const resolveOptions = factory.useFactory as (
      ...args: unknown[]
    ) => CollectionOptions | Promise<CollectionOptions>;
    return {
      provide: getCollectionToken(factory.name, connectionName),
      useFactory: async (db: Db, ...args: unknown[]): Promise<Collection> => {
        const options = await resolveOptions(...args);
        return db.collection(factory.name, options);
      },
      inject: [
        getDbToken(connectionName),
        ...((factory.inject ?? []) as InjectionToken[]),
      ],
    };
  });
}
