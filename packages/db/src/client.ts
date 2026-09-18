import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

try {
  process.loadEnvFile("../../.env");
} catch {
  // .env not present (e.g. CI) - rely on process env instead
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set - copy env.example to .env");
}

const queryClient = postgres(process.env.DATABASE_URL);

export const db = drizzle(queryClient, { schema });
