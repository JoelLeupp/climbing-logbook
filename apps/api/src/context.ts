import type { InferSelectModel } from "drizzle-orm";
import type { users } from "@climbing-logbook/db";

export type User = InferSelectModel<typeof users>;

// Hono generics: every route/middleware in this app shares this Variables shape.
export type AppEnv = {
  Variables: {
    user: User | null;
  };
};
