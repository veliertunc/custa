import { authRouter } from "./router/auth";
import { postRouter } from "./router/post";
import { salesRouter } from "./router/sales";
import { createTRPCRouter } from "./trpc";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  post: postRouter,
  sales: salesRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
