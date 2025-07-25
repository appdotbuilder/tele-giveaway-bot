
import { serial, text, pgTable, timestamp, integer, boolean, jsonb, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enum for giveaway status
export const giveawayStatusEnum = pgEnum('giveaway_status', ['active', 'completed', 'cancelled']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  telegram_id: text('telegram_id').notNull().unique(),
  username: text('username'),
  first_name: text('first_name').notNull(),
  last_name: text('last_name'),
  profile_photo_url: text('profile_photo_url'),
  account_created_at: timestamp('account_created_at'),
  last_activity_at: timestamp('last_activity_at'),
  message_count_last_month: integer('message_count_last_month').notNull().default(0),
  is_admin: boolean('is_admin').notNull().default(false),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Giveaways table
export const giveawaysTable = pgTable('giveaways', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  required_channels: jsonb('required_channels').notNull(), // Array of channel usernames/IDs
  winner_count: integer('winner_count').notNull(),
  status: giveawayStatusEnum('status').notNull().default('active'),
  created_by: integer('created_by').notNull().references(() => usersTable.id),
  draw_timestamp: timestamp('draw_timestamp'),
  randomization_seed: text('randomization_seed'),
  participant_hash: text('participant_hash'), // Hash of participant list for fairness proof
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Participations table
export const participationsTable = pgTable('participations', {
  id: serial('id').primaryKey(),
  giveaway_id: integer('giveaway_id').notNull().references(() => giveawaysTable.id),
  user_id: integer('user_id').notNull().references(() => usersTable.id),
  channel_verification_status: jsonb('channel_verification_status').notNull(), // Object mapping channel -> boolean
  is_eligible: boolean('is_eligible').notNull(),
  eligibility_reasons: jsonb('eligibility_reasons').notNull(), // Array of strings
  participated_at: timestamp('participated_at').defaultNow().notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Winners table
export const winnersTable = pgTable('winners', {
  id: serial('id').primaryKey(),
  giveaway_id: integer('giveaway_id').notNull().references(() => giveawaysTable.id),
  user_id: integer('user_id').notNull().references(() => usersTable.id),
  position: integer('position').notNull(), // 1st, 2nd, 3rd winner, etc.
  selected_at: timestamp('selected_at').defaultNow().notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  createdGiveaways: many(giveawaysTable),
  participations: many(participationsTable),
  winnings: many(winnersTable),
}));

export const giveawaysRelations = relations(giveawaysTable, ({ one, many }) => ({
  creator: one(usersTable, {
    fields: [giveawaysTable.created_by],
    references: [usersTable.id],
  }),
  participations: many(participationsTable),
  winners: many(winnersTable),
}));

export const participationsRelations = relations(participationsTable, ({ one }) => ({
  giveaway: one(giveawaysTable, {
    fields: [participationsTable.giveaway_id],
    references: [giveawaysTable.id],
  }),
  user: one(usersTable, {
    fields: [participationsTable.user_id],
    references: [usersTable.id],
  }),
}));

export const winnersRelations = relations(winnersTable, ({ one }) => ({
  giveaway: one(giveawaysTable, {
    fields: [winnersTable.giveaway_id],
    references: [giveawaysTable.id],
  }),
  user: one(usersTable, {
    fields: [winnersTable.user_id],
    references: [usersTable.id],
  }),
}));

// Export all tables for relation queries
export const tables = {
  users: usersTable,
  giveaways: giveawaysTable,
  participations: participationsTable,
  winners: winnersTable,
};
