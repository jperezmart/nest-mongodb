import {
  InjectCollection,
  InjectDb,
  MongoTransactionService,
} from '@jperezmart/nest-mongodb';
import { Injectable } from '@nestjs/common';
import type { Collection, Db, WithId } from 'mongodb';
import { ObjectId } from 'mongodb';

import type { Cat, CreateCatDto } from './cat.interface.js';

@Injectable()
export class CatsService {
  constructor(
    @InjectCollection('cats') private readonly cats: Collection<Cat>,
    @InjectDb() private readonly db: Db,
    private readonly tx: MongoTransactionService,
  ) {}

  findAll(): Promise<WithId<Cat>[]> {
    return this.cats.find().toArray();
  }

  findOne(id: string): Promise<WithId<Cat> | null> {
    return this.cats.findOne({ _id: new ObjectId(id) });
  }

  async create(dto: CreateCatDto): Promise<WithId<Cat>> {
    const { insertedId } = await this.cats.insertOne({ ...dto });
    return { ...dto, _id: insertedId };
  }

  async remove(id: string): Promise<boolean> {
    const { deletedCount } = await this.cats.deleteOne({
      _id: new ObjectId(id),
    });
    return deletedCount === 1;
  }

  /**
   * Inserts several cats atomically — demonstrates
   * {@link MongoTransactionService.withTransaction}. Requires a replica set.
   */
  createMany(dtos: CreateCatDto[]): Promise<number> {
    return this.tx.withTransaction(async session => {
      const { insertedCount } = await this.cats.insertMany(dtos, { session });
      return insertedCount;
    });
  }

  /** Shows `@InjectDb` usage. */
  databaseName(): string {
    return this.db.databaseName;
  }
}
