
import { db } from '../db';
import { giveawaysTable, usersTable } from '../db/schema';
import { type CreateGiveawayInput, type Giveaway } from '../schema';
import { eq } from 'drizzle-orm';

export const createGiveaway = async (input: CreateGiveawayInput): Promise<Giveaway> => {
  try {
    // Verify that the creator exists and is an admin
    const creator = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.created_by))
      .execute();

    if (creator.length === 0) {
      throw new Error('Creator user not found');
    }

    if (!creator[0].is_admin) {
      throw new Error('Only admin users can create giveaways');
    }

    // Insert giveaway record
    const result = await db.insert(giveawaysTable)
      .values({
        title: input.title,
        description: input.description,
        required_channels: input.required_channels,
        winner_count: input.winner_count,
        created_by: input.created_by
      })
      .returning()
      .execute();

    const giveaway = result[0];
    return {
      ...giveaway,
      required_channels: giveaway.required_channels as string[]
    };
  } catch (error) {
    console.error('Giveaway creation failed:', error);
    throw error;
  }
};
