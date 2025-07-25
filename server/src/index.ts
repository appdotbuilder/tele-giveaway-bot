
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import { 
    createUserInputSchema,
    createGiveawayInputSchema,
    updateGiveawayInputSchema,
    createParticipationInputSchema,
    drawWinnersInputSchema,
    getGiveawayByIdInputSchema,
    getUserParticipationInputSchema,
    getGiveawayResultsInputSchema
} from './schema';

// Import handlers
import { createUser } from './handlers/create_user';
import { createGiveaway } from './handlers/create_giveaway';
import { getGiveaways } from './handlers/get_giveaways';
import { getGiveawayById } from './handlers/get_giveaway_by_id';
import { updateGiveaway } from './handlers/update_giveaway';
import { createParticipation } from './handlers/create_participation';
import { getUserParticipations } from './handlers/get_user_participations';
import { drawWinners } from './handlers/draw_winners';
import { getGiveawayResults } from './handlers/get_giveaway_results';
import { verifyChannelSubscriptions } from './handlers/verify_channel_subscriptions';
import { applyHeuristicFiltering } from './handlers/apply_heuristic_filtering';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // User management
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),

  // Giveaway management
  createGiveaway: publicProcedure
    .input(createGiveawayInputSchema)
    .mutation(({ input }) => createGiveaway(input)),

  getGiveaways: publicProcedure
    .query(() => getGiveaways()),

  getGiveawayById: publicProcedure
    .input(getGiveawayByIdInputSchema)
    .query(({ input }) => getGiveawayById(input)),

  updateGiveaway: publicProcedure
    .input(updateGiveawayInputSchema)
    .mutation(({ input }) => updateGiveaway(input)),

  // Participation management
  createParticipation: publicProcedure
    .input(createParticipationInputSchema)
    .mutation(({ input }) => createParticipation(input)),

  getUserParticipations: publicProcedure
    .input(getUserParticipationInputSchema)
    .query(({ input }) => getUserParticipations(input)),

  // Winner selection
  drawWinners: publicProcedure
    .input(drawWinnersInputSchema)
    .mutation(({ input }) => drawWinners(input)),

  // Public results
  getGiveawayResults: publicProcedure
    .input(getGiveawayResultsInputSchema)
    .query(({ input }) => getGiveawayResults(input)),

  // Telegram integration utilities
  verifyChannelSubscriptions: publicProcedure
    .input(z.object({
      telegramId: z.string(),
      channels: z.array(z.string())
    }))
    .query(({ input }) => verifyChannelSubscriptions(input.telegramId, input.channels)),

  applyHeuristicFiltering: publicProcedure
    .input(z.object({
      userId: z.number()
    }))
    .query(async ({ input }) => {
      // Placeholder - in real implementation, fetch user from DB first
      const user = {
        id: input.userId,
        telegram_id: '',
        username: null,
        first_name: '',
        last_name: null,
        profile_photo_url: null,
        account_created_at: null,
        last_activity_at: null,
        message_count_last_month: 0,
        is_admin: false,
        created_at: new Date(),
        updated_at: new Date()
      };
      return applyHeuristicFiltering(user);
    }),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();
