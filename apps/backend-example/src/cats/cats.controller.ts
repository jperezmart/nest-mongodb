import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import type { WithId } from 'mongodb';

import type { Cat, CreateCatDto } from './cat.interface.js';
import { CatsService } from './cats.service.js';

@Controller('cats')
export class CatsController {
  constructor(private readonly cats: CatsService) {}

  @Get()
  findAll(): Promise<WithId<Cat>[]> {
    return this.cats.findAll();
  }

  @Get('db')
  databaseName(): { database: string } {
    return { database: this.cats.databaseName() };
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<WithId<Cat>> {
    const cat = await this.cats.findOne(id);
    if (!cat) {
      throw new NotFoundException(`Cat ${id} not found`);
    }
    return cat;
  }

  @Post()
  create(@Body() dto: CreateCatDto): Promise<WithId<Cat>> {
    return this.cats.create(dto);
  }

  /** Atomic bulk insert via a transaction. */
  @Post('bulk')
  async createMany(
    @Body() dtos: CreateCatDto[],
  ): Promise<{ inserted: number }> {
    return { inserted: await this.cats.createMany(dtos) };
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ deleted: true }> {
    const ok = await this.cats.remove(id);
    if (!ok) {
      throw new NotFoundException(`Cat ${id} not found`);
    }
    return { deleted: true };
  }
}
