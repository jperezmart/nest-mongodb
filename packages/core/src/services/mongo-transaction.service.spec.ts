import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Collection, MongoClient } from 'mongodb';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { getClientToken, getCollectionToken } from '../common/mongo.utils.js';
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
    // Transactions require a replica set. Test commands enable the
    // `failCommand` fail point used to force a transient error.
    replset = await MongoMemoryReplSet.create({
      replSet: {
        count: 1,
        args: ['--setParameter', 'enableTestCommands=1'],
      },
    });
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

  it('re-runs the callback on a transient transaction error and commits once', async () => {
    // Fail the first update inside the transaction with a
    // TransientTransactionError, as a primary step-down or a write conflict
    // would. The driver's withTransaction then retries the whole callback.
    const admin = app.get<MongoClient>(getClientToken()).db('admin');
    await admin.command({
      configureFailPoint: 'failCommand',
      mode: { times: 1 },
      data: {
        failCommands: ['update'],
        errorCode: 112, // WriteConflict
        errorLabels: ['TransientTransactionError'],
      },
    });

    let attempts = 0;
    try {
      await tx.withTransaction(async session => {
        attempts++;
        await accounts.updateOne(
          { _id: 'b' },
          { $inc: { balance: 10 } },
          { session },
        );
      });
    } finally {
      await admin.command({ configureFailPoint: 'failCommand', mode: 'off' });
    }

    expect(attempts).toBe(2);
    // Committed exactly once: 25 from the first test + 10, not + 20.
    expect((await accounts.findOne({ _id: 'b' }))?.balance).toBe(35);
  });
});
