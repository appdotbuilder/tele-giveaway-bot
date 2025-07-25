
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { giveawaysTable, usersTable } from '../db/schema';
import { type CreateGiveawayInput, type CreateUserInput } from '../schema';
import { createGiveaway } from '../handlers/create_giveaway';
import { eq } from 'drizzle-orm';

// Test user inputs
const testAdminUser: CreateUserInput = {
  telegram_id: 'admin123',
  username: 'testadmin',
  first_name: 'Test',
  last_name: 'Admin',
  profile_photo_url: null,
  account_created_at: null,
  last_activity_at: null,
  message_count_last_month: 0,
  is_admin: true
};

const testRegularUser: CreateUserInput = {
  telegram_id: 'user123',
  username: 'testuser',
  first_name: 'Test',
  last_name: 'User',
  profile_photo_url: null,
  account_created_at: null,
  last_activity_at: null,
  message_count_last_month: 0,
  is_admin: false
};

describe('createGiveaway', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a giveaway with admin user', async () => {
    // Create admin user first
    const adminResult = await db.insert(usersTable)
      .values(testAdminUser)
      .returning()
      .execute();
    const adminId = adminResult[0].id;

    const testInput: CreateGiveawayInput = {
      title: 'Test Giveaway',
      description: 'A giveaway for testing',
      required_channels: ['@testchannel1', '@testchannel2'],
      winner_count: 3,
      created_by: adminId
    };

    const result = await createGiveaway(testInput);

    // Basic field validation
    expect(result.title).toEqual('Test Giveaway');
    expect(result.description).toEqual(testInput.description);
    expect(result.required_channels).toEqual(['@testchannel1', '@testchannel2']);
    expect(result.winner_count).toEqual(3);
    expect(result.created_by).toEqual(adminId);
    expect(result.status).toEqual('active');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.draw_timestamp).toBeNull();
    expect(result.randomization_seed).toBeNull();
    expect(result.participant_hash).toBeNull();
  });

  it('should save giveaway to database', async () => {
    // Create admin user first
    const adminResult = await db.insert(usersTable)
      .values(testAdminUser)
      .returning()
      .execute();
    const adminId = adminResult[0].id;

    const testInput: CreateGiveawayInput = {
      title: 'Database Test Giveaway',
      description: 'Testing database storage',
      required_channels: ['@channel1'],
      winner_count: 1,
      created_by: adminId
    };

    const result = await createGiveaway(testInput);

    // Query database to verify storage
    const giveaways = await db.select()
      .from(giveawaysTable)
      .where(eq(giveawaysTable.id, result.id))
      .execute();

    expect(giveaways).toHaveLength(1);
    expect(giveaways[0].title).toEqual('Database Test Giveaway');
    expect(giveaways[0].description).toEqual(testInput.description);
    expect(giveaways[0].required_channels).toEqual(['@channel1']);
    expect(giveaways[0].winner_count).toEqual(1);
    expect(giveaways[0].created_by).toEqual(adminId);
    expect(giveaways[0].status).toEqual('active');
    expect(giveaways[0].created_at).toBeInstanceOf(Date);
  });

  it('should reject giveaway creation by non-admin user', async () => {
    // Create regular user first
    const userResult = await db.insert(usersTable)
      .values(testRegularUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    const testInput: CreateGiveawayInput = {
      title: 'Unauthorized Giveaway',
      description: 'This should fail',
      required_channels: ['@channel1'],
      winner_count: 1,
      created_by: userId
    };

    await expect(createGiveaway(testInput)).rejects.toThrow(/only admin users can create giveaways/i);
  });

  it('should reject giveaway creation with non-existent user', async () => {
    const testInput: CreateGiveawayInput = {
      title: 'Invalid User Giveaway',
      description: 'This should fail',
      required_channels: ['@channel1'],
      winner_count: 1,
      created_by: 99999 // Non-existent user ID
    };

    await expect(createGiveaway(testInput)).rejects.toThrow(/creator user not found/i);
  });
});
