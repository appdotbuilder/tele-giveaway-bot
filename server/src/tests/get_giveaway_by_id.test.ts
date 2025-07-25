
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, giveawaysTable, participationsTable } from '../db/schema';
import { type CreateUserInput, type CreateGiveawayInput, type CreateParticipationInput } from '../schema';
import { getGiveawayById } from '../handlers/get_giveaway_by_id';

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
  required_channels: ['@testchannel', '@anotherchannel'],
  winner_count: 3,
  created_by: 1 // Will be set after user creation
};

describe('getGiveawayById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return giveaway when found', async () => {
    // Create user first
    const userResult = await db.insert(usersTable)
      .values({
        telegram_id: testUser.telegram_id,
        username: testUser.username,
        first_name: testUser.first_name,
        last_name: testUser.last_name,
        profile_photo_url: testUser.profile_photo_url,
        account_created_at: testUser.account_created_at,
        last_activity_at: testUser.last_activity_at,
        message_count_last_month: testUser.message_count_last_month,
        is_admin: testUser.is_admin
      })
      .returning()
      .execute();

    // Create giveaway
    const giveawayResult = await db.insert(giveawaysTable)
      .values({
        title: testGiveaway.title,
        description: testGiveaway.description,
        required_channels: testGiveaway.required_channels,
        winner_count: testGiveaway.winner_count,
        created_by: userResult[0].id
      })
      .returning()
      .execute();

    const result = await getGiveawayById({ id: giveawayResult[0].id });

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(giveawayResult[0].id);
    expect(result!.title).toEqual('Test Giveaway');
    expect(result!.description).toEqual(testGiveaway.description);
    expect(result!.required_channels).toEqual(['@testchannel', '@anotherchannel']);
    expect(result!.winner_count).toEqual(3);
    expect(result!.status).toEqual('active');
    expect(result!.created_by).toEqual(userResult[0].id);
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null when giveaway not found', async () => {
    const result = await getGiveawayById({ id: 999 });
    expect(result).toBeNull();
  });

  it('should work with giveaway that has participations', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values({
        telegram_id: testUser.telegram_id,
        username: testUser.username,
        first_name: testUser.first_name,
        last_name: testUser.last_name,
        profile_photo_url: testUser.profile_photo_url,
        account_created_at: testUser.account_created_at,
        last_activity_at: testUser.last_activity_at,
        message_count_last_month: testUser.message_count_last_month,
        is_admin: testUser.is_admin
      })
      .returning()
      .execute();

    // Create participant user
    const participantResult = await db.insert(usersTable)
      .values({
        telegram_id: '987654321',
        username: 'participant',
        first_name: 'Participant',
        last_name: 'User',
        profile_photo_url: null,
        account_created_at: null,
        last_activity_at: null,
        message_count_last_month: 5,
        is_admin: false
      })
      .returning()
      .execute();

    // Create giveaway
    const giveawayResult = await db.insert(giveawaysTable)
      .values({
        title: testGiveaway.title,
        description: testGiveaway.description,
        required_channels: testGiveaway.required_channels,
        winner_count: testGiveaway.winner_count,
        created_by: userResult[0].id
      })
      .returning()
      .execute();

    // Create participation
    await db.insert(participationsTable)
      .values({
        giveaway_id: giveawayResult[0].id,
        user_id: participantResult[0].id,
        channel_verification_status: { '@testchannel': true, '@anotherchannel': true },
        is_eligible: true,
        eligibility_reasons: ['All requirements met']
      })
      .execute();

    const result = await getGiveawayById({ id: giveawayResult[0].id });

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(giveawayResult[0].id);
    expect(result!.title).toEqual('Test Giveaway');
    expect(result!.status).toEqual('active');
  });

  it('should handle giveaway with all optional fields populated', async () => {
    // Create user
    const userResult = await db.insert(usersTable)
      .values({
        telegram_id: testUser.telegram_id,
        username: testUser.username,
        first_name: testUser.first_name,
        last_name: testUser.last_name,
        profile_photo_url: testUser.profile_photo_url,
        account_created_at: testUser.account_created_at,
        last_activity_at: testUser.last_activity_at,
        message_count_last_month: testUser.message_count_last_month,
        is_admin: testUser.is_admin
      })
      .returning()
      .execute();

    const drawTime = new Date('2024-01-15T10:00:00Z');

    // Create giveaway with all fields
    const giveawayResult = await db.insert(giveawaysTable)
      .values({
        title: 'Complete Giveaway',
        description: 'A complete giveaway with all fields',
        required_channels: ['@channel1', '@channel2', '@channel3'],
        winner_count: 5,
        status: 'completed',
        created_by: userResult[0].id,
        draw_timestamp: drawTime,
        randomization_seed: 'random-seed-123',
        participant_hash: 'hash-of-participants'
      })
      .returning()
      .execute();

    const result = await getGiveawayById({ id: giveawayResult[0].id });

    expect(result).not.toBeNull();
    expect(result!.status).toEqual('completed');
    expect(result!.draw_timestamp).toBeInstanceOf(Date);
    expect(result!.draw_timestamp).toEqual(drawTime);
    expect(result!.randomization_seed).toEqual('random-seed-123');
    expect(result!.participant_hash).toEqual('hash-of-participants');
    expect(result!.required_channels).toEqual(['@channel1', '@channel2', '@channel3']);
    expect(result!.winner_count).toEqual(5);
  });
});
