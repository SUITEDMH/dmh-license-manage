import { defineConfig } from "drizzle-kit";
import path from "path";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

const url = new URL(process.env.DATABASE_URL);
const needsSsl = url.hostname !== "localhost" && url.hostname !== "127.0.0.1";

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
    ssl: needsSsl ? "require" : false,
  },
});
