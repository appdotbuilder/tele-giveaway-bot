
import { db } from '../db';
import { giveawaysTable, participationsTable, winnersTable, usersTable } from '../db/schema';
import { type GetGiveawayResultsInput } from '../schema';
import { eq, count, and } from 'drizzle-orm';

export interface GiveawayResults {
    giveaway_id: number;
    total_participants: number;
    eligible_participants: number;
    draw_timestamp: Date | null;
    winners: Array<{
        position: number;
        user: {
            id: number;
            username: string | null;
            first_name: string;
            last_name: string | null;
        };
        selected_at: Date;
    }>;
    fairness_data: {
        participant_hash: string | null;
        randomization_seed: string | null;
    };
}

export const getGiveawayResults = async (input: GetGiveawayResultsInput): Promise<GiveawayResults> => {
  try {
    // Get giveaway basic info and fairness data
    const giveawayQuery = await db.select({
      draw_timestamp: giveawaysTable.draw_timestamp,
      participant_hash: giveawaysTable.participant_hash,
      randomization_seed: giveawaysTable.randomization_seed
    })
    .from(giveawaysTable)
    .where(eq(giveawaysTable.id, input.giveaway_id))
    .execute();

    if (giveawayQuery.length === 0) {
      throw new Error(`Giveaway with id ${input.giveaway_id} not found`);
    }

    const giveawayData = giveawayQuery[0];

    // Get total participants count
    const totalParticipantsQuery = await db.select({ count: count() })
      .from(participationsTable)
      .where(eq(participationsTable.giveaway_id, input.giveaway_id))
      .execute();

    const totalParticipants = totalParticipantsQuery[0]?.count || 0;

    // Get eligible participants count
    const eligibleParticipantsQuery = await db.select({ count: count() })
      .from(participationsTable)
      .where(and(
        eq(participationsTable.giveaway_id, input.giveaway_id),
        eq(participationsTable.is_eligible, true)
      ))
      .execute();

    const eligibleParticipants = eligibleParticipantsQuery[0]?.count || 0;

    // Get winners with user details
    const winnersQuery = await db.select({
      position: winnersTable.position,
      selected_at: winnersTable.selected_at,
      user_id: usersTable.id,
      username: usersTable.username,
      first_name: usersTable.first_name,
      last_name: usersTable.last_name
    })
    .from(winnersTable)
    .innerJoin(usersTable, eq(winnersTable.user_id, usersTable.id))
    .where(eq(winnersTable.giveaway_id, input.giveaway_id))
    .orderBy(winnersTable.position)
    .execute();

    const winners = winnersQuery.map(winner => ({
      position: winner.position,
      user: {
        id: winner.user_id,
        username: winner.username,
        first_name: winner.first_name,
        last_name: winner.last_name
      },
      selected_at: winner.selected_at
    }));

    return {
      giveaway_id: input.giveaway_id,
      total_participants: totalParticipants,
      eligible_participants: eligibleParticipants,
      draw_timestamp: giveawayData.draw_timestamp,
      winners,
      fairness_data: {
        participant_hash: giveawayData.participant_hash,
        randomization_seed: giveawayData.randomization_seed
      }
    };
  } catch (error) {
    console.error('Get giveaway results failed:', error);
    throw error;
  }
};
