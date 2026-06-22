import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Collection, MongoClient } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { getClientToken, getCollectionToken } from './common/mongo.utils.js';
import { MongoModule } from './mongo.module.js';

interface Cat {
  name: string;
}

describe('MongoModule (forRoot + forFeature)', () => {
  let mongo: MongoMemoryServer;
  let app: INestApplication;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    const moduleRef = await Test.createTestingModule({
      imports: [
        MongoModule.forRoot(mongo.getUri(), { dbName: 'test' }),
        MongoModule.forFeature(['cats']),
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    try {
      await app.close();
    } catch {
      /* the shutdown test may have already closed the app */
    }
    await mongo.stop();
  });

  it('injects the registered collection', async () => {
    const cats = app.get<Collection<Cat>>(getCollectionToken('cats'));
    await cats.deleteMany({});
    await cats.insertOne({ name: 'Felix' });
    expect(await cats.countDocuments()).toBe(1);
    expect((await cats.findOne({ name: 'Felix' }))?.name).toBe('Felix');
  });

  it('closes the client on application shutdown', async () => {
    const client = app.get<MongoClient>(getClientToken());
    await app.close();
    // A closed client rejects further operations.
    await expect(client.db('test').command({ ping: 1 })).rejects.toThrow();
  });
});
