import { MongoModule } from '@jperezmart/nest-mongodb';
import { Module } from '@nestjs/common';

import { CatsController } from './cats.controller.js';
import { CatsService } from './cats.service.js';

@Module({
  imports: [MongoModule.forFeature(['cats'])],
  controllers: [CatsController],
  providers: [CatsService],
})
export class CatsModule {}
