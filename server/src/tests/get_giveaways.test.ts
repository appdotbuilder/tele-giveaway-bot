
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, giveawaysTable } from '../db/schema';
import { type CreateUserInput, type CreateGiveawayInput } from '../schema';
import { getGiveaways } from '../handlers/get_giveaways';

// Test data
const testUser: CreateUserInput = {
  telegram_id: '123456789',
  username: 'testuser',
  first_name: 'Test',
  last_name: 'User',
  profile_photo_url: null,
  account_created_at: null,
  last_activity_at: null,
  message_count_last_month: 0,
  is_admin: false
};

const testGiveaway: CreateGiveawayInput = {
  title: 'Test Giveaway',
  description: 'A test giveaway for testing',
  required_channels: ['@testchannel1', '@testchannel2'],
  winner_count: 3,
  created_by: 1 // Will be set after creating user
};

describe('getGiveaways', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no giveaways exist', async () => {
    const result = await getGiveaways();
    
    expect(result).toEqual([]);
  });

  it('should return all giveaways without status filter', async () => {
    // Create user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create multiple giveaways with different statuses
    await db.insert(giveawaysTable)
      .values([
        {
          ...testGiveaway,
          created_by: userId,
          title: 'Active Giveaway',
          status: 'active'
        },
        {
          ...testGiveaway,
          created_by: userId,
          title: 'Completed Giveaway',
          status: 'completed'
        },
        {
          ...testGiveaway,
          created_by: userId,
          title: 'Cancelled Giveaway',
          status: 'cancelled'
        }
      ])
      .execute();

    const result = await getGiveaways();

    expect(result).toHaveLength(3);
    expect(result.map(g => g.title)).toContain('Active Giveaway');
    expect(result.map(g => g.title)).toContain('Completed Giveaway');
    expect(result.map(g => g.title)).toContain('Cancelled Giveaway');
  });

  it('should filter giveaways by active status', async () => {
    // Create user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create giveaways with different statuses
    await db.insert(giveawaysTable)
      .values([
        {
          ...testGiveaway,
          created_by: userId,
          title: 'Active Giveaway 1',
          status: 'active'
        },
        {
          ...testGiveaway,
          created_by: userId,
          title: 'Active Giveaway 2',
          status: 'active'
        },
        {
          ...testGiveaway,
          created_by: userId,
          title: 'Completed Giveaway',
          status: 'completed'
        }
      ])
      .execute();

    const result = await getGiveaways('active');

    expect(result).toHaveLength(2);
    expect(result.every(g => g.status === 'active')).toBe(true);
    expect(result.map(g => g.title)).toContain('Active Giveaway 1');
    expect(result.map(g => g.title)).toContain('Active Giveaway 2');
  });

  it('should filter giveaways by completed status', async () => {
    // Create user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create giveaways with different statuses
    await db.insert(giveawaysTable)
      .values([
        {
          ...testGiveaway,
          created_by: userId,
          title: 'Active Giveaway',
          status: 'active'
        },
        {
          ...testGiveaway,
          created_by: userId,
          title: 'Completed Giveaway',
          status: 'completed'
        }
      ])
      .execute();

    const result = await getGiveaways('completed');

    expect(result).toHaveLength(1);
    expect(result[0].status).toBe('completed');
    expect(result[0].title).toBe('Completed Giveaway');
  });

  it('should return proper giveaway structure', async () => {
    // Create user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create giveaway
    await db.insert(giveawaysTable)
      .values({
        ...testGiveaway,
        created_by: userId
      })
      .execute();

    const result = await getGiveaways();

    expect(result).toHaveLength(1);
    const giveaway = result[0];

    // Verify all required fields exist
    expect(giveaway.id).toBeDefined();
    expect(giveaway.title).toBe('Test Giveaway');
    expect(giveaway.description).toBe('A test giveaway for testing');
    expect(giveaway.required_channels).toEqual(['@testchannel1', '@testchannel2']);
    expect(Array.isArray(giveaway.required_channels)).toBe(true);
    expect(giveaway.winner_count).toBe(3);
    expect(giveaway.status).toBe('active');
    expect(giveaway.created_by).toBe(userId);
    expect(giveaway.created_at).toBeInstanceOf(Date);
    expect(giveaway.updated_at).toBeInstanceOf(Date);
  });
});
