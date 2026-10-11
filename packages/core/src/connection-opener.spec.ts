import type { MongoClient } from 'mongodb';
import { describe, expect, it, vi } from 'vitest';

import { openConnection } from './connection-opener.js';

/** Nothing listens on port 1, so every attempt fails fast. */
const UNREACHABLE_URI = 'mongodb://127.0.0.1:1/?serverSelectionTimeoutMS=100';

describe('openConnection', () => {
  it('closes each failed client before the next attempt', async () => {
    const events: string[] = [];
    const clients: MongoClient[] = [];

    await expect(
      openConnection(
        {
          uri: UNREACHABLE_URI,
          retryAttempts: 2,
          retryDelay: 1,
          onConnectionCreate: client => {
            const index = clients.push(client) - 1;
            events.push(`create ${index}`);
            const close = client.close.bind(client);
            vi.spyOn(client, 'close').mockImplementation(async () => {
              events.push(`close ${index}`);
              await close();
            });
          },
        },
        'DatabaseConnection',
      ),
    ).rejects.toThrow();

    // initial attempt + 2 retries, each closed before the next one starts
    expect(events).toEqual([
      'create 0',
      'close 0',
      'create 1',
      'close 1',
      'create 2',
      'close 2',
    ]);
  });
});
