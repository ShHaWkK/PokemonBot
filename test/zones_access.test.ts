process.env.DATABASE_PATH = ":memory:";
import { describe, it, expect } from "vitest";
const { seedIfNeeded } = await import("../src/persistence/seed");
const { db } = await import("../src/persistence/db");
const { canAccessZone } = await import("../src/persistence/repo");
seedIfNeeded();
describe("verrouillage des zones par niveau", () => {
  it("accès zone 3 interdit si niveau insuffisant", () => {
    const uid = db.prepare("INSERT INTO users (discord_user_id, money, settings_json) VALUES (?, ?, ?)").run("uz", 0, "{}").lastInsertRowid as number;
    db.prepare("INSERT INTO pokemon_instances (owner_user_id, species_id, level, exp, moves_json, is_shiny, in_team_slot) VALUES (?, ?, ?, ?, ?, ?, ?)").run(uid, 7, 5, 0, JSON.stringify(["tackle"]), 0, 1);
    const ok = canAccessZone(uid, 3);
    expect(ok).toBe(false);
  });
  it("accès zone 3 autorisé avec niveau suffisant", () => {
    const uid = db.prepare("INSERT INTO users (discord_user_id, money, settings_json) VALUES (?, ?, ?)").run("uz2", 0, "{}").lastInsertRowid as number;
    db.prepare("INSERT INTO pokemon_instances (owner_user_id, species_id, level, exp, moves_json, is_shiny, in_team_slot) VALUES (?, ?, ?, ?, ?, ?, ?)").run(uid, 7, 12, 0, JSON.stringify(["tackle"]), 0, 1);
    const ok = canAccessZone(uid, 3);
    expect(ok).toBe(true);
  });
});
