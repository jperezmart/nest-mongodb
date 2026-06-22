import { InjectCollection, MongoModule } from '@jperezmart/nest-mongodb';
import { Injectable } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Collection } from 'mongodb';
import { afterAll, describe, expect, it } from 'vitest';

import {
  closeInMemoryMongo,
  createTestCollection,
  MongoTestModule,
} from './index.js';

interface Cat {
  name: string;
}

@Injectable()
class CatsRepo {
  constructor(
    @InjectCollection('cats') private readonly cats: Collection<Cat>,
  ) {}

  add(name: string): Promise<unknown> {
    return this.cats.insertOne({ name });
  }

  count(): Promise<number> {
    return this.cats.countDocuments();
  }
}

describe('@jperezmart/nest-mongodb-testing', () => {
  afterAll(closeInMemoryMongo);

  it('wires MongoTestModule into a Nest app', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        await MongoTestModule.forRoot(),
        MongoModule.forFeature(['cats']),
      ],
      providers: [CatsRepo],
    }).compile();
    const app = moduleRef.createNestApplication();
    await app.init();

    const repo = app.get(CatsRepo);
    await repo.add('Felix');
    expect(await repo.count()).toBe(1);

    await app.close();
  });

  it('createTestCollection works without Nest', async () => {
    const { collection, cleanup } = await createTestCollection<Cat>('cats');
    await collection.insertOne({ name: 'Garfield' });
    expect(await collection.countDocuments()).toBe(1);
    await cleanup();
  });
});
