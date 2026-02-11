process.env.DATABASE_PATH = ":memory:";
import { describe, it, expect } from "vitest";
const { seedIfNeeded } = await import("../src/persistence/seed");
const { db } = await import("../src/persistence/db");
const { createGymBattle, getBattle, performAttack, setRng } = await import("../src/game/battle");
seedIfNeeded();
describe("level-up post victoire d'arène et défi sans objets", () => {
  it("awardTeamExp provoque level-up et log de défi", () => {
    setRng(() => 0); // no miss, no crit, deterministic
    const uid = db.prepare("INSERT INTO users (discord_user_id, money, settings_json) VALUES (?, ?, ?)").run("ulevel", 0, "{}").lastInsertRowid as number;
    db.prepare("INSERT INTO pokemon_instances (owner_user_id, species_id, level, exp, moves_json, is_shiny, in_team_slot) VALUES (?, ?, ?, ?, ?, ?, ?)").run(uid, 7, 5, 240, JSON.stringify(["water_gun","tackle","ember","vine_whip"]), 0, 1);
    db.prepare("UPDATE gyms SET rules_json = ? WHERE id = 8").run(JSON.stringify({ team: [133], level: 1, allowedItems: false, intro: "Test easy", terrain: "Ville" }));
    const bid = createGymBattle(uid, 8);
    let b = getBattle(bid)!;
    // simulate hitting until NPC fainted
    for (let i = 0; i < 30; i++) {
      performAttack(bid, "player", 0);
      b = getBattle(bid)!;
      if (b.state === "ended") break;
    }
    // check level increased
    const row = db.prepare("SELECT level, exp FROM pokemon_instances WHERE owner_user_id = ? AND in_team_slot = 1").get(uid) as { level:number; exp:number };
    expect(row.level).toBeGreaterThan(5);
    // check audits exist
    const gymWin = db.prepare("SELECT COUNT(1) as c FROM audit WHERE user_id = ? AND action = 'gym_win'").get(uid) as { c:number };
    expect(gymWin.c).toBe(1);
    const noItemWin = db.prepare("SELECT COUNT(1) as c FROM audit WHERE user_id = ? AND action = 'challenge_no_items_win'").get(uid) as { c:number };
    expect(noItemWin.c).toBe(1);
  });
});
