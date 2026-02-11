process.env.DATABASE_PATH = ":memory:";
import { describe, it, expect } from "vitest";
const { seedIfNeeded } = await import("../src/persistence/seed");
const { db } = await import("../src/persistence/db");
const { createGymBattle, getBattle, performAttack, setRng } = await import("../src/game/battle");
seedIfNeeded();
describe("évolution automatique lors d'un level-up", () => {
  it("Charmander évolue en Reptincel à Lv16 après gain XP d'arène", () => {
    setRng(() => 0); 
    const uid = db.prepare("INSERT INTO users (discord_user_id, money, settings_json) VALUES (?, ?, ?)").run("uevo", 0, "{}").lastInsertRowid as number;
    db.prepare("INSERT INTO pokemon_instances (owner_user_id, species_id, level, exp, moves_json, is_shiny, in_team_slot) VALUES (?, ?, ?, ?, ?, ?, ?)").run(uid, 4, 15, 740, JSON.stringify(["ember","tackle","vine_whip","water_gun"]), 0, 1);
    db.prepare("UPDATE gyms SET rules_json = ? WHERE id = 8").run(JSON.stringify({ team: [133], level: 1, allowedItems: false, intro: "Test easy", terrain: "Ville" }));
    const bid = createGymBattle(uid, 8);
    let b = getBattle(bid)!;
    for (let i = 0; i < 30; i++) {
      performAttack(bid, "player", 0);
      b = getBattle(bid)!;
      if (b.state === "ended") break;
    }
    const row = db.prepare("SELECT species_id, level FROM pokemon_instances WHERE owner_user_id = ? AND in_team_slot = 1").get(uid) as { species_id:number; level:number };
    expect(row.level).toBeGreaterThanOrEqual(16);
    expect(row.species_id).toBe(5);
  });
});
