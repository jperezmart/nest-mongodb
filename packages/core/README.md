# @jperezmart/nest-mongodb

[![npm version](https://img.shields.io/npm/v/@jperezmart/nest-mongodb.svg)](https://www.npmjs.com/package/@jperezmart/nest-mongodb)
[![license](https://img.shields.io/npm/l/@jperezmart/nest-mongodb.svg)](./LICENSE)

Native MongoDB driver integration for NestJS — the same surface as
[`@nestjs/mongoose`](https://docs.nestjs.com/techniques/mongodb), but using the
official `mongodb` driver (`MongoClient` / `Db` / `Collection`) instead of an
ODM. Ships ESM + CJS with type definitions for both.

## Why

`@nestjs/mongoose` is great, but Mongoose brings schemas, hooks, plugins and
discriminators you may not want. This package keeps the ergonomic NestJS module
API — `forRoot`, `forFeature`, injection decorators, connection retry and clean
shutdown — and hands you the raw driver objects.

## Install

```bash
pnpm add @jperezmart/nest-mongodb mongodb
```

`@nestjs/common`, `@nestjs/core`, `reflect-metadata` and `rxjs` are peer
dependencies (you already have them in a Nest app).

### Compatibility

| Dependency                       | Supported                               |
| -------------------------------- | --------------------------------------- |
| Node                             | `>=20.19.0`                             |
| `@nestjs/common`, `@nestjs/core` | `^11.0.0 \|\| ^12.0.0` (Nest 11 and 12) |
| `mongodb`                        | `^7.0.0`                                |

CI runs the test suite against Nest 11 and 12, each with `mongodb` 7.0 and the
newest 7.x. Nest 10 is not supported; use `0.1.x` if you are still on it.

## API at a glance (vs `@nestjs/mongoose`)

| `@nestjs/mongoose`                  | `@jperezmart/nest-mongodb`                   |
| ----------------------------------- | -------------------------------------------- |
| `MongooseModule.forRoot(uri, opts)` | `MongoModule.forRoot(uri, opts)`             |
| `MongooseModule.forRootAsync(opts)` | `MongoModule.forRootAsync(opts)`             |
| `MongooseModule.forFeature(models)` | `MongoModule.forFeature(collections)`        |
| `@InjectConnection()`               | `@InjectClient()` (sessions) / `@InjectDb()` |
| `@InjectModel('Cat')`               | `@InjectCollection('cats')`                  |
| `connection.startSession()`         | `MongoTransactionService.withTransaction()`  |

Option names and defaults mirror `@nestjs/mongoose`: `retryAttempts` (default
`9`), `retryDelay` (default `3000` ms), `connectionName`, `connectionFactory`,
`connectionErrorFactory`, `lazyConnection`, `onConnectionCreate`,
`verboseRetryLog`, plus `dbName` and any `MongoClientOptions` inline. A failed
attempt's client is closed before the next retry. Two deliberate differences:
`onConnectionCreate` is also called when `lazyConnection` is set (upstream
skips it), and `connectionFactory` receives the connection's token (its `Db`
token, see `getDbToken`) as its second argument, the same as upstream passes
the connection token.

## Usage

### Root connection

```ts
import { MongoModule } from '@jperezmart/nest-mongodb';

@Module({
  imports: [
    MongoModule.forRoot('mongodb://localhost:27017', { dbName: 'app' }),
  ],
})
export class AppModule {}
```

Async configuration:

```ts
MongoModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    uri: config.getOrThrow('MONGO_URI'),
    dbName: 'app',
  }),
});
```

Enable shutdown hooks so the client closes on exit:

```ts
const app = await NestFactory.create(AppModule);
app.enableShutdownHooks();
```

### Collections

```ts
import { MongoModule } from '@jperezmart/nest-mongodb';

@Module({ imports: [MongoModule.forFeature(['cats'])] })
export class CatsModule {}
```

```ts
import { InjectCollection } from '@jperezmart/nest-mongodb';
import type { Collection } from 'mongodb';

@Injectable()
export class CatsService {
  constructor(
    @InjectCollection('cats') private readonly cats: Collection<Cat>,
  ) {}

  findAll() {
    return this.cats.find().toArray();
  }
}
```

`forFeature` also accepts full definitions and a connection name:

```ts
MongoModule.forFeature([
  { name: 'cats', options: { readPreference: 'secondary' } },
]);
MongoModule.forFeature(['events'], 'analytics');
```

### Transactions

Requires a replica set (or `mongos`). `withTransaction` commits on success and
aborts + rethrows on error:

```ts
import { MongoTransactionService } from '@jperezmart/nest-mongodb';

@Injectable()
export class BankService {
  constructor(
    @InjectCollection('accounts')
    private readonly accounts: Collection<Account>,
    private readonly tx: MongoTransactionService,
  ) {}

  transfer(from: string, to: string, amount: number) {
    return this.tx.withTransaction(async session => {
      await this.accounts.updateOne(
        { _id: from },
        { $inc: { balance: -amount } },
        { session },
      );
      await this.accounts.updateOne(
        { _id: to },
        { $inc: { balance: amount } },
        { session },
      );
    });
  }
}
```

### Multiple connections

```ts
MongoModule.forRoot('mongodb://primary', { dbName: 'app' });
MongoModule.forRoot('mongodb://analytics', {
  dbName: 'metrics',
  connectionName: 'analytics',
});
```

```ts
constructor(
  @InjectClient('analytics') private readonly client: MongoClient,
  @InjectDb('analytics') private readonly db: Db,
) {}
```

`MongoTransactionService` is bound to the default connection. For a named
connection, inject its client with `@InjectClient(name)` and call
`startSession()` yourself.

## License

MIT
