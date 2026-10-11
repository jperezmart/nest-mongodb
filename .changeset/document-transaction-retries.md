---
'@jperezmart/nest-mongodb': patch
---

Document that `MongoTransactionService.withTransaction` may re-run its callback on transient transaction errors, so the callback must be idempotent.
