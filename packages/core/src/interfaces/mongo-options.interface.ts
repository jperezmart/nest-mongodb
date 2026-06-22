import type { ModuleMetadata, Type } from '@nestjs/common';
import type { MongoClient, MongoClientOptions } from 'mongodb';

/**
 * Root options for a connection. Extends {@link MongoClientOptions} so every
 * native driver option can be passed inline — mirroring how
 * `MongooseModuleOptions extends ConnectOptions` in `@nestjs/mongoose`.
 */
export interface MongoModuleOptions extends MongoClientOptions {
  /** Connection string. May also be passed as the first arg of `forRoot`. */
  uri?: string;
  /** Database to expose via `@InjectDb`/`@InjectCollection`. Defaults to the db in the URI. */
  dbName?: string;
  /** Name of this connection (for multiple connections). */
  connectionName?: string;
  /** Connection retry attempts. Default `9`. */
  retryAttempts?: number;
  /** Delay between retries, in ms. Default `3000`. */
  retryDelay?: number;
  /** Hook to wrap/replace the connected client (e.g. instrumentation). */
  connectionFactory?: (
    client: MongoClient,
    name: string,
  ) => MongoClient | Promise<MongoClient>;
  /** Transform connection errors before they bubble up. */
  connectionErrorFactory?: (error: Error) => Error;
  /** Create the client without awaiting `connect()` (connect lazily). */
  lazyConnection?: boolean;
  /** Called right after the client is created (before connecting). */
  onConnectionCreate?: (client: MongoClient) => void;
  /** Log the full error/stack on each retry. Default `false`. */
  verboseRetryLog?: boolean;
}

/** Options minus `connectionName` — what factories return. */
export type MongoModuleFactoryOptions = Omit<
  MongoModuleOptions,
  'connectionName'
>;

/** Class-based async options provider. */
export interface MongoOptionsFactory {
  createMongoOptions():
    | Promise<MongoModuleFactoryOptions>
    | MongoModuleFactoryOptions;
}

/** Async configuration for `forRootAsync`. */
export interface MongoModuleAsyncOptions extends Pick<
  ModuleMetadata,
  'imports'
> {
  connectionName?: string;
  useExisting?: Type<MongoOptionsFactory>;
  useClass?: Type<MongoOptionsFactory>;
  useFactory?: (
    ...args: never[]
  ) => Promise<MongoModuleFactoryOptions> | MongoModuleFactoryOptions;
  inject?: unknown[];
}
