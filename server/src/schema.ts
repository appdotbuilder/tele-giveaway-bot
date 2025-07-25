
import { z } from 'zod';

// User schema
export const userSchema = z.object({
  id: z.number(),
  telegram_id: z.string(),
  username: z.string().nullable(),
  first_name: z.string(),
  last_name: z.string().nullable(),
  profile_photo_url: z.string().nullable(),
  account_created_at: z.coerce.date().nullable(),
  last_activity_at: z.coerce.date().nullable(),
  message_count_last_month: z.number().int(),
  is_admin: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Giveaway schema
export const giveawaySchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string(),
  required_channels: z.array(z.string()), // JSON array of channel usernames/IDs
  winner_count: z.number().int(),
  status: z.enum(['active', 'completed', 'cancelled']),
  created_by: z.number(), // Foreign key to users table
  draw_timestamp: z.coerce.date().nullable(),
  randomization_seed: z.string().nullable(),
  participant_hash: z.string().nullable(), // Hash of participant list for fairness proof
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Giveaway = z.infer<typeof giveawaySchema>;

// Participation schema
export const participationSchema = z.object({
  id: z.number(),
  giveaway_id: z.number(),
  user_id: z.number(),
  channel_verification_status: z.record(z.boolean()), // JSON object mapping channel -> verification status
  is_eligible: z.boolean(), // Based on heuristic filtering
  eligibility_reasons: z.array(z.string()), // Reasons for eligibility/ineligibility
  participated_at: z.coerce.date(),
  created_at: z.coerce.date()
});

export type Participation = z.infer<typeof participationSchema>;

// Winner schema
export const winnerSchema = z.object({
  id: z.number(),
  giveaway_id: z.number(),
  user_id: z.number(),
  position: z.number().int(), // 1st, 2nd, 3rd winner, etc.
  selected_at: z.coerce.date(),
  created_at: z.coerce.date()
});

export type Winner = z.infer<typeof winnerSchema>;

// Input schemas for creating/updating
export const createUserInputSchema = z.object({
  telegram_id: z.string(),
  username: z.string().nullable(),
  first_name: z.string(),
  last_name: z.string().nullable(),
  profile_photo_url: z.string().nullable(),
  account_created_at: z.coerce.date().nullable(),
  last_activity_at: z.coerce.date().nullable(),
  message_count_last_month: z.number().int().default(0),
  is_admin: z.boolean().default(false)
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const createGiveawayInputSchema = z.object({
  title: z.string().min(1),
  description: z.string(),
  required_channels: z.array(z.string()).min(1),
  winner_count: z.number().int().positive(),
  created_by: z.number()
});

export type CreateGiveawayInput = z.infer<typeof createGiveawayInputSchema>;

export const updateGiveawayInputSchema = z.object({
  id: z.number(),
  title: z.string().optional(),
  description: z.string().optional(),
  required_channels: z.array(z.string()).optional(),
  winner_count: z.number().int().positive().optional(),
  status: z.enum(['active', 'completed', 'cancelled']).optional()
});

export type UpdateGiveawayInput = z.infer<typeof updateGiveawayInputSchema>;

export const createParticipationInputSchema = z.object({
  giveaway_id: z.number(),
  user_id: z.number(),
  channel_verification_status: z.record(z.boolean()),
  is_eligible: z.boolean(),
  eligibility_reasons: z.array(z.string())
});

export type CreateParticipationInput = z.infer<typeof createParticipationInputSchema>;

export const drawWinnersInputSchema = z.object({
  giveaway_id: z.number(),
  randomization_seed: z.string().optional()
});

export type DrawWinnersInput = z.infer<typeof drawWinnersInputSchema>;

// Query schemas
export const getGiveawayByIdInputSchema = z.object({
  id: z.number()
});

export type GetGiveawayByIdInput = z.infer<typeof getGiveawayByIdInputSchema>;

export const getUserParticipationInputSchema = z.object({
  user_id: z.number(),
  giveaway_id: z.number().optional()
});

export type GetUserParticipationInput = z.infer<typeof getUserParticipationInputSchema>;

export const getGiveawayResultsInputSchema = z.object({
  giveaway_id: z.number()
});

export type GetGiveawayResultsInput = z.infer<typeof getGiveawayResultsInputSchema>;
