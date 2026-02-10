process.env.DATABASE_PATH = ":memory:";
import { describe, it, expect } from "vitest";
const { seedIfNeeded } = await import("../src/persistence/seed");
const { db } = await import("../src/persistence/db");
const { addPokemon } = await import("../src/persistence/repo");
seedIfNeeded();
describe("species learnsets and persisted moves", () => {
  it("Charmander gets Ember at level 7", () => {
    db.prepare("INSERT INTO users (discord_user_id, money, settings_json) VALUES (?, ?, ?)").run("u6", 0, "{}");
    const uid = db.prepare("SELECT id FROM users WHERE discord_user_id = ?").get("u6") as { id: number };
    addPokemon(uid.id, 4, 7, false);
    const row = db.prepare("SELECT moves_json FROM pokemon_instances WHERE owner_user_id = ? AND species_id = ?").get(uid.id, 4) as { moves_json: string };
    const moves = JSON.parse(row.moves_json) as string[];
    expect(moves.includes("ember")).toBe(true);
  });
  it("Squirtle gets Water Gun at level 7", () => {
    db.prepare("INSERT INTO users (discord_user_id, money, settings_json) VALUES (?, ?, ?)").run("u7", 0, "{}");
    const uid = db.prepare("SELECT id FROM users WHERE discord_user_id = ?").get("u7") as { id: number };
    addPokemon(uid.id, 7, 7, false);
    const row = db.prepare("SELECT moves_json FROM pokemon_instances WHERE owner_user_id = ? AND species_id = ?").get(uid.id, 7) as { moves_json: string };
    const moves = JSON.parse(row.moves_json) as string[];
    expect(moves.includes("water_gun")).toBe(true);
  });
});
