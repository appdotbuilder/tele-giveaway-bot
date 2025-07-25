
import { db } from '../db';
import { participationsTable, giveawaysTable, usersTable } from '../db/schema';
import { type CreateParticipationInput, type Participation } from '../schema';
import { eq, and } from 'drizzle-orm';

export const createParticipation = async (input: CreateParticipationInput): Promise<Participation> => {
  try {
    // Verify giveaway exists
    const giveaway = await db.select()
      .from(giveawaysTable)
      .where(eq(giveawaysTable.id, input.giveaway_id))
      .execute();

    if (giveaway.length === 0) {
      throw new Error('Giveaway not found');
    }

    // Verify user exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (user.length === 0) {
      throw new Error('User not found');
    }

    // Check for existing participation
    const existingParticipation = await db.select()
      .from(participationsTable)
      .where(and(
        eq(participationsTable.giveaway_id, input.giveaway_id),
        eq(participationsTable.user_id, input.user_id)
      ))
      .execute();

    if (existingParticipation.length > 0) {
      throw new Error('User has already participated in this giveaway');
    }

    // Insert participation record
    const result = await db.insert(participationsTable)
      .values({
        giveaway_id: input.giveaway_id,
        user_id: input.user_id,
        channel_verification_status: input.channel_verification_status,
        is_eligible: input.is_eligible,
        eligibility_reasons: input.eligibility_reasons
      })
      .returning()
      .execute();

    const participation = result[0];
    
    // Type cast the JSONB fields to match the expected types
    return {
      ...participation,
      channel_verification_status: participation.channel_verification_status as Record<string, boolean>,
      eligibility_reasons: participation.eligibility_reasons as string[]
    };
  } catch (error) {
    console.error('Participation creation failed:', error);
    throw error;
  }
};
