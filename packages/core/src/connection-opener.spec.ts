import type { MongoClient } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { openConnection } from './connection-opener.js';
import type { MongoModuleOptions } from './interfaces/mongo-options.interface.js';

/** Nothing listens on port 1, so every attempt fails fast. */
const UNREACHABLE_URI = 'mongodb://127.0.0.1:1/?serverSelectionTimeoutMS=100';

const TOKEN = 'DatabaseConnection';

describe('openConnection', () => {
  let mongo: MongoMemoryServer;
  const opened: MongoClient[] = [];

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
  });

  afterAll(async () => {
    await Promise.all(opened.map(client => client.close()));
    await mongo.stop();
  });

  const open = async (
    ...args: Parameters<typeof openConnection>
  ): Promise<MongoClient> => {
    const client = await openConnection(...args);
    opened.push(client);
    return client;
  };

  it('returns a connected client on the first attempt', async () => {
    const created = vi.fn();
    const client = await open(
      { uri: mongo.getUri(), onConnectionCreate: created },
      TOKEN,
    );
    expect(created).toHaveBeenCalledTimes(1);
    expect(created).toHaveBeenCalledWith(client);
    await expect(client.db('test').command({ ping: 1 })).resolves.toEqual({
      ok: 1,
    });
  });

  it('retries a failed attempt and resolves with the next client', async () => {
    const created: MongoClient[] = [];
    const connectionFactory = vi
      .fn<(client: MongoClient, name: string) => Promise<MongoClient>>()
      .mockRejectedValueOnce(new Error('not ready'))
      .mockImplementation(async client => client);

    const client = await open(
      {
        uri: mongo.getUri(),
        retryDelay: 1,
        connectionFactory,
        onConnectionCreate: c => created.push(c),
      },
      TOKEN,
    );

    expect(created).toHaveLength(2);
    expect(client).toBe(created[1]);
    // the failed attempt's client was closed, the returned one still works
    await expect(created[0]!.db('test').command({ ping: 1 })).rejects.toThrow();
    await expect(client.db('test').command({ ping: 1 })).resolves.toEqual({
      ok: 1,
    });
  });

  it('passes the client and the connection token to connectionFactory', async () => {
    const wrapped = {} as MongoClient;
    const connectionFactory = vi.fn().mockResolvedValue(wrapped);
    let created: MongoClient | undefined;

    const result = await openConnection(
      {
        uri: mongo.getUri(),
        connectionFactory,
        onConnectionCreate: c => (created = c),
      },
      'analyticsConnection',
    );

    expect(result).toBe(wrapped);
    expect(connectionFactory).toHaveBeenCalledWith(
      created,
      'analyticsConnection',
    );
    await created?.close();
  });

  it('maps the final error with connectionErrorFactory after exhausting the attempts', async () => {
    const created = vi.fn();
    const connectionErrorFactory = vi.fn(
      (error: Error) => new Error(`mapped: ${error.name}`),
    );

    await expect(
      openConnection(
        {
          uri: UNREACHABLE_URI,
          retryAttempts: 1,
          retryDelay: 1,
          onConnectionCreate: created,
          connectionErrorFactory,
        },
        TOKEN,
      ),
    ).rejects.toThrow('mapped: MongoServerSelectionError');

    expect(created).toHaveBeenCalledTimes(2);
    expect(connectionErrorFactory).toHaveBeenCalledTimes(1);
  });

  it('skips connecting in lazy mode but still calls onConnectionCreate', async () => {
    const created = vi.fn();
    // unreachable: resolving proves no connection was attempted
    const client = await open(
      {
        uri: UNREACHABLE_URI,
        lazyConnection: true,
        retryAttempts: 0,
        onConnectionCreate: created,
      },
      TOKEN,
    );
    expect(created).toHaveBeenCalledWith(client);
  });

  it('connects lazily on the first operation', async () => {
    const client = await open(
      { uri: mongo.getUri(), lazyConnection: true },
      TOKEN,
    );
    await expect(client.db('test').command({ ping: 1 })).resolves.toEqual({
      ok: 1,
    });
  });

  it('requires a uri', async () => {
    await expect(openConnection({}, TOKEN)).rejects.toThrow(/uri/);
  });

  // Each failed attempt must tear its client down (monitors, timers, sockets)
  // before the next one, observed through the driver's public SDAM monitoring
  // events. On an unreachable server driver 7 already closes the topology when
  // `connect()` fails; a client that connected and then failed later (here, in
  // `connectionFactory`) is only closed by the opener.
  it.each([
    {
      failure: 'the server is unreachable',
      options: (): MongoModuleOptions => ({ uri: UNREACHABLE_URI }),
    },
    {
      failure: 'connectionFactory throws after connecting',
      options: (): MongoModuleOptions => ({
        uri: mongo.getUri(),
        connectionFactory: () => Promise.reject(new Error('factory failed')),
      }),
    },
  ])(
    'closes each failed client before the next attempt, leaving none open, when $failure',
    async ({ options }) => {
      const events: string[] = [];
      let created = 0;

      await expect(
        openConnection(
          {
            ...options(),
            retryAttempts: 2,
            retryDelay: 1,
            onConnectionCreate: client => {
              const index = created++;
              events.push(`create ${index}`);
              client.on('topologyOpening', () => events.push(`open ${index}`));
              client.on('topologyClosed', () => events.push(`closed ${index}`));
            },
          },
          TOKEN,
        ),
      ).rejects.toThrow();

      // initial attempt + 2 retries; each client's topology is opened and
      // torn down before the next client is even created
      expect(events).toEqual([
        'create 0',
        'open 0',
        'closed 0',
        'create 1',
        'open 1',
        'closed 1',
        'create 2',
        'open 2',
        'closed 2',
      ]);
    },
  );
});
