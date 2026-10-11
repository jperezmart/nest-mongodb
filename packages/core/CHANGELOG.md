# @jperezmart/nest-mongodb

## 0.2.0

### Minor Changes

- [#13](https://github.com/jperezmart/nest-mongodb/pull/13) [`6f6e759`](https://github.com/jperezmart/nest-mongodb/commit/6f6e759f3b7c31592258db2fc71aa57a1eb9ec2c) Thanks [@jperezmart](https://github.com/jperezmart)! - Support Nest 12 and drop Nest 10. The `@nestjs/*` peer ranges are now `^11.0.0 || ^12.0.0`, exactly the versions CI tests (Nest 11 and 12, each against `mongodb` 7.0 and the newest 7.x). Both packages now declare `engines.node` `>=20.19.0`, the same floor as the `mongodb` v7 driver and `@nestjs/mongoose` 12.
  
  **Breaking:** Nest 10 is no longer supported. This ships as a minor because the packages are still 0.x; stay on `0.1.x` if you are on Nest 10.

- [#16](https://github.com/jperezmart/nest-mongodb/pull/16) [`56bac7a`](https://github.com/jperezmart/nest-mongodb/commit/56bac7a40d016a7440ca287b244d6332f29ad377) Thanks [@jperezmart](https://github.com/jperezmart)! - Register a `MongoTransactionService` on every connection, including named ones. Inject a named connection's service with `@InjectTransactionService(name)`, or resolve it with `getTransactionServiceToken(name)`. The default connection's service is still injectable by class.

### Patch Changes

- [#14](https://github.com/jperezmart/nest-mongodb/pull/14) [`4f4fc79`](https://github.com/jperezmart/nest-mongodb/commit/4f4fc7954dc12b63304e64c8a86a9f1c79157dbc) Thanks [@jperezmart](https://github.com/jperezmart)! - Close the failed `MongoClient` before each connection retry. A client that connected and then failed (for example in a throwing `connectionFactory`) used to stay open, leaking up to `retryAttempts + 1` clients, each with its own monitoring and timers.
  
  Deprecate the exported `connectWithRetry` helper: configure retries through the module options (`retryAttempts`, `retryDelay`, `verboseRetryLog`) instead. It keeps working as before and will be removed in a future major release.

- [#15](https://github.com/jperezmart/nest-mongodb/pull/15) [`1fdf6ac`](https://github.com/jperezmart/nest-mongodb/commit/1fdf6ac84b025c64fa9ddae9a85d9dc38812692d) Thanks [@jperezmart](https://github.com/jperezmart)! - Document that `MongoTransactionService.withTransaction` may re-run its callback on transient transaction errors, so the callback must be idempotent.

## 0.1.1

### Patch Changes

- [#5](https://github.com/jperezmart/nest-mongodb/pull/5) [`8709d61`](https://github.com/jperezmart/nest-mongodb/commit/8709d61fc9792a8a55d1998a8c6706a60775f0fa) Thanks [@jperezmart](https://github.com/jperezmart)! - Add npm version and license badges to the package READMEs.
