
import { db } from '../db';
import { giveawaysTable } from '../db/schema';
import { type Giveaway } from '../schema';
import { eq } from 'drizzle-orm';

export async function getGiveaways(status?: 'active' | 'completed' | 'cancelled'): Promise<Giveaway[]> {
  try {
    // Execute query directly based on status filter
    const results = status 
      ? await db.select().from(giveawaysTable).where(eq(giveawaysTable.status, status)).execute()
      : await db.select().from(giveawaysTable).execute();

    // Convert results to proper types
    return results.map(giveaway => ({
      ...giveaway,
      required_channels: giveaway.required_channels as string[]
    }));
  } catch (error) {
    console.error('Failed to get giveaways:', error);
    throw error;
  }
}
