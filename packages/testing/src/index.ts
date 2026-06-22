import { MongoModule } from '@jperezmart/nest-mongodb';
import type { DynamicModule } from '@nestjs/common';
import { Module } from '@nestjs/common';
import type { Collection, Document } from 'mongodb';
import { MongoClient } from 'mongodb';
import { MongoMemoryReplSet, MongoMemoryServer } from 'mongodb-memory-server';

type EphemeralServer = MongoMemoryServer | MongoMemoryReplSet;

/** Tracks every in-memory server started by this module so they can be torn down. */
const startedServers = new Set<EphemeralServer>();

/** Options for {@link MongoTestModule.forRoot} and {@link createTestCollection}. */
export interface MongoTestOptions {
  /** Database name. Defaults to `'test'`. */
  dbName?: string;
  /** Start a single-node replica set instead of a standalone — required for transactions. */
  replSet?: boolean;
}

async function startServer(replSet: boolean): Promise<EphemeralServer> {
  const server = replSet
    ? await MongoMemoryReplSet.create({ replSet: { count: 1 } })
    : await MongoMemoryServer.create();
  startedServers.add(server);
  return server;
}

/**
 * Boots an ephemeral MongoDB (no external infra) and wires
 * `MongoModule.forRoot` against it. Because the server starts asynchronously,
 * this method is async — `await` it in your `imports`:
 *
 * ```ts
 * const moduleRef = await Test.createTestingModule({
 *   imports: [await MongoTestModule.forRoot(), CatsModule],
 * }).compile();
 * // ...
 * afterAll(closeInMemoryMongo);
 * ```
 */
@Module({})
export class MongoTestModule {
  static async forRoot(options: MongoTestOptions = {}): Promise<DynamicModule> {
    const server = await startServer(options.replSet ?? false);
    return {
      module: MongoTestModule,
      imports: [
        MongoModule.forRoot(server.getUri(), {
          dbName: options.dbName ?? 'test',
        }),
      ],
    };
  }
}

/** Stops every in-memory server started by {@link MongoTestModule}. Call in `afterAll`. */
export async function closeInMemoryMongo(): Promise<void> {
  await Promise.all([...startedServers].map(server => server.stop()));
  startedServers.clear();
}

/** A standalone collection backed by an ephemeral server, plus its teardown. */
export interface TestCollection<T extends Document> {
  collection: Collection<T>;
  client: MongoClient;
  /** Closes the client and stops the server. */
  cleanup: () => Promise<void>;
}

/**
 * Connects a throwaway {@link MongoClient} to an ephemeral server and returns a
 * collection plus a `cleanup` — for unit tests that don't need to boot Nest.
 */
export async function createTestCollection<T extends Document = Document>(
  name: string,
  options: MongoTestOptions = {},
): Promise<TestCollection<T>> {
  const server = await startServer(options.replSet ?? false);
  const client = new MongoClient(server.getUri());
  await client.connect();
  const collection = client.db(options.dbName ?? 'test').collection<T>(name);
  return {
    collection,
    client,
    cleanup: async () => {
      await client.close();
      await server.stop();
      startedServers.delete(server);
    },
  };
}
