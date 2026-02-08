import { submissionRouter } from "~/server/api/routers/submission";
import { subscriptionRouter } from "~/server/api/routers/subscription";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

export const appRouter = createTRPCRouter({
  submission: submissionRouter,
  subscription: subscriptionRouter,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
