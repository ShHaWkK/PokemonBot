import dotenv from "dotenv";
dotenv.config();
export const DISCORD_TOKEN = process.env.DISCORD_TOKEN || "";
export const CLIENT_ID = process.env.CLIENT_ID || "";
export const GUILD_ID = process.env.GUILD_ID || "";
export const DATABASE_PATH = process.env.DATABASE_PATH || "data/pokemon.db";
export const ANIMATIONS_ENABLED_DEFAULT = (process.env.ANIMATIONS_ENABLED_DEFAULT || "true") === "true";
export const NODE_ENV = process.env.NODE_ENV || "development";
if (!DISCORD_TOKEN || !CLIENT_ID) {
  if (NODE_ENV === "test" || process.env.VITEST) {
    // allow tests without discord credentials
  } else {
  throw new Error("Missing DISCORD_TOKEN or CLIENT_ID");
}
}
