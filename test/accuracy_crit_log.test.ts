process.env.DATABASE_PATH = ":memory:";
import { describe, it, expect } from "vitest";
const { seedIfNeeded } = await import("../src/persistence/seed");
const { db } = await import("../src/persistence/db");
const { createGymBattle, getBattle, setRng, performAttack } = await import("../src/game/battle");
seedIfNeeded();
describe("accuracy, crit and battle log", () => {
  it("miss occurs when accuracy fails", () => {
    db.prepare("INSERT INTO users (discord_user_id, money, settings_json) VALUES (?, ?, ?)").run("u8", 0, "{}");
    const uid = db.prepare("SELECT id FROM users WHERE discord_user_id = ?").get("u8") as { id: number };
    db.prepare("INSERT INTO pokemon_instances (owner_user_id, species_id, level, exp, moves_json, in_team_slot) VALUES (?, ?, ?, ?, ?, ?)").run(uid.id, 1, 20, 0, JSON.stringify(["vine_whip","tackle","ember","water_gun"]), 1);
    const bid = createGymBattle(uid.id, 1);
    setRng(() => 0.99);
    performAttack(bid, "player", 0);
    const b = getBattle(bid)!;
    expect(b.log.join(" ").toLowerCase()).toContain("missed");
  });
  it("critical hit increases damage and logs", () => {
    db.prepare("INSERT INTO users (discord_user_id, money, settings_json) VALUES (?, ?, ?)").run("u9", 0, "{}");
    const uid = db.prepare("SELECT id FROM users WHERE discord_user_id = ?").get("u9") as { id: number };
    db.prepare("INSERT INTO pokemon_instances (owner_user_id, species_id, level, exp, moves_json, in_team_slot) VALUES (?, ?, ?, ?, ?, ?)").run(uid.id, 4, 20, 0, JSON.stringify(["ember","tackle","vine_whip","water_gun"]), 1);
    const bid = createGymBattle(uid.id, 1);
    setRng(() => 0);
    performAttack(bid, "player", 0);
    const b = getBattle(bid)!;
    expect(b.log.join(" ")).toContain("critical");
  });
});
