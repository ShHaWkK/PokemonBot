import Database from "better-sqlite3";
import { DATABASE_PATH, NODE_ENV } from "../lib/config";
import fs from "fs";
import path from "path";
export type DB = Database.Database;
if (DATABASE_PATH !== ":memory:") {
  const dir = path.dirname(DATABASE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}
export const db = new Database(NODE_ENV === "test" ? ":memory:" : DATABASE_PATH);


db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");


const createTables = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  discord_user_id TEXT NOT NULL,
  guild_id TEXT,
  trainer_name TEXT,
  starter_id INTEGER,
  money INTEGER NOT NULL DEFAULT 0,
  settings_json TEXT NOT NULL DEFAULT '{}',
  screen_message_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(discord_user_id, guild_id)
);
CREATE TABLE IF NOT EXISTS pokemon_instances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_user_id INTEGER NOT NULL,
  species_id INTEGER NOT NULL,
  level INTEGER NOT NULL,
  exp INTEGER NOT NULL,
  nature TEXT,
  ivs_json TEXT,
  evs_json TEXT,
  moves_json TEXT,
  is_shiny INTEGER NOT NULL DEFAULT 0,
  status TEXT,
  held_item_id INTEGER,
  in_team_slot INTEGER,
  box_slot INTEGER,
  FOREIGN KEY(owner_user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_pokemon_owner ON pokemon_instances(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_pokemon_team_slot ON pokemon_instances(in_team_slot);
CREATE TABLE IF NOT EXISTS inventory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_user_id INTEGER NOT NULL,
  item_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL,
  meta_json TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(owner_user_id, item_id),
  FOREIGN KEY(owner_user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS pokedex (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_user_id INTEGER NOT NULL,
  species_id INTEGER NOT NULL,
  seen_count INTEGER NOT NULL DEFAULT 0,
  caught_count INTEGER NOT NULL DEFAULT 0,
  best_size REAL,
  best_iv REAL,
  shiny_seen INTEGER NOT NULL DEFAULT 0,
  shiny_caught INTEGER NOT NULL DEFAULT 0,
  UNIQUE(owner_user_id, species_id),
  FOREIGN KEY(owner_user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS gyms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT,
  name TEXT NOT NULL,
  leader_npc_id INTEGER,
  badge_id INTEGER,
  rules_json TEXT,
  zone_id INTEGER,
  difficulty INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS battles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  state TEXT NOT NULL,
  participants_json TEXT NOT NULL,
  turn_log_json TEXT,
  rewards_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  ended_at TEXT,
  scene_snapshot_json TEXT
);
CREATE TABLE IF NOT EXISTS spawns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  zone_id INTEGER NOT NULL,
  species_id INTEGER NOT NULL,
  rarity_tier INTEGER NOT NULL,
  base_rate REAL NOT NULL,
  time_window TEXT,
  weather_mask TEXT,
  shiny_rate_override REAL,
  level_min INTEGER,
  level_max INTEGER,
  flags_json TEXT
);
CREATE TABLE IF NOT EXISTS audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id INTEGER,
  request_id TEXT NOT NULL,
  payload_json TEXT,
  success INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(request_id)
);
CREATE TABLE IF NOT EXISTS idempotency (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  request_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, request_id),
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS items (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price INTEGER NOT NULL,
  effect_json TEXT
);
CREATE TABLE IF NOT EXISTS species (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  types_json TEXT NOT NULL,
  base_stats_json TEXT NOT NULL,
  evolutions_json TEXT,
  learnset_json TEXT,
  mega_json TEXT
);
CREATE TABLE IF NOT EXISTS zones (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  biome TEXT NOT NULL,
  rules_json TEXT
);
CREATE TABLE IF NOT EXISTS badges (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  bonus_json TEXT
);
CREATE TABLE IF NOT EXISTS user_badges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  badge_id INTEGER NOT NULL,
  acquired_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, badge_id),
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(badge_id) REFERENCES badges(id) ON DELETE CASCADE
);
`;
db.exec(createTables);
export function withTransaction<T>(fn: (db: DB) => T): T {
  const txn = db.transaction(fn);
  return txn(db);
}
export function now(): string {
  return new Date().toISOString();
}
