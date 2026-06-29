import { defineConfig } from "drizzle-kit";
import path from "path";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

const rawUrl = process.env.DATABASE_URL;
const parsedUrl = new URL(rawUrl);
const isRemote = parsedUrl.hostname !== "localhost" && parsedUrl.hostname !== "127.0.0.1";
const dbUrl = isRemote
  ? (() => {
      parsedUrl.searchParams.set("sslmode", "require");
      parsedUrl.searchParams.set("uselibpqcompat", "true");
      return parsedUrl.toString();
    })()
  : rawUrl;

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url: dbUrl,
  },
});
