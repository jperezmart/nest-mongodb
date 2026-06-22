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

Shared tooling lives in `packages/typescript-config` and
`packages/eslint-config`.

## Develop

Requires Node 24 LTS and pnpm ≥ 9.

```bash
pnpm install
pnpm build       # tsdown (dual ESM/CJS) for packages, tsc for the app
pnpm typecheck
pnpm lint
pnpm test        # uses mongodb-memory-server, no external Mongo needed
```

## License

MIT
