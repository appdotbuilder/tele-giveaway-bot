
import { db } from '../db';
import { giveawaysTable, participationsTable, winnersTable } from '../db/schema';
import { type DrawWinnersInput, type Winner } from '../schema';
import { eq, and } from 'drizzle-orm';
import { createHash } from 'crypto';

export async function drawWinners(input: DrawWinnersInput): Promise<Winner[]> {
  try {
    // 1. Fetch the giveaway and verify it's active
    const giveaway = await db.select()
      .from(giveawaysTable)
      .where(eq(giveawaysTable.id, input.giveaway_id))
      .execute();

    if (giveaway.length === 0) {
      throw new Error('Giveaway not found');
    }

    if (giveaway[0].status !== 'active') {
      throw new Error('Giveaway is not active');
    }

    // 2. Fetch all eligible participants
    const eligibleParticipants = await db.select()
      .from(participationsTable)
      .where(
        and(
          eq(participationsTable.giveaway_id, input.giveaway_id),
          eq(participationsTable.is_eligible, true)
        )
      )
      .execute();

    if (eligibleParticipants.length === 0) {
      throw new Error('No eligible participants found');
    }

    if (eligibleParticipants.length < giveaway[0].winner_count) {
      throw new Error('Not enough eligible participants for the requested number of winners');
    }

    // 3. Generate participant hash for fairness proof
    const participantIds = eligibleParticipants
      .map(p => p.user_id)
      .sort((a, b) => a - b); // Sort for consistent hash
    const participantHash = createHash('sha256')
      .update(JSON.stringify(participantIds))
      .digest('hex');

    // 4. Generate reproducible random selection using seed
    const seed = input.randomization_seed || Date.now().toString();
    const winners: Winner[] = [];
    const selectedIndices: Set<number> = new Set();

    // Simple deterministic random number generator using seed
    let seedValue = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    
    const seededRandom = () => {
      seedValue = (seedValue * 9301 + 49297) % 233280;
      return seedValue / 233280;
    };

    // Select winners randomly without replacement
    for (let position = 1; position <= giveaway[0].winner_count; position++) {
      let selectedIndex: number;
      do {
        selectedIndex = Math.floor(seededRandom() * eligibleParticipants.length);
      } while (selectedIndices.has(selectedIndex));
      
      selectedIndices.add(selectedIndex);
      const selectedParticipant = eligibleParticipants[selectedIndex];

      // 5. Create winner record
      const winnerResult = await db.insert(winnersTable)
        .values({
          giveaway_id: input.giveaway_id,
          user_id: selectedParticipant.user_id,
          position: position
        })
        .returning()
        .execute();

      winners.push(winnerResult[0]);
    }

    // 6. Update giveaway status to 'completed' and store metadata
    const drawTimestamp = new Date();
    await db.update(giveawaysTable)
      .set({
        status: 'completed',
        draw_timestamp: drawTimestamp,
        randomization_seed: seed,
        participant_hash: participantHash,
        updated_at: drawTimestamp
      })
      .where(eq(giveawaysTable.id, input.giveaway_id))
      .execute();

    return winners;
  } catch (error) {
    console.error('Winner draw failed:', error);
    throw error;
  }
}
