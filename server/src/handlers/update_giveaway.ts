
import { db } from '../db';
import { giveawaysTable, usersTable } from '../db/schema';
import { type UpdateGiveawayInput, type Giveaway } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function updateGiveaway(input: UpdateGiveawayInput): Promise<Giveaway> {
  try {
    // First, verify the giveaway exists and get current data
    const existingGiveaway = await db.select()
      .from(giveawaysTable)
      .where(eq(giveawaysTable.id, input.id))
      .execute();

    if (existingGiveaway.length === 0) {
      throw new Error('Giveaway not found');
    }

    const current = existingGiveaway[0];

    // Prevent updates to completed giveaways
    if (current.status === 'completed') {
      throw new Error('Cannot update completed giveaway');
    }

    // Build update object with only provided fields
    const updateFields: any = {
      updated_at: new Date()
    };

    if (input.title !== undefined) {
      updateFields.title = input.title;
    }
    if (input.description !== undefined) {
      updateFields.description = input.description;
    }
    if (input.required_channels !== undefined) {
      updateFields.required_channels = input.required_channels;
    }
    if (input.winner_count !== undefined) {
      updateFields.winner_count = input.winner_count;
    }
    if (input.status !== undefined) {
      updateFields.status = input.status;
    }

    // Update the giveaway
    const result = await db.update(giveawaysTable)
      .set(updateFields)
      .where(eq(giveawaysTable.id, input.id))
      .returning()
      .execute();

    const updated = result[0];
    return {
      ...updated,
      required_channels: updated.required_channels as string[]
    };
  } catch (error) {
    console.error('Giveaway update failed:', error);
    throw error;
  }
}
