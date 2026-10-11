---
'@jperezmart/nest-mongodb': minor
'@jperezmart/nest-mongodb-testing': minor
---

Support Nest 12 and drop Nest 10. The `@nestjs/*` peer ranges are now `^11.0.0 || ^12.0.0`, exactly the versions CI tests (Nest 11 and 12, each against `mongodb` 7.0 and the newest 7.x). Both packages now declare `engines.node` `>=20.19.0`, the same floor as the `mongodb` v7 driver and `@nestjs/mongoose` 12.

**Breaking:** Nest 10 is no longer supported. This ships as a minor because the packages are still 0.x; stay on `0.1.x` if you are on Nest 10.
