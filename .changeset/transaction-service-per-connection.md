---
'@jperezmart/nest-mongodb': minor
---

Register a `MongoTransactionService` on every connection, including named ones. Inject a named connection's service with `@InjectTransactionService(name)`, or resolve it with `getTransactionServiceToken(name)`. The default connection's service is still injectable by class.
