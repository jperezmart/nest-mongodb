import { MongoModule } from '@jperezmart/nest-mongodb';
import { Module } from '@nestjs/common';

import { CatsModule } from './cats/cats.module.js';

@Module({
  imports: [
    MongoModule.forRoot(
      process.env['MONGO_URI'] ?? 'mongodb://localhost:27017',
      { dbName: 'app' },
    ),
    CatsModule,
  ],
})
export class AppModule {}
