import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { initTRPC } from "@trpc/server";
import superjson from "superjson";

// Simplified tRPC setup for Vercel Edge Functions
const t = initTRPC.create({
  transformer: superjson,
});

const router = t.router;
const publicProcedure = t.procedure;

// Minimal router for Vercel deployment
// Main app functionality uses client-side storage (AsyncStorage)
const appRouter = router({
  health: publicProcedure.query(() => ({
    ok: true,
    timestamp: Date.now(),
  })),
  system: router({
    ping: publicProcedure.query(() => "pong"),
  }),
});

export type AppRouter = typeof appRouter;

const handler = async (req: Request) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => ({}),
  });
};

export const config = {
  runtime: "edge",
};

export default handler;
