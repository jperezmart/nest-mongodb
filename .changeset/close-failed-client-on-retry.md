---
'@jperezmart/nest-mongodb': patch
---

Close the failed `MongoClient` before each connection retry. A client that connected and then failed (for example in a throwing `connectionFactory`) used to stay open, leaking up to `retryAttempts + 1` clients, each with its own monitoring and timers.

Deprecate the exported `connectWithRetry` helper: configure retries through the module options (`retryAttempts`, `retryDelay`, `verboseRetryLog`) instead. It keeps working as before and will be removed in a future major release.
