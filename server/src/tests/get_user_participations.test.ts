
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, giveawaysTable, participationsTable } from '../db/schema';
import { type GetUserParticipationInput, type CreateUserInput, type CreateGiveawayInput, type CreateParticipationInput } from '../schema';
import { getUserParticipations } from '../handlers/get_user_participations';
import { eq } from 'drizzle-orm';

describe('getUserParticipations', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return user participations for specific giveaway', async () => {
    // Create test user
    const userInput: CreateUserInput = {
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

    const [user] = await db.insert(usersTable)
      .values(userInput)
      .returning()
      .execute();

    // Create test giveaway
    const giveawayInput: CreateGiveawayInput = {
      title: 'Test Giveaway',
      description: 'A test giveaway',
      required_channels: ['@channel1', '@channel2'],
      winner_count: 1,
      created_by: user.id
    };

    const [giveaway] = await db.insert(giveawaysTable)
      .values(giveawayInput)
      .returning()
      .execute();

    // Create test participation
    const participationInput: CreateParticipationInput = {
      giveaway_id: giveaway.id,
      user_id: user.id,
      channel_verification_status: { '@channel1': true, '@channel2': false },
      is_eligible: false,
      eligibility_reasons: ['Not subscribed to @channel2']
    };

    await db.insert(participationsTable)
      .values({
        ...participationInput,
        channel_verification_status: participationInput.channel_verification_status as any,
        eligibility_reasons: participationInput.eligibility_reasons as any
      })
      .execute();

    const input: GetUserParticipationInput = {
      user_id: user.id,
      giveaway_id: giveaway.id
    };

    const result = await getUserParticipations(input);

    expect(result).toHaveLength(1);
    expect(result[0].user_id).toEqual(user.id);
    expect(result[0].giveaway_id).toEqual(giveaway.id);
    expect(result[0].is_eligible).toBe(false);
    expect(result[0].channel_verification_status).toEqual({ '@channel1': true, '@channel2': false });
    expect(result[0].eligibility_reasons).toEqual(['Not subscribed to @channel2']);
    expect(result[0].participated_at).toBeInstanceOf(Date);
    expect(result[0].created_at).toBeInstanceOf(Date);
  });

  it('should return all user participations when giveaway_id is not provided', async () => {
    // Create test user
    const userInput: CreateUserInput = {
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

    const [user] = await db.insert(usersTable)
      .values(userInput)
      .returning()
      .execute();

    // Create two test giveaways
    const giveaway1Input: CreateGiveawayInput = {
      title: 'Test Giveaway 1',
      description: 'First test giveaway',
      required_channels: ['@channel1'],
      winner_count: 1,
      created_by: user.id
    };

    const giveaway2Input: CreateGiveawayInput = {
      title: 'Test Giveaway 2',
      description: 'Second test giveaway',
      required_channels: ['@channel2'],
      winner_count: 2,
      created_by: user.id
    };

    const [giveaway1] = await db.insert(giveawaysTable)
      .values(giveaway1Input)
      .returning()
      .execute();

    const [giveaway2] = await db.insert(giveawaysTable)
      .values(giveaway2Input)
      .returning()
      .execute();

    // Create participations for both giveaways
    const participation1Input: CreateParticipationInput = {
      giveaway_id: giveaway1.id,
      user_id: user.id,
      channel_verification_status: { '@channel1': true },
      is_eligible: true,
      eligibility_reasons: []
    };

    const participation2Input: CreateParticipationInput = {
      giveaway_id: giveaway2.id,
      user_id: user.id,
      channel_verification_status: { '@channel2': false },
      is_eligible: false,
      eligibility_reasons: ['Not subscribed to @channel2']
    };

    await db.insert(participationsTable)
      .values([
        {
          ...participation1Input,
          channel_verification_status: participation1Input.channel_verification_status as any,
          eligibility_reasons: participation1Input.eligibility_reasons as any
        },
        {
          ...participation2Input,
          channel_verification_status: participation2Input.channel_verification_status as any,
          eligibility_reasons: participation2Input.eligibility_reasons as any
        }
      ])
      .execute();

    const input: GetUserParticipationInput = {
      user_id: user.id
    };

    const result = await getUserParticipations(input);

    expect(result).toHaveLength(2);
    
    // Verify both participations are returned
    const giveaway1Participation = result.find(p => p.giveaway_id === giveaway1.id);
    const giveaway2Participation = result.find(p => p.giveaway_id === giveaway2.id);

    expect(giveaway1Participation).toBeDefined();
    expect(giveaway1Participation!.is_eligible).toBe(true);
    expect(giveaway1Participation!.channel_verification_status).toEqual({ '@channel1': true });
    expect(giveaway1Participation!.eligibility_reasons).toEqual([]);

    expect(giveaway2Participation).toBeDefined();
    expect(giveaway2Participation!.is_eligible).toBe(false);
    expect(giveaway2Participation!.channel_verification_status).toEqual({ '@channel2': false });
    expect(giveaway2Participation!.eligibility_reasons).toEqual(['Not subscribed to @channel2']);
  });

  it('should return empty array when user has no participations', async () => {
    // Create test user but no participations
    const userInput: CreateUserInput = {
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

    const [user] = await db.insert(usersTable)
      .values(userInput)
      .returning()
      .execute();

    const input: GetUserParticipationInput = {
      user_id: user.id
    };

    const result = await getUserParticipations(input);

    expect(result).toHaveLength(0);
  });

  it('should return empty array when user has no participation in specific giveaway', async () => {
    // Create test user
    const userInput: CreateUserInput = {
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

    const [user] = await db.insert(usersTable)
      .values(userInput)
      .returning()
      .execute();

    // Create test giveaway
    const giveawayInput: CreateGiveawayInput = {
      title: 'Test Giveaway',
      description: 'A test giveaway',
      required_channels: ['@channel1'],
      winner_count: 1,
      created_by: user.id
    };

    const [giveaway] = await db.insert(giveawaysTable)
      .values(giveawayInput)
      .returning()
      .execute();

    const input: GetUserParticipationInput = {
      user_id: user.id,
      giveaway_id: giveaway.id
    };

    const result = await getUserParticipations(input);

    expect(result).toHaveLength(0);
  });
});
