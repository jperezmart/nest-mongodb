import type { ObjectId } from 'mongodb';

/** A cat document as stored in the `cats` collection. */
export interface Cat {
  _id?: ObjectId;
  name: string;
  age: number;
  breed: string;
}

/** Payload accepted when creating a cat. */
export interface CreateCatDto {
  name: string;
  age: number;
  breed: string;
}
