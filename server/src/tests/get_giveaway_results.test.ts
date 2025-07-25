
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, giveawaysTable, participationsTable, winnersTable } from '../db/schema';
import { type GetGiveawayResultsInput } from '../schema';
import { getGiveawayResults } from '../handlers/get_giveaway_results';

describe('getGiveawayResults', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return complete giveaway results', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        telegram_id: '123456789',
        username: 'testuser',
        first_name: 'Test',
        last_name: 'User',
        is_admin: true
      })
      .returning()
      .execute();

    // Create test giveaway with fairness data
    const [giveaway] = await db.insert(giveawaysTable)
      .values({
        title: 'Test Giveaway',
        description: 'A test giveaway',
        required_channels: ['@channel1', '@channel2'],
        winner_count: 2,
        status: 'completed',
        created_by: user.id,
        draw_timestamp: new Date('2024-01-15T10:00:00Z'),
        participant_hash: 'abc123hash',
        randomization_seed: 'randomseed123'
      })
      .returning()
      .execute();

    // Create eligible and ineligible participants
    const [participant1] = await db.insert(usersTable)
      .values({
        telegram_id: '111111111',
        username: 'participant1',
        first_name: 'Participant',
        last_name: 'One'
      })
      .returning()
      .execute();

    const [participant2] = await db.insert(usersTable)
      .values({
        telegram_id: '222222222',
        username: 'participant2',
        first_name: 'Participant',
        last_name: 'Two'
      })
      .returning()
      .execute();

    const [participant3] = await db.insert(usersTable)
      .values({
        telegram_id: '333333333',
        username: null,
        first_name: 'Participant',
        last_name: null
      })
      .returning()
      .execute();

    // Add participations
    await db.insert(participationsTable)
      .values([
        {
          giveaway_id: giveaway.id,
          user_id: participant1.id,
          channel_verification_status: { '@channel1': true, '@channel2': true },
          is_eligible: true,
          eligibility_reasons: ['All requirements met']
        },
        {
          giveaway_id: giveaway.id,
          user_id: participant2.id,
          channel_verification_status: { '@channel1': true, '@channel2': true },
          is_eligible: true,
          eligibility_reasons: ['All requirements met']
        },
        {
          giveaway_id: giveaway.id,
          user_id: participant3.id,
          channel_verification_status: { '@channel1': false, '@channel2': true },
          is_eligible: false,
          eligibility_reasons: ['Not subscribed to @channel1']
        }
      ])
      .execute();

    // Add winners
    await db.insert(winnersTable)
      .values([
        {
          giveaway_id: giveaway.id,
          user_id: participant1.id,
          position: 1,
          selected_at: new Date('2024-01-15T10:05:00Z')
        },
        {
          giveaway_id: giveaway.id,
          user_id: participant2.id,
          position: 2,
          selected_at: new Date('2024-01-15T10:05:01Z')
        }
      ])
      .execute();

    const input: GetGiveawayResultsInput = {
      giveaway_id: giveaway.id
    };

    const result = await getGiveawayResults(input);

    // Verify basic statistics
    expect(result.giveaway_id).toEqual(giveaway.id);
    expect(result.total_participants).toEqual(3);
    expect(result.eligible_participants).toEqual(2);
    expect(result.draw_timestamp).toEqual(new Date('2024-01-15T10:00:00Z'));

    // Verify winners are ordered by position
    expect(result.winners).toHaveLength(2);
    expect(result.winners[0].position).toEqual(1);
    expect(result.winners[0].user.id).toEqual(participant1.id);
    expect(result.winners[0].user.username).toEqual('participant1');
    expect(result.winners[0].user.first_name).toEqual('Participant');
    expect(result.winners[0].user.last_name).toEqual('One');
    expect(result.winners[0].selected_at).toEqual(new Date('2024-01-15T10:05:00Z'));

    expect(result.winners[1].position).toEqual(2);
    expect(result.winners[1].user.id).toEqual(participant2.id);
    expect(result.winners[1].user.username).toEqual('participant2');
    expect(result.winners[1].user.first_name).toEqual('Participant');
    expect(result.winners[1].user.last_name).toEqual('Two');
    expect(result.winners[1].selected_at).toEqual(new Date('2024-01-15T10:05:01Z'));

    // Verify fairness data
    expect(result.fairness_data.participant_hash).toEqual('abc123hash');
    expect(result.fairness_data.randomization_seed).toEqual('randomseed123');
  });

  it('should return results for giveaway without winners', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        telegram_id: '123456789',
        username: 'testuser',
        first_name: 'Test',
        last_name: 'User',
        is_admin: true
      })
      .returning()
      .execute();

    // Create active giveaway without winners
    const [giveaway] = await db.insert(giveawaysTable)
      .values({
        title: 'Active Giveaway',
        description: 'An active giveaway',
        required_channels: ['@channel1'],
        winner_count: 1,
        status: 'active',
        created_by: user.id
      })
      .returning()
      .execute();

    // Add one participant
    const [participant] = await db.insert(usersTable)
      .values({
        telegram_id: '111111111',
        username: 'participant1',
        first_name: 'Participant',
        last_name: 'One'
      })
      .returning()
      .execute();

    await db.insert(participationsTable)
      .values({
        giveaway_id: giveaway.id,
        user_id: participant.id,
        channel_verification_status: { '@channel1': true },
        is_eligible: true,
        eligibility_reasons: ['All requirements met']
      })
      .execute();

    const input: GetGiveawayResultsInput = {
      giveaway_id: giveaway.id
    };

    const result = await getGiveawayResults(input);

    expect(result.giveaway_id).toEqual(giveaway.id);
    expect(result.total_participants).toEqual(1);
    expect(result.eligible_participants).toEqual(1);
    expect(result.draw_timestamp).toBeNull();
    expect(result.winners).toHaveLength(0);
    expect(result.fairness_data.participant_hash).toBeNull();
    expect(result.fairness_data.randomization_seed).toBeNull();
  });

  it('should handle giveaway with no participants', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        telegram_id: '123456789',
        username: 'testuser',
        first_name: 'Test',
        last_name: 'User',
        is_admin: true
      })
      .returning()
      .execute();

    // Create giveaway with no participants
    const [giveaway] = await db.insert(giveawaysTable)
      .values({
        title: 'Empty Giveaway',
        description: 'A giveaway with no participants',
        required_channels: ['@channel1'],
        winner_count: 1,
        status: 'active',
        created_by: user.id
      })
      .returning()
      .execute();

    const input: GetGiveawayResultsInput = {
      giveaway_id: giveaway.id
    };

    const result = await getGiveawayResults(input);

    expect(result.giveaway_id).toEqual(giveaway.id);
    expect(result.total_participants).toEqual(0);
    expect(result.eligible_participants).toEqual(0);
    expect(result.winners).toHaveLength(0);
  });

  it('should throw error for non-existent giveaway', async () => {
    const input: GetGiveawayResultsInput = {
      giveaway_id: 999999
    };

    await expect(getGiveawayResults(input)).rejects.toThrow(/not found/i);
  });

  it('should handle winner with null username and last_name', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        telegram_id: '123456789',
        username: 'testuser',
        first_name: 'Test',
        last_name: 'User',
        is_admin: true
      })
      .returning()
      .execute();

    // Create test giveaway
    const [giveaway] = await db.insert(giveawaysTable)
      .values({
        title: 'Test Giveaway',
        description: 'A test giveaway',
        required_channels: ['@channel1'],
        winner_count: 1,
        status: 'completed',
        created_by: user.id,
        draw_timestamp: new Date('2024-01-15T10:00:00Z')
      })
      .returning()
      .execute();

    // Create participant with null username and last_name
    const [participant] = await db.insert(usersTable)
      .values({
        telegram_id: '111111111',
        username: null,
        first_name: 'Winner',
        last_name: null
      })
      .returning()
      .execute();

    await db.insert(participationsTable)
      .values({
        giveaway_id: giveaway.id,
        user_id: participant.id,
        channel_verification_status: { '@channel1': true },
        is_eligible: true,
        eligibility_reasons: ['All requirements met']
      })
      .execute();

    await db.insert(winnersTable)
      .values({
        giveaway_id: giveaway.id,
        user_id: participant.id,
        position: 1,
        selected_at: new Date('2024-01-15T10:05:00Z')
      })
      .execute();

    const input: GetGiveawayResultsInput = {
      giveaway_id: giveaway.id
    };

    const result = await getGiveawayResults(input);

    expect(result.winners).toHaveLength(1);
    expect(result.winners[0].user.username).toBeNull();
    expect(result.winners[0].user.first_name).toEqual('Winner');
    expect(result.winners[0].user.last_name).toBeNull();
  });
});
