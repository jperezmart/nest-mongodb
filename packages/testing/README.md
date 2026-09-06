# @jperezmart/nest-mongodb-testing

[![npm version](https://img.shields.io/npm/v/@jperezmart/nest-mongodb-testing.svg)](https://www.npmjs.com/package/@jperezmart/nest-mongodb-testing)
[![license](https://img.shields.io/npm/l/@jperezmart/nest-mongodb-testing.svg)](./LICENSE)

Testing utilities for [`@jperezmart/nest-mongodb`](https://github.com/jperezmart/nest-mongodb/tree/main/packages/core).
Spin up an ephemeral MongoDB with
[`mongodb-memory-server`](https://github.com/typegoose/mongodb-memory-server) —
no external infra — and wire it into your Nest test module.

## Install

```bash
pnpm add -D @jperezmart/nest-mongodb-testing
```

## `MongoTestModule.forRoot(options?)`

Boots an in-memory server and configures `MongoModule.forRoot` against it. The
server starts asynchronously, so `await` it in `imports`:

```ts
import {
  MongoTestModule,
  closeInMemoryMongo,
} from '@jperezmart/nest-mongodb-testing';
import { MongoModule } from '@jperezmart/nest-mongodb';
import { Test } from '@nestjs/testing';

let app: INestApplication;

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({
    imports: [
      await MongoTestModule.forRoot(), // { dbName?, replSet? }
      MongoModule.forFeature(['cats']),
    ],
    providers: [CatsService],
  }).compile();
  app = moduleRef.createNestApplication();
  await app.init();
});

afterAll(async () => {
  await app.close();
  await closeInMemoryMongo();
});
```

Pass `{ replSet: true }` to start a single-node replica set when you need
transactions.

## `createTestCollection(name, options?)`

For unit tests that don't boot Nest — connects a throwaway client and returns a
collection plus its teardown:

```ts
import { createTestCollection } from '@jperezmart/nest-mongodb-testing';

const { collection, cleanup } = await createTestCollection<Cat>('cats');
await collection.insertOne({ name: 'Felix' });
// ...
await cleanup();
```

## `closeInMemoryMongo()`

Stops every in-memory server started by `MongoTestModule`. Call it in
`afterAll`.

## License

MIT
