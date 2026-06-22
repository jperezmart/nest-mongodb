import type { ModuleMetadata } from '@nestjs/common';
import type { CollectionOptions } from 'mongodb';

/**
 * A collection to register with `forFeature` — analogous to Mongoose's
 * `ModelDefinition`. A bare string is shorthand for `{ name }`.
 */
export interface CollectionDefinition {
  name: string;
  options?: CollectionOptions;
}

/** Accepted by `forFeature`: either a name or a full definition. */
export type CollectionInput = string | CollectionDefinition;

/**
 * Async collection factory for `forFeatureAsync` — analogous to Mongoose's
 * `AsyncModelFactory`. Resolves the collection options at runtime.
 */
export interface AsyncCollectionFactory {
  name: string;
  useFactory: (
    ...args: never[]
  ) => CollectionOptions | Promise<CollectionOptions>;
  inject?: unknown[];
  imports?: ModuleMetadata['imports'];
}
