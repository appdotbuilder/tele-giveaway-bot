
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, giveawaysTable } from '../db/schema';
import { type CreateUserInput, type CreateGiveawayInput, type UpdateGiveawayInput } from '../schema';
import { updateGiveaway } from '../handlers/update_giveaway';
import { eq } from 'drizzle-orm';

// Test data
const testUser: CreateUserInput = {
  telegram_id: '123456789',
  username: 'testuser',
  first_name: 'Test',
  last_name: 'User',
  profile_photo_url: null,
  account_created_at: null,
  last_activity_at: new Date(),
  message_count_last_month: 50,
  is_admin: false
};

const testGiveaway: CreateGiveawayInput = {
  title: 'Test Giveaway',
  description: 'A test giveaway',
  required_channels: ['@channel1', '@channel2'],
  winner_count: 3,
  created_by: 1
};

describe('updateGiveaway', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let userId: number;
  let giveawayId: number;

  beforeEach(async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    userId = userResult[0].id;

    // Create test giveaway
    const giveawayResult = await db.insert(giveawaysTable)
      .values({
        ...testGiveaway,
        created_by: userId
      })
      .returning()
      .execute();
    giveawayId = giveawayResult[0].id;
  });

  it('should update giveaway title', async () => {
    const input: UpdateGiveawayInput = {
      id: giveawayId,
      title: 'Updated Title'
    };

    const result = await updateGiveaway(input);

    expect(result.id).toEqual(giveawayId);
    expect(result.title).toEqual('Updated Title');
    expect(result.description).toEqual('A test giveaway'); // Unchanged
    expect(result.required_channels).toEqual(['@channel1', '@channel2']); // Unchanged
    expect(result.winner_count).toEqual(3); // Unchanged
    expect(result.status).toEqual('active'); // Unchanged
  });

  it('should update multiple fields', async () => {
    const input: UpdateGiveawayInput = {
      id: giveawayId,
      title: 'New Title',
      description: 'New description',
      winner_count: 5,
      required_channels: ['@newchannel1', '@newchannel2', '@newchannel3']
    };

    const result = await updateGiveaway(input);

    expect(result.title).toEqual('New Title');
    expect(result.description).toEqual('New description');
    expect(result.winner_count).toEqual(5);
    expect(result.required_channels).toEqual(['@newchannel1', '@newchannel2', '@newchannel3']);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update status to cancelled', async () => {
    const input: UpdateGiveawayInput = {
      id: giveawayId,
      status: 'cancelled'
    };

    const result = await updateGiveaway(input);

    expect(result.status).toEqual('cancelled');
  });

  it('should save updates to database', async () => {
    const input: UpdateGiveawayInput = {
      id: giveawayId,
      title: 'Database Test Title'
    };

    await updateGiveaway(input);

    const saved = await db.select()
      .from(giveawaysTable)
      .where(eq(giveawaysTable.id, giveawayId))
      .execute();

    expect(saved).toHaveLength(1);
    expect(saved[0].title).toEqual('Database Test Title');
    expect(saved[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent giveaway', async () => {
    const input: UpdateGiveawayInput = {
      id: 99999,
      title: 'Non-existent'
    };

    expect(updateGiveaway(input)).rejects.toThrow(/giveaway not found/i);
  });

  it('should prevent updates to completed giveaways', async () => {
    // First, mark giveaway as completed
    await db.update(giveawaysTable)
      .set({ status: 'completed' })
      .where(eq(giveawaysTable.id, giveawayId))
      .execute();

    const input: UpdateGiveawayInput = {
      id: giveawayId,
      title: 'Should not work'
    };

    expect(updateGiveaway(input)).rejects.toThrow(/cannot update completed giveaway/i);
  });

  it('should allow updates to cancelled giveaways', async () => {
    // First, mark giveaway as cancelled
    await db.update(giveawaysTable)
      .set({ status: 'cancelled' })
      .where(eq(giveawaysTable.id, giveawayId))
      .execute();

    const input: UpdateGiveawayInput = {
      id: giveawayId,
      title: 'Updated Cancelled Giveaway'
    };

    const result = await updateGiveaway(input);

    expect(result.title).toEqual('Updated Cancelled Giveaway');
    expect(result.status).toEqual('cancelled');
  });
});
