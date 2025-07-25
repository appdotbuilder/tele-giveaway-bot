
import { db } from '../db';
import { giveawaysTable, usersTable, participationsTable } from '../db/schema';
import { type GetGiveawayByIdInput, type Giveaway } from '../schema';
import { eq, count } from 'drizzle-orm';

export async function getGiveawayById(input: GetGiveawayByIdInput): Promise<Giveaway | null> {
  try {
    // Query giveaway with creator info and participation count
    const result = await db.select({
      giveaway: giveawaysTable,
      creator: usersTable,
      participationCount: count(participationsTable.id)
    })
    .from(giveawaysTable)
    .innerJoin(usersTable, eq(giveawaysTable.created_by, usersTable.id))
    .leftJoin(participationsTable, eq(giveawaysTable.id, participationsTable.giveaway_id))
    .where(eq(giveawaysTable.id, input.id))
    .groupBy(giveawaysTable.id, usersTable.id)
    .execute();

    if (result.length === 0) {
      return null;
    }

    const row = result[0];
    
    // Return giveaway data with proper type conversion for JSONB fields
    return {
      id: row.giveaway.id,
      title: row.giveaway.title,
      description: row.giveaway.description,
      required_channels: row.giveaway.required_channels as string[],
      winner_count: row.giveaway.winner_count,
      status: row.giveaway.status,
      created_by: row.giveaway.created_by,
      draw_timestamp: row.giveaway.draw_timestamp,
      randomization_seed: row.giveaway.randomization_seed,
      participant_hash: row.giveaway.participant_hash,
      created_at: row.giveaway.created_at,
      updated_at: row.giveaway.updated_at
    };
  } catch (error) {
    console.error('Failed to get giveaway by id:', error);
    throw error;
  }
}
