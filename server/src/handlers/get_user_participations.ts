
import { db } from '../db';
import { participationsTable } from '../db/schema';
import { type GetUserParticipationInput, type Participation } from '../schema';
import { eq, and } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

export async function getUserParticipations(input: GetUserParticipationInput): Promise<Participation[]> {
  try {
    const conditions: SQL<unknown>[] = [];
    
    // Always filter by user_id
    conditions.push(eq(participationsTable.user_id, input.user_id));
    
    // Optionally filter by giveaway_id
    if (input.giveaway_id !== undefined) {
      conditions.push(eq(participationsTable.giveaway_id, input.giveaway_id));
    }

    // Build and execute query
    const query = db.select()
      .from(participationsTable)
      .where(conditions.length === 1 ? conditions[0] : and(...conditions));

    const results = await query.execute();

    return results.map(participation => ({
      ...participation,
      // Convert JSON fields to proper types
      channel_verification_status: participation.channel_verification_status as Record<string, boolean>,
      eligibility_reasons: participation.eligibility_reasons as string[]
    }));
  } catch (error) {
    console.error('Failed to get user participations:', error);
    throw error;
  }
}
