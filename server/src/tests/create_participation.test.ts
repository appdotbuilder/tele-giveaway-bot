
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { participationsTable, usersTable, giveawaysTable } from '../db/schema';
import { type CreateParticipationInput } from '../schema';
import { createParticipation } from '../handlers/create_participation';
import { eq, and } from 'drizzle-orm';

describe('createParticipation', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testGiveawayId: number;

  beforeEach(async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        telegram_id: 'test_123',
        first_name: 'Test',
        last_name: 'User',
        username: 'testuser',
        message_count_last_month: 5,
        is_admin: false
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    // Create test giveaway
    const giveawayResult = await db.insert(giveawaysTable)
      .values({
        title: 'Test Giveaway',
        description: 'A test giveaway',
        required_channels: ['@channel1', '@channel2'],
        winner_count: 1,
        created_by: testUserId
      })
      .returning()
      .execute();
    testGiveawayId = giveawayResult[0].id;
  });

  const testInput: CreateParticipationInput = {
    giveaway_id: 0, // Will be set in tests
    user_id: 0, // Will be set in tests
    channel_verification_status: {
      '@channel1': true,
      '@channel2': true
    },
    is_eligible: true,
    eligibility_reasons: ['All channels verified', 'Account age sufficient']
  };

  it('should create a participation', async () => {
    const input = {
      ...testInput,
      giveaway_id: testGiveawayId,
      user_id: testUserId
    };

    const result = await createParticipation(input);

    expect(result.giveaway_id).toEqual(testGiveawayId);
    expect(result.user_id).toEqual(testUserId);
    expect(result.channel_verification_status).toEqual({
      '@channel1': true,
      '@channel2': true
    });
    expect(result.is_eligible).toEqual(true);
    expect(result.eligibility_reasons).toEqual(['All channels verified', 'Account age sufficient']);
    expect(result.id).toBeDefined();
    expect(result.participated_at).toBeInstanceOf(Date);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save participation to database', async () => {
    const input = {
      ...testInput,
      giveaway_id: testGiveawayId,
      user_id: testUserId
    };

    const result = await createParticipation(input);

    const participations = await db.select()
      .from(participationsTable)
      .where(eq(participationsTable.id, result.id))
      .execute();

    expect(participations).toHaveLength(1);
    expect(participations[0].giveaway_id).toEqual(testGiveawayId);
    expect(participations[0].user_id).toEqual(testUserId);
    expect(participations[0].channel_verification_status).toEqual({
      '@channel1': true,
      '@channel2': true
    });
    expect(participations[0].is_eligible).toEqual(true);
    expect(participations[0].eligibility_reasons).toEqual(['All channels verified', 'Account age sufficient']);
  });

  it('should handle ineligible participation', async () => {
    const input = {
      ...testInput,
      giveaway_id: testGiveawayId,
      user_id: testUserId,
      channel_verification_status: {
        '@channel1': false,
        '@channel2': true
      },
      is_eligible: false,
      eligibility_reasons: ['Not subscribed to @channel1']
    };

    const result = await createParticipation(input);

    expect(result.is_eligible).toEqual(false);
    expect(result.eligibility_reasons).toEqual(['Not subscribed to @channel1']);
    expect(result.channel_verification_status).toEqual({
      '@channel1': false,
      '@channel2': true
    });
  });

  it('should throw error for non-existent giveaway', async () => {
    const input = {
      ...testInput,
      giveaway_id: 99999,
      user_id: testUserId
    };

    expect(createParticipation(input)).rejects.toThrow(/giveaway not found/i);
  });

  it('should throw error for non-existent user', async () => {
    const input = {
      ...testInput,
      giveaway_id: testGiveawayId,
      user_id: 99999
    };

    expect(createParticipation(input)).rejects.toThrow(/user not found/i);
  });

  it('should prevent duplicate participation', async () => {
    const input = {
      ...testInput,
      giveaway_id: testGiveawayId,
      user_id: testUserId
    };

    // Create first participation
    await createParticipation(input);

    // Attempt to create duplicate participation
    expect(createParticipation(input)).rejects.toThrow(/already participated/i);
  });

  it('should allow same user to participate in different giveaways', async () => {
    // Create second giveaway
    const secondGiveaway = await db.insert(giveawaysTable)
      .values({
        title: 'Second Giveaway',
        description: 'Another test giveaway',
        required_channels: ['@channel3'],
        winner_count: 2,
        created_by: testUserId
      })
      .returning()
      .execute();

    const firstInput = {
      ...testInput,
      giveaway_id: testGiveawayId,
      user_id: testUserId
    };

    const secondInput = {
      ...testInput,
      giveaway_id: secondGiveaway[0].id,
      user_id: testUserId,
      channel_verification_status: { '@channel3': true }
    };

    // Both participations should succeed
    const firstResult = await createParticipation(firstInput);
    const secondResult = await createParticipation(secondInput);

    expect(firstResult.giveaway_id).toEqual(testGiveawayId);
    expect(secondResult.giveaway_id).toEqual(secondGiveaway[0].id);
    expect(firstResult.user_id).toEqual(testUserId);
    expect(secondResult.user_id).toEqual(testUserId);
  });
});
