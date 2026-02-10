process.env.DATABASE_PATH = ":memory:";
import { describe, it, expect } from "vitest";
const { seedIfNeeded } = await import("../src/persistence/seed");
const { db } = await import("../src/persistence/db");
const { createGymBattle, getBattle } = await import("../src/game/battle");
seedIfNeeded();
describe("arene multi-team et restrictions objets", () => {
  it("npcTeam utilise plusieurs espèces du rules.team", () => {
    const uid = db.prepare("INSERT INTO users (discord_user_id, money, settings_json) VALUES (?, ?, ?)").run("umulti", 0, "{}").lastInsertRowid as number;
    db.prepare("INSERT INTO pokemon_instances (owner_user_id, species_id, level, exp, moves_json, is_shiny, in_team_slot) VALUES (?, ?, ?, ?, ?, ?, ?)").run(uid, 7, 12, 0, JSON.stringify(["tackle"]), 0, 1);
    const bid = createGymBattle(uid, 1);
    const b = getBattle(bid)!;
    expect(b.participants.npcTeam.length).toBeGreaterThan(1);
  });
  it("objets interdits si allowedItems=false", () => {
    const uid = db.prepare("INSERT INTO users (discord_user_id, money, settings_json) VALUES (?, ?, ?)").run("uitems", 0, "{}").lastInsertRowid as number;
    db.prepare("INSERT INTO inventory (owner_user_id, item_id, quantity) VALUES (?, ?, ?)").run(uid, 10, 1);
    db.prepare("INSERT INTO pokemon_instances (owner_user_id, species_id, level, exp, moves_json, is_shiny, in_team_slot) VALUES (?, ?, ?, ?, ?, ?, ?)").run(uid, 7, 22, 0, JSON.stringify(["tackle"]), 0, 1);
    const bid = createGymBattle(uid, 4);
    const b = getBattle(bid)!;
    const gym = db.prepare("SELECT rules_json FROM gyms WHERE id = ?").get(4) as { rules_json: string };
    const r = JSON.parse(gym.rules_json) as any;
    expect(r.allowedItems).toBe(false);
    expect(b.type).toBe("gym");
  });
});
