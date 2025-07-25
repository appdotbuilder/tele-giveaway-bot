
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, giveawaysTable, participationsTable, winnersTable } from '../db/schema';
import { type DrawWinnersInput } from '../schema';
import { drawWinners } from '../handlers/draw_winners';
import { eq } from 'drizzle-orm';

describe('drawWinners', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should draw winners for a valid giveaway', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        telegram_id: 'test_user_1',
        first_name: 'Test',
        username: 'testuser1'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create test giveaway
    const giveawayResult = await db.insert(giveawaysTable)
      .values({
        title: 'Test Giveaway',
        description: 'A test giveaway',
        required_channels: ['@testchannel'],
        winner_count: 2,
        created_by: userId
      })
      .returning()
      .execute();
    const giveawayId = giveawayResult[0].id;

    // Create eligible participants
    const participants = [];
    for (let i = 2; i <= 5; i++) {
      const participantResult = await db.insert(usersTable)
        .values({
          telegram_id: `test_user_${i}`,
          first_name: `Test User ${i}`,
          username: `testuser${i}`
        })
        .returning()
        .execute();
      participants.push(participantResult[0]);

      await db.insert(participationsTable)
        .values({
          giveaway_id: giveawayId,
          user_id: participantResult[0].id,
          channel_verification_status: { '@testchannel': true },
          is_eligible: true,
          eligibility_reasons: ['All requirements met']
        })
        .execute();
    }

    const input: DrawWinnersInput = {
      giveaway_id: giveawayId,
      randomization_seed: 'test_seed_123'
    };

    const winners = await drawWinners(input);

    // Verify winner count
    expect(winners).toHaveLength(2);

    // Verify winner positions
    expect(winners[0].position).toEqual(1);
    expect(winners[1].position).toEqual(2);

    // Verify all winners are from eligible participants
    const participantIds = participants.map(p => p.id);
    winners.forEach(winner => {
      expect(participantIds).toContain(winner.user_id);
      expect(winner.giveaway_id).toEqual(giveawayId);
      expect(winner.selected_at).toBeInstanceOf(Date);
      expect(winner.created_at).toBeInstanceOf(Date);
    });

    // Verify no duplicate winners
    const winnerUserIds = winners.map(w => w.user_id);
    expect(new Set(winnerUserIds).size).toEqual(winnerUserIds.length);
  });

  it('should update giveaway status to completed', async () => {
    // Create test setup
    const userResult = await db.insert(usersTable)
      .values({
        telegram_id: 'test_user_1',
        first_name: 'Test',
        username: 'testuser1'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    const giveawayResult = await db.insert(giveawaysTable)
      .values({
        title: 'Test Giveaway',
        description: 'A test giveaway',
        required_channels: ['@testchannel'],
        winner_count: 1,
        created_by: userId
      })
      .returning()
      .execute();
    const giveawayId = giveawayResult[0].id;

    // Create one eligible participant
    const participantResult = await db.insert(usersTable)
      .values({
        telegram_id: 'participant_1',
        first_name: 'Participant',
        username: 'participant1'
      })
      .returning()
      .execute();

    await db.insert(participationsTable)
      .values({
        giveaway_id: giveawayId,
        user_id: participantResult[0].id,
        channel_verification_status: { '@testchannel': true },
        is_eligible: true,
        eligibility_reasons: ['All requirements met']
      })
      .execute();

    const input: DrawWinnersInput = {
      giveaway_id: giveawayId,
      randomization_seed: 'test_seed'
    };

    await drawWinners(input);

    // Verify giveaway status was updated
    const updatedGiveaway = await db.select()
      .from(giveawaysTable)
      .where(eq(giveawaysTable.id, giveawayId))
      .execute();

    expect(updatedGiveaway[0].status).toEqual('completed');
    expect(updatedGiveaway[0].draw_timestamp).toBeInstanceOf(Date);
    expect(updatedGiveaway[0].randomization_seed).toEqual('test_seed');
    expect(updatedGiveaway[0].participant_hash).toBeDefined();
    expect(typeof updatedGiveaway[0].participant_hash).toEqual('string');
  });

  it('should produce deterministic results with same seed', async () => {
    // Create test setup
    const userResult = await db.insert(usersTable)
      .values({
        telegram_id: 'test_user_1',
        first_name: 'Test',
        username: 'testuser1'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    const giveawayResult = await db.insert(giveawaysTable)
      .values({
        title: 'Test Giveaway',
        description: 'A test giveaway',
        required_channels: ['@testchannel'],
        winner_count: 1,
        created_by: userId
      })
      .returning()
      .execute();
    const giveawayId = giveawayResult[0].id;

    // Create multiple eligible participants
    const participants = [];
    for (let i = 1; i <= 5; i++) {
      const participantResult = await db.insert(usersTable)
        .values({
          telegram_id: `participant_${i}`,
          first_name: `Participant ${i}`,
          username: `participant${i}`
        })
        .returning()
        .execute();
      participants.push(participantResult[0]);

      await db.insert(participationsTable)
        .values({
          giveaway_id: giveawayId,
          user_id: participantResult[0].id,
          channel_verification_status: { '@testchannel': true },
          is_eligible: true,
          eligibility_reasons: ['All requirements met']
        })
        .execute();
    }

    const input: DrawWinnersInput = {
      giveaway_id: giveawayId,
      randomization_seed: 'deterministic_seed'
    };

    const firstDraw = await drawWinners(input);

    // Reset giveaway status for second draw
    await db.update(giveawaysTable)
      .set({ status: 'active' })
      .where(eq(giveawaysTable.id, giveawayId))
      .execute();

    // Clear previous winners
    await db.delete(winnersTable)
      .where(eq(winnersTable.giveaway_id, giveawayId))
      .execute();

    const secondDraw = await drawWinners(input);

    // Results should be identical with same seed
    expect(firstDraw[0].user_id).toEqual(secondDraw[0].user_id);
    expect(firstDraw[0].position).toEqual(secondDraw[0].position);
  });

  it('should throw error for non-existent giveaway', async () => {
    const input: DrawWinnersInput = {
      giveaway_id: 999,
      randomization_seed: 'test_seed'
    };

    expect(drawWinners(input)).rejects.toThrow(/giveaway not found/i);
  });

  it('should throw error for inactive giveaway', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        telegram_id: 'test_user_1',
        first_name: 'Test',
        username: 'testuser1'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create completed giveaway
    const giveawayResult = await db.insert(giveawaysTable)
      .values({
        title: 'Test Giveaway',
        description: 'A test giveaway',
        required_channels: ['@testchannel'],
        winner_count: 1,
        created_by: userId,
        status: 'completed'
      })
      .returning()
      .execute();

    const input: DrawWinnersInput = {
      giveaway_id: giveawayResult[0].id,
      randomization_seed: 'test_seed'
    };

    expect(drawWinners(input)).rejects.toThrow(/giveaway is not active/i);
  });

  it('should throw error when no eligible participants', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        telegram_id: 'test_user_1',
        first_name: 'Test',
        username: 'testuser1'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create giveaway
    const giveawayResult = await db.insert(giveawaysTable)
      .values({
        title: 'Test Giveaway',
        description: 'A test giveaway',
        required_channels: ['@testchannel'],
        winner_count: 1,
        created_by: userId
      })
      .returning()
      .execute();

    const input: DrawWinnersInput = {
      giveaway_id: giveawayResult[0].id,
      randomization_seed: 'test_seed'
    };

    expect(drawWinners(input)).rejects.toThrow(/no eligible participants found/i);
  });

  it('should throw error when not enough eligible participants', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        telegram_id: 'test_user_1',
        first_name: 'Test',
        username: 'testuser1'
      })
      .returning()
      .execute();
    const userId = userResult[0].id;

    // Create giveaway requiring 3 winners
    const giveawayResult = await db.insert(giveawaysTable)
      .values({
        title: 'Test Giveaway',
        description: 'A test giveaway',
        required_channels: ['@testchannel'],
        winner_count: 3,
        created_by: userId
      })
      .returning()
      .execute();
    const giveawayId = giveawayResult[0].id;

    // Create only 2 eligible participants
    for (let i = 1; i <= 2; i++) {
      const participantResult = await db.insert(usersTable)
        .values({
          telegram_id: `participant_${i}`,
          first_name: `Participant ${i}`,
          username: `participant${i}`
        })
        .returning()
        .execute();

      await db.insert(participationsTable)
        .values({
          giveaway_id: giveawayId,
          user_id: participantResult[0].id,
          channel_verification_status: { '@testchannel': true },
          is_eligible: true,
          eligibility_reasons: ['All requirements met']
        })
        .execute();
    }

    const input: DrawWinnersInput = {
      giveaway_id: giveawayId,
      randomization_seed: 'test_seed'
    };

    expect(drawWinners(input)).rejects.toThrow(/not enough eligible participants/i);
  });
});
