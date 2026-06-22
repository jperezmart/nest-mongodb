import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Collection } from 'mongodb';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { getCollectionToken } from '../common/mongo.utils.js';
import { MongoModule } from '../mongo.module.js';
import { MongoTransactionService } from './mongo-transaction.service.js';

interface Account {
  _id: string;
  balance: number;
}

describe('MongoTransactionService', () => {
  let replset: MongoMemoryReplSet;
  let app: INestApplication;
  let tx: MongoTransactionService;
  let accounts: Collection<Account>;

  beforeAll(async () => {
    // Transactions require a replica set.
    replset = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    const moduleRef = await Test.createTestingModule({
      imports: [
        MongoModule.forRoot(replset.getUri(), { dbName: 'bank' }),
        MongoModule.forFeature(['accounts']),
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    tx = app.get(MongoTransactionService);
    accounts = app.get<Collection<Account>>(getCollectionToken('accounts'));
    await accounts.insertMany([
      { _id: 'a', balance: 100 },
      { _id: 'b', balance: 0 },
    ]);
  });

  afterAll(async () => {
    await app.close();
    await replset.stop();
  });

  it('commits when the callback resolves', async () => {
    await tx.withTransaction(async session => {
      await accounts.updateOne(
        { _id: 'a' },
        { $inc: { balance: -25 } },
        { session },
      );
      await accounts.updateOne(
        { _id: 'b' },
        { $inc: { balance: 25 } },
        { session },
      );
    });

    expect((await accounts.findOne({ _id: 'a' }))?.balance).toBe(75);
    expect((await accounts.findOne({ _id: 'b' }))?.balance).toBe(25);
  });

  it('aborts and rethrows when the callback throws', async () => {
    await expect(
      tx.withTransaction(async session => {
        await accounts.updateOne(
          { _id: 'a' },
          { $inc: { balance: -75 } },
          { session },
        );
        throw new Error('insufficient funds');
      }),
    ).rejects.toThrow('insufficient funds');

    // The decrement was rolled back.
    expect((await accounts.findOne({ _id: 'a' }))?.balance).toBe(75);
  });
});
