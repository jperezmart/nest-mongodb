import type {
  DynamicModule,
  OnApplicationShutdown,
  Provider,
  Type,
} from '@nestjs/common';
import { Global, Inject, Module } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import type { Db } from 'mongodb';
import { MongoClient } from 'mongodb';

import {
  connectWithRetry,
  getClientToken,
  getDbToken,
} from './common/mongo.utils.js';
import type {
  MongoModuleAsyncOptions,
  MongoModuleOptions,
  MongoOptionsFactory,
} from './interfaces/mongo-options.interface.js';
import {
  DEFAULT_DB_CONNECTION,
  MONGO_CONNECTION_NAME,
  MONGO_MODULE_OPTIONS,
} from './mongo.constants.js';
import { MongoTransactionService } from './services/mongo-transaction.service.js';

/**
 * Internal module that owns a connection's lifecycle — creating and connecting
 * the {@link MongoClient} (with retries), exposing its {@link Db}, and closing
 * the client on shutdown. Mirrors `@nestjs/mongoose`'s `MongooseCoreModule`.
 */
@Global()
@Module({})
export class MongoCoreModule implements OnApplicationShutdown {
  constructor(
    @Inject(MONGO_CONNECTION_NAME) private readonly clientToken: string,
    private readonly moduleRef: ModuleRef,
  ) {}

  static forRoot(uri: string, options: MongoModuleOptions = {}): DynamicModule {
    const connectionName = options.connectionName;
    const optionsProvider: Provider = {
      provide: MONGO_MODULE_OPTIONS,
      useValue: { ...options, uri: options.uri ?? uri },
    };
    return MongoCoreModule.assemble(connectionName, [optionsProvider], []);
  }

  static forRootAsync(options: MongoModuleAsyncOptions): DynamicModule {
    const connectionName = options.connectionName;
    return MongoCoreModule.assemble(
      connectionName,
      MongoCoreModule.createAsyncProviders(options),
      options.imports ?? [],
    );
  }

  async onApplicationShutdown(): Promise<void> {
    const client = this.moduleRef.get<MongoClient | undefined>(
      this.clientToken,
      { strict: false },
    );
    if (client) {
      await client.close();
    }
  }

  /** Common wiring for both `forRoot` and `forRootAsync`. */
  private static assemble(
    connectionName: string | undefined,
    optionsProviders: Provider[],
    imports: NonNullable<DynamicModule['imports']>,
  ): DynamicModule {
    const clientToken = getClientToken(connectionName);
    const dbToken = getDbToken(connectionName);

    const connectionNameProvider: Provider = {
      provide: MONGO_CONNECTION_NAME,
      useValue: clientToken,
    };

    const clientProvider: Provider = {
      provide: clientToken,
      useFactory: (opts: MongoModuleOptions): Promise<MongoClient> =>
        MongoCoreModule.createClient(opts, dbToken),
      inject: [MONGO_MODULE_OPTIONS],
    };

    const dbProvider: Provider = {
      provide: dbToken,
      useFactory: (client: MongoClient, opts: MongoModuleOptions): Db =>
        client.db(opts.dbName),
      inject: [clientToken, MONGO_MODULE_OPTIONS],
    };

    // The transaction service injects the default client, so it is only
    // registered for the default connection. Named connections use
    // `@InjectClient(name)` + `startSession()`.
    const isDefault =
      connectionName === undefined || connectionName === DEFAULT_DB_CONNECTION;
    const txProviders: Provider[] = isDefault ? [MongoTransactionService] : [];

    return {
      module: MongoCoreModule,
      imports,
      providers: [
        ...optionsProviders,
        connectionNameProvider,
        clientProvider,
        dbProvider,
        ...txProviders,
      ],
      exports: [clientToken, dbToken, ...txProviders],
    };
  }

  /** Creates and connects the client, applying retry/factory/error hooks. */
  private static async createClient(
    options: MongoModuleOptions,
    name: string,
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

    const wrap =
      connectionFactory ?? ((client: MongoClient): MongoClient => client);
    const toError = connectionErrorFactory ?? ((error: Error): Error => error);

    try {
      return await connectWithRetry(
        async () => {
          const client = new MongoClient(uri, clientOptions);
          onConnectionCreate?.(client);
          if (lazyConnection) {
            return wrap(client, name);
          }
          await client.connect();
          return wrap(client, name);
        },
        retryAttempts,
        retryDelay,
        verboseRetryLog,
      );
    } catch (error) {
      throw toError(error as Error);
    }
  }

  private static createAsyncProviders(
    options: MongoModuleAsyncOptions,
  ): Provider[] {
    if (options.useExisting || options.useFactory) {
      return [MongoCoreModule.createAsyncOptionsProvider(options)];
    }
    const useClass = options.useClass as Type<MongoOptionsFactory>;
    return [
      MongoCoreModule.createAsyncOptionsProvider(options),
      { provide: useClass, useClass },
    ];
  }

  private static createAsyncOptionsProvider(
    options: MongoModuleAsyncOptions,
  ): Provider {
    if (options.useFactory) {
      return {
        provide: MONGO_MODULE_OPTIONS,
        useFactory: options.useFactory as (...args: unknown[]) => unknown,
        inject: (options.inject ?? []) as never[],
      };
    }
    const inject = [
      (options.useExisting ?? options.useClass) as Type<MongoOptionsFactory>,
    ];
    return {
      provide: MONGO_MODULE_OPTIONS,
      useFactory: (factory: MongoOptionsFactory) =>
        factory.createMongoOptions(),
      inject,
    };
  }
}
