# nest-mongodb

Monorepo for **`@jperezmart/nest-mongodb`** — native MongoDB driver integration
for NestJS. It mirrors the [`@nestjs/mongoose`](https://docs.nestjs.com/techniques/mongodb)
API (`forRoot` / `forFeature`, injection decorators, connection retry, clean
shutdown) but hands you the raw `mongodb` driver objects (`MongoClient`, `Db`,
`Collection`) instead of an ODM — no schemas, hooks or plugins.

## Packages

| Package                                                | Description                                            |
| ------------------------------------------------------ | ------------------------------------------------------ |
| [`@jperezmart/nest-mongodb`](packages/core)            | Core module, decorators and transaction service.       |
| [`@jperezmart/nest-mongodb-testing`](packages/testing) | Ephemeral MongoDB for tests (`mongodb-memory-server`). |
| [`backend-example`](apps/backend-example)              | Example NestJS REST app exercising the full surface.   |

Shared lint, format and tsconfig come from
[`jperezmart/config`](https://github.com/jperezmart/config) as
`@jperezmart/eslint-config`, `@jperezmart/prettier-config` and
`@jperezmart/typescript-config` — three npm packages, not vendored copies.

## Develop

The toolchain is pinned in `package.json`: Node in `devEngines.runtime` and
pnpm in `packageManager`. pnpm installs its own pinned version, and a
mismatched Node fails the install — so those two fields are the floor, and
there is no version here to keep in step with them.

```bash
pnpm install
pnpm build       # tsdown (dual ESM/CJS) for packages, tsc for the app
pnpm typecheck
pnpm lint
pnpm test        # uses mongodb-memory-server, no external Mongo needed
```

## License

MIT
