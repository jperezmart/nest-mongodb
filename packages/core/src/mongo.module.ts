import type { DynamicModule } from '@nestjs/common';
import { Module } from '@nestjs/common';

import type {
  AsyncCollectionFactory,
  CollectionInput,
} from './interfaces/collection-definition.interface.js';
import type {
  MongoModuleAsyncOptions,
  MongoModuleOptions,
} from './interfaces/mongo-options.interface.js';
import {
  createMongoAsyncProviders,
  createMongoProviders,
} from './mongo.providers.js';
import { MongoCoreModule } from './mongo-core.module.js';

/**
 * Native MongoDB driver integration for NestJS. Mirrors `@nestjs/mongoose`'s
 * `MongooseModule` API:
 *
 * - {@link MongoModule.forRoot} / {@link MongoModule.forRootAsync} — open a
 *   connection (a {@link import('mongodb').MongoClient} + {@link import('mongodb').Db})
 *   once, exposed globally.
 * - {@link MongoModule.forFeature} / {@link MongoModule.forFeatureAsync} —
 *   register collections in a feature module, injectable via `@InjectCollection`.
 */
@Module({})
export class MongoModule {
  /** Open a connection from a URI and options (sync). Registered globally. */
  static forRoot(uri: string, options?: MongoModuleOptions): DynamicModule {
    return {
      module: MongoModule,
      imports: [MongoCoreModule.forRoot(uri, options)],
    };
  }

  /** Open a connection whose options are resolved from other providers. */
  static forRootAsync(options: MongoModuleAsyncOptions): DynamicModule {
    return {
      module: MongoModule,
      imports: [MongoCoreModule.forRootAsync(options)],
    };
  }

  /** Register collections for injection with `@InjectCollection`. */
  static forFeature(
    collections: CollectionInput[] = [],
    connectionName?: string,
  ): DynamicModule {
    const providers = createMongoProviders(connectionName, collections);
    return {
      module: MongoModule,
      providers,
      exports: providers,
    };
  }

  /** Register collections whose options are resolved asynchronously. */
  static forFeatureAsync(
    factories: AsyncCollectionFactory[] = [],
    connectionName?: string,
  ): DynamicModule {
    const providers = createMongoAsyncProviders(connectionName, factories);
    const imports = factories
      .flatMap(factory => factory.imports ?? [])
      .filter((value, index, self) => self.indexOf(value) === index);
    return {
      module: MongoModule,
      imports,
      providers,
      exports: providers,
    };
  }
}
