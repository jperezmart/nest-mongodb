import type {
  DynamicModule,
  OnApplicationShutdown,
  Provider,
  Type,
} from '@nestjs/common';
import { Global, Inject, Module } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import type { Db, MongoClient } from 'mongodb';

import {
  getClientToken,
  getDbToken,
  getTransactionServiceToken,
  isDefaultConnection,
} from './common/mongo.utils.js';
import type {
  MongoModuleAsyncOptions,
  MongoModuleOptions,
  MongoOptionsFactory,
} from './interfaces/mongo-options.interface.js';
import {
  MONGO_CONNECTION_NAME,
  MONGO_MODULE_OPTIONS,
} from './mongo.constants.js';
import { openConnection } from './mongo-connection-opener.js';
import { MongoTransactionService } from './services/mongo-transaction.service.js';

/**
 * Internal module that wires a connection into DI — the {@link MongoClient}
 * (opened by {@link openConnection}) and its {@link Db} — and closes the
 * client on shutdown. Mirrors `@nestjs/mongoose`'s `MongooseCoreModule`.
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
        openConnection(opts, dbToken),
      inject: [MONGO_MODULE_OPTIONS],
    };

    const dbProvider: Provider = {
      provide: dbToken,
      useFactory: (client: MongoClient, opts: MongoModuleOptions): Db =>
        client.db(opts.dbName),
      inject: [clientToken, MONGO_MODULE_OPTIONS],
    };

    // Every connection gets its own transaction service, bound to its client.
    // The default one is also registered under its class, so it stays
    // injectable without a decorator.
    const txToken = getTransactionServiceToken(connectionName);
    const txProvider: Provider = {
      provide: txToken,
      useFactory: (client: MongoClient) => new MongoTransactionService(client),
      inject: [clientToken],
    };
    const txClassTokens = isDefaultConnection(connectionName)
      ? [MongoTransactionService]
      : [];
    const txClassProviders: Provider[] = txClassTokens.map(provide => ({
      provide,
      useExisting: txToken,
    }));

    return {
      module: MongoCoreModule,
      imports,
      providers: [
        ...optionsProviders,
        connectionNameProvider,
        clientProvider,
        dbProvider,
        txProvider,
        ...txClassProviders,
      ],
      exports: [clientToken, dbToken, txToken, ...txClassTokens],
    };
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
