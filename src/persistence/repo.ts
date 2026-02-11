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
  const learnsetRow = db.prepare("SELECT learnset_json, types_json FROM species WHERE id = ?").get(speciesId) as { learnset_json: string; types_json: string };
  let moves: string[] = [];
  try {
    const ls = JSON.parse(learnsetRow.learnset_json || "[]") as { level: number; move: string }[];
    moves = ls.filter(e => e.level <= level).map(e => e.move).slice(-4);
  } catch {
    moves = [];
  }
  if (moves.length === 0) {
    const types = JSON.parse(learnsetRow.types_json) as string[];
    const fallback = types.includes("Feu") ? ["ember", "tackle"] : types.includes("Eau") ? ["water_gun", "tackle"] : types.includes("Plante") ? ["vine_whip", "tackle"] : ["tackle"];
    moves = [...fallback, "thunder_shock", "vine_whip"].slice(0, 4);
  }
  db.prepare("INSERT INTO pokemon_instances (owner_user_id, species_id, level, exp, moves_json, is_shiny, in_team_slot) VALUES (?, ?, ?, ?, ?, ?, ?)").run(ownerUserId, speciesId, level, 0, JSON.stringify(moves), isShiny ? 1 : 0, slot);
}
export function getPokemonMoves(pokemonId: number): string[] {
  const row = db.prepare("SELECT moves_json FROM pokemon_instances WHERE id = ?").get(pokemonId) as { moves_json: string } | undefined;
  if (!row || !row.moves_json) return [];
  try {
    return JSON.parse(row.moves_json) as string[];
  } catch {
    return [];
  }
}
export function setPokemonMoves(pokemonId: number, moves: string[]) {
  db.prepare("UPDATE pokemon_instances SET moves_json = ? WHERE id = ?").run(JSON.stringify(moves.slice(0, 4)), pokemonId);
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
export function canAccessZone(userId: number, zoneId: number): boolean {
  const z = db.prepare("SELECT rules_json FROM zones WHERE id = ?").get(zoneId) as { rules_json: string } | undefined;
  const rules = z?.rules_json ? JSON.parse(z.rules_json) as Record<string, unknown> : {};
  const min = typeof (rules as any).levelMin === "number" ? (rules as any).levelMin : 1;
  const team = db.prepare("SELECT level FROM pokemon_instances WHERE owner_user_id = ? AND in_team_slot IS NOT NULL").all(userId) as { level:number }[];
  const highest = team.length ? Math.max(...team.map(t => t.level)) : 1;
  return highest >= min;
}
export function awardTeamExp(userId: number, expGain: number): { id:number; species_id:number; slot: number; before: number; after: number; name: string }[] {
  const rows = db.prepare("SELECT pi.id, pi.species_id, pi.level, pi.exp, pi.in_team_slot, s.name FROM pokemon_instances pi JOIN species s ON s.id = pi.species_id WHERE pi.owner_user_id = ? AND pi.in_team_slot IS NOT NULL ORDER BY pi.in_team_slot").all(userId) as { id:number; species_id:number; level:number; exp:number; in_team_slot:number; name:string }[];
  const ups: { id:number; species_id:number; slot:number; before:number; after:number; name:string }[] = [];
  for (const r of rows) {
    let level = r.level;
    let exp = r.exp + expGain;
    let changed = false;
    for (let i = 0; i < 5; i++) {
      const threshold = Math.max(20, level * 50);
      if (exp >= threshold) {
        exp -= threshold;
        level += 1;
        changed = true;
      } else break;
    }
    db.prepare("UPDATE pokemon_instances SET level = ?, exp = ? WHERE id = ?").run(level, exp, r.id);
    if (changed) ups.push({ id: r.id, species_id: r.species_id, slot: r.in_team_slot, before: r.level, after: level, name: r.name });
  }
  return ups;
}

export function xpCaptureGainByZone(zoneId: number): number {
  const z = db.prepare("SELECT biome FROM zones WHERE id = ?").get(zoneId) as { biome:string } | undefined;
  const biome = z?.biome || "Herbes";
  if (biome === "Ville") return 3;
  if (biome === "Grottes" || biome === "Montagne" || biome === "Glace") return 8;
  if (biome === "Volcan") return 7;
  if (biome === "Eau") return 6;
  return 5;
}

export function rewardMilestones(userId: number, ups: { before:number; after:number }[]): { pokeball:number; greatball:number; ultraball:number } {
  let p = 0, g = 0, u = 0;
  for (const uo of ups) {
    if (uo.before < 10 && uo.after >= 10) p += 1;
    if (uo.before < 20 && uo.after >= 20) g += 1;
    if (uo.before < 30 && uo.after >= 30) u += 1;
  }
  if (p > 0) db.prepare("INSERT INTO inventory (owner_user_id, item_id, quantity) VALUES (?, ?, ?) ON CONFLICT(owner_user_id, item_id) DO UPDATE SET quantity = quantity + excluded.quantity").run(userId, 1, p);
  if (g > 0) db.prepare("INSERT INTO inventory (owner_user_id, item_id, quantity) VALUES (?, ?, ?) ON CONFLICT(owner_user_id, item_id) DO UPDATE SET quantity = quantity + excluded.quantity").run(userId, 2, g);
  if (u > 0) db.prepare("INSERT INTO inventory (owner_user_id, item_id, quantity) VALUES (?, ?, ?) ON CONFLICT(owner_user_id, item_id) DO UPDATE SET quantity = quantity + excluded.quantity").run(userId, 3, u);
  return { pokeball: p, greatball: g, ultraball: u };
}
