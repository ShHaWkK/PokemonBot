process.env.DATABASE_PATH = ":memory:";
import { describe, it, expect } from "vitest";
const { seedIfNeeded } = await import("../src/persistence/seed");
const { db } = await import("../src/persistence/db");
const { createGymBattle, getBattle, computeDamage, setRng } = await import("../src/game/battle");
seedIfNeeded();
describe("battle damage and types", () => {
  it("STAB and effectiveness influence damage", () => {
    const userId = 1;
    db.prepare("INSERT INTO users (discord_user_id, money, settings_json) VALUES (?, ?, ?)").run("u", 0, "{}");
    const uid = db.prepare("SELECT id FROM users WHERE discord_user_id = ?").get("u") as { id: number };
    db.prepare("INSERT INTO pokemon_instances (owner_user_id, species_id, level, exp, is_shiny, in_team_slot) VALUES (?, ?, ?, ?, ?, ?)").run(uid.id, 4, 20, 0, 0, 1);
    const bid = createGymBattle(uid.id, 1);
    const b = getBattle(bid)!;
    const att = b.participants.playerTeam[b.participants.playerActive];
    const def = b.participants.npcTeam[b.participants.npcActive];
    const dmg = computeDamage(att, def, att.moves[0]);
    expect(dmg).toBeGreaterThan(1);
  });
  it("paralysis prevents action sometimes", async () => {
    setRng(() => 0);
    const userId = 2;
    db.prepare("INSERT INTO users (discord_user_id, money, settings_json) VALUES (?, ?, ?)").run("u2", 0, "{}");
    const uid = db.prepare("SELECT id FROM users WHERE discord_user_id = ?").get("u2") as { id: number };
    db.prepare("INSERT INTO pokemon_instances (owner_user_id, species_id, level, exp, is_shiny, in_team_slot) VALUES (?, ?, ?, ?, ?, ?)").run(uid.id, 25, 20, 0, 0, 1);
    const bid = createGymBattle(uid.id, 1);
    const b = getBattle(bid)!;
    b.participants.playerTeam[b.participants.playerActive].status = "paralysis";
    db.prepare("UPDATE battles SET participants_json = ? WHERE id = ?").run(JSON.stringify(b.participants), bid);
    const { performAttack } = await import("../src/game/battle");
    const res = performAttack(bid, "player", 0);
    expect(res.ended).toBe(false);
  });
});
