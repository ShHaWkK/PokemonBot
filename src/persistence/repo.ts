import { db, withTransaction } from "./db";

export type User = { id: number; discord_user_id: string; guild_id: string | null; trainer_name: string | null; starter_id: number | null; money: number; settings_json: string; screen_message_id: string | null };
export function findOrCreateUser(discordUserId: string, guildId?: string): User {
  const existing = db.prepare("SELECT id, discord_user_id, guild_id, trainer_name, starter_id, money, settings_json, screen_message_id FROM users WHERE discord_user_id = ? AND guild_id IS ?").get(discordUserId, guildId ?? null) as User | undefined;
  if (existing) return existing;
  db.prepare("INSERT INTO users (discord_user_id, guild_id, money, settings_json) VALUES (?, ?, ?, ?)").run(discordUserId, guildId ?? null, 2000, JSON.stringify({ animations: true }));
  return db.prepare("SELECT id, discord_user_id, guild_id, trainer_name, starter_id, money, settings_json, screen_message_id FROM users WHERE discord_user_id = ? AND guild_id IS ?").get(discordUserId, guildId ?? null) as User;
}
export function setStarter(userId: number, speciesId: number) {
  db.prepare("UPDATE users SET starter_id = ? WHERE id = ?").run(speciesId, userId);
}
export function setTrainerName(userId: number, name: string) {
  db.prepare("UPDATE users SET trainer_name = ? WHERE id = ?").run(name, userId);
}
export function setScreenMessageId(userId: number, messageId: string) {
  db.prepare("UPDATE users SET screen_message_id = ? WHERE id = ?").run(messageId, userId);
}
export function addPokemon(ownerUserId: number, speciesId: number, level: number, isShiny: boolean) {
  const slotRow = db.prepare("SELECT COUNT(1) as c FROM pokemon_instances WHERE owner_user_id = ? AND in_team_slot IS NOT NULL").get(ownerUserId) as { c: number };
  const slot = slotRow.c < 6 ? slotRow.c + 1 : null;
  db.prepare("INSERT INTO pokemon_instances (owner_user_id, species_id, level, exp, is_shiny, in_team_slot) VALUES (?, ?, ?, ?, ?, ?)").run(ownerUserId, speciesId, level, 0, isShiny ? 1 : 0, slot);
}
export function adjustInventory(userId: number, itemId: number, delta: number) {
  const row = db.prepare("SELECT quantity FROM inventory WHERE owner_user_id = ? AND item_id = ?").get(userId, itemId) as { quantity: number } | undefined;
  if (!row) {
    if (delta > 0) db.prepare("INSERT INTO inventory (owner_user_id, item_id, quantity) VALUES (?, ?, ?)").run(userId, itemId, delta);
    return;
  }
  const q = row.quantity + delta;
  db.prepare("UPDATE inventory SET quantity = ? WHERE owner_user_id = ? AND item_id = ?").run(Math.max(0, q), userId, itemId);
}
export function getInventory(userId: number): { item_id: number; quantity: number }[] {
  return db.prepare("SELECT item_id, quantity FROM inventory WHERE owner_user_id = ? ORDER BY item_id").all(userId) as { item_id: number; quantity: number }[];
}
export function addDexSeen(ownerUserId: number, speciesId: number, shiny: boolean) {
  const row = db.prepare("SELECT id FROM pokedex WHERE owner_user_id = ? AND species_id = ?").get(ownerUserId, speciesId) as { id: number } | undefined;
  if (!row) {
    db.prepare("INSERT INTO pokedex (owner_user_id, species_id, seen_count, shiny_seen) VALUES (?, ?, ?, ?)").run(ownerUserId, speciesId, 1, shiny ? 1 : 0);
  } else {
    db.prepare("UPDATE pokedex SET seen_count = seen_count + 1, shiny_seen = shiny_seen + ? WHERE id = ?").run(shiny ? 1 : 0, row.id);
  }
}
export function addDexCaught(ownerUserId: number, speciesId: number, shiny: boolean) {
  const row = db.prepare("SELECT id FROM pokedex WHERE owner_user_id = ? AND species_id = ?").get(ownerUserId, speciesId) as { id: number } | undefined;
  if (!row) {
    db.prepare("INSERT INTO pokedex (owner_user_id, species_id, caught_count, shiny_caught) VALUES (?, ?, ?, ?)").run(ownerUserId, speciesId, 1, shiny ? 1 : 0);
  } else {
    db.prepare("UPDATE pokedex SET caught_count = caught_count + 1, shiny_caught = shiny_caught + ? WHERE id = ?").run(shiny ? 1 : 0, row.id);
  }
}
export function spendMoney(userId: number, amount: number): boolean {
  const row = db.prepare("SELECT money FROM users WHERE id = ?").get(userId) as { money: number };
  if (row.money < amount) return false;
  db.prepare("UPDATE users SET money = money - ? WHERE id = ?").run(amount, userId);
  return true;
}
export function earnMoney(userId: number, amount: number) {
  db.prepare("UPDATE users SET money = money + ? WHERE id = ?").run(amount, userId);
}
export function inTransaction<T>(fn: () => T): T {
  return withTransaction(() => fn());
}
export function getSettings(userId: number): Record<string, unknown> {
  const row = db.prepare("SELECT settings_json FROM users WHERE id = ?").get(userId) as { settings_json: string };
  try {
    return JSON.parse(row.settings_json || "{}");
  } catch {
    return {};
  }
}
export function setSetting(userId: number, key: string, value: unknown) {
  const current = getSettings(userId);
  (current as any)[key] = value;
  db.prepare("UPDATE users SET settings_json = ? WHERE id = ?").run(JSON.stringify(current), userId);
}
