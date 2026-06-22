# backend-example

Example NestJS REST app using [`@jperezmart/nest-mongodb`](../../packages/core)
with the native MongoDB driver. Demonstrates `forRoot`, `forFeature`,
`@InjectCollection`, `@InjectDb` and a real transaction via
`MongoTransactionService`.

## Run

Point `MONGO_URI` at a MongoDB instance (defaults to
`mongodb://localhost:27017`, database `app`):

```bash
MONGO_URI="mongodb://localhost:27017" pnpm --filter backend-example dev
```

Build and start:

```bash
pnpm --filter backend-example build
MONGO_URI="mongodb://localhost:27017" pnpm --filter backend-example start
```

`app.enableShutdownHooks()` closes the Mongo client when the process stops.

## Endpoints

| Method | Path         | Description                                   |
| ------ | ------------ | --------------------------------------------- |
| GET    | `/cats`      | List all cats                                 |
| GET    | `/cats/db`   | Show the database name (`@InjectDb` demo)     |
| GET    | `/cats/:id`  | Get one cat (404 if missing)                  |
| POST   | `/cats`      | Create a cat                                  |
| POST   | `/cats/bulk` | Insert many cats atomically (**transaction**) |
| DELETE | `/cats/:id`  | Delete a cat                                  |

```bash
curl -X POST localhost:3000/cats -H 'content-type: application/json' \
  -d '{"name":"Felix","age":3,"breed":"tuxedo"}'
curl localhost:3000/cats
```

## Transactions need a replica set

`POST /cats/bulk` uses `MongoTransactionService.withTransaction`, which requires
a replica set (the same constraint as Mongoose). For a quick local replica set
you can use `mongodb-memory-server`'s `MongoMemoryReplSet`, Docker, or
`mongod --replSet`. Single-node standalone servers will reject the transaction.
