process.env.DATABASE_PATH = ":memory:";
import { describe, it, expect } from "vitest";
const { seedIfNeeded } = await import("../src/persistence/seed");
const { db } = await import("../src/persistence/db");
const { createGymBattle, getBattle, performAttack, setRng } = await import("../src/game/battle");
seedIfNeeded();
describe("apprentissage d'une attaque signature post-évolution", () => {
  it("apprend une attaque du learnset au nouveau niveau", () => {
    setRng(() => 0);
    const uid = db.prepare("INSERT INTO users (discord_user_id, money, settings_json) VALUES (?, ?, ?)").run("usig", 0, "{}").lastInsertRowid as number;
    db.prepare("INSERT INTO pokemon_instances (owner_user_id, species_id, level, exp, moves_json, is_shiny, in_team_slot) VALUES (?, ?, ?, ?, ?, ?, ?)").run(uid, 4, 15, 740, JSON.stringify(["ember","tackle","vine_whip","water_gun"]), 0, 1);
    db.prepare("UPDATE species SET learnset_json = ? WHERE id = 5").run(JSON.stringify([{ level: 16, move: "thunder_shock" }])); // Reptincel
    db.prepare("UPDATE gyms SET rules_json = ? WHERE id = 8").run(JSON.stringify({ team: [133], level: 1, allowedItems: false, intro: "Test easy", terrain: "Ville" }));
    const bid = createGymBattle(uid, 8);
    for (let i = 0; i < 30; i++) {
      performAttack(bid, "player", 0);
      const b = getBattle(bid)!;
      if (b.state === "ended") break;
    }
    const row = db.prepare("SELECT species_id, level, moves_json FROM pokemon_instances WHERE owner_user_id = ? AND in_team_slot = 1").get(uid) as { species_id:number; level:number; moves_json:string };
    const moves = JSON.parse(row.moves_json) as string[];
    expect(row.species_id).toBe(5);
    expect(row.level).toBeGreaterThanOrEqual(16);
    expect(moves.includes("thunder_shock")).toBe(true);
  });
});
