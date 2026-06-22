import type { MongoClient } from 'mongodb';
import { describe, expect, it, vi } from 'vitest';

import { DEFAULT_DB_CONNECTION } from '../mongo.constants.js';
import {
  connectWithRetry,
  getClientToken,
  getCollectionToken,
  getDbToken,
} from './mongo.utils.js';

const fakeClient = {} as unknown as MongoClient;

describe('token helpers', () => {
  it('uses stable default tokens for the default connection', () => {
    expect(getClientToken()).toBe('DatabaseClient');
    expect(getDbToken()).toBe(DEFAULT_DB_CONNECTION);
    expect(getCollectionToken('cats')).toBe('catsCollection');
  });

  it('qualifies tokens for named connections', () => {
    expect(getClientToken('analytics')).toBe('analyticsClient');
    expect(getDbToken('analytics')).toBe('analyticsConnection');
    expect(getCollectionToken('cats', 'analytics')).toBe(
      'analyticsConnection/catsCollection',
    );
  });

  it('treats the explicit default name as the default', () => {
    expect(getClientToken(DEFAULT_DB_CONNECTION)).toBe('DatabaseClient');
    expect(getDbToken(DEFAULT_DB_CONNECTION)).toBe(DEFAULT_DB_CONNECTION);
  });
});

describe('connectWithRetry', () => {
  it('returns on the first successful attempt', async () => {
    const factory = vi.fn().mockResolvedValue(fakeClient);
    await expect(connectWithRetry(factory, 3, 1)).resolves.toBe(fakeClient);
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('retries and then resolves', async () => {
    const factory = vi
      .fn()
      .mockRejectedValueOnce(new Error('not ready'))
      .mockResolvedValue(fakeClient);
    await expect(connectWithRetry(factory, 3, 1)).resolves.toBe(fakeClient);
    expect(factory).toHaveBeenCalledTimes(2);
  });

  it('rethrows after exhausting all attempts', async () => {
    const factory = vi.fn().mockRejectedValue(new Error('boom'));
    await expect(connectWithRetry(factory, 2, 1)).rejects.toThrow('boom');
    // initial attempt + 2 retries
    expect(factory).toHaveBeenCalledTimes(3);
  });
});
