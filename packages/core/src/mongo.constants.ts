/**
 * Token and metadata constants. Mirrors `@nestjs/mongoose`'s `mongoose.constants`,
 * adapted to the native driver (a connection is a {@link import('mongodb').MongoClient}
 * plus its {@link import('mongodb').Db}).
 */

/** Default connection name, used when no `connectionName` is provided. */
export const DEFAULT_DB_CONNECTION = 'DatabaseConnection';

/** DI token holding the resolved options of a (possibly async) root module. */
export const MONGO_MODULE_OPTIONS = 'MongoModuleOptions';

/** DI token holding the connection name a core module was registered with. */
export const MONGO_CONNECTION_NAME = 'MongoConnectionName';
