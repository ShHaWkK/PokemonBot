process.env.DATABASE_PATH = ":memory:";
import { describe, it, expect } from "vitest";
const { seedIfNeeded } = await import("../src/persistence/seed");
const { db } = await import("../src/persistence/db");
const { createGymBattle, getBattle, switchActive } = await import("../src/game/battle");
seedIfNeeded();
describe("switching and statuses", () => {
  it("switch changes active mon", () => {
    db.prepare("INSERT INTO users (discord_user_id, money, settings_json) VALUES (?, ?, ?)").run("u3", 0, "{}");
    const uid = db.prepare("SELECT id FROM users WHERE discord_user_id = ?").get("u3") as { id: number };
    db.prepare("INSERT INTO pokemon_instances (owner_user_id, species_id, level, exp, is_shiny, in_team_slot) VALUES (?, ?, ?, ?, ?, ?)").run(uid.id, 4, 20, 0, 0, 1);
    db.prepare("INSERT INTO pokemon_instances (owner_user_id, species_id, level, exp, is_shiny, in_team_slot) VALUES (?, ?, ?, ?, ?, ?)").run(uid.id, 7, 20, 0, 0, 2);
    const bid = createGymBattle(uid.id, 1);
    const b1 = getBattle(bid)!;
    expect(b1.participants.playerActive).toBe(0);
    const ok = switchActive(bid, "player", 1);
    expect(ok).toBe(true);
    const b2 = getBattle(bid)!;
    expect(b2.participants.playerActive).toBe(1);
  });
  it("burn reduces hp at end of attack", async () => {
    db.prepare("INSERT INTO users (discord_user_id, money, settings_json) VALUES (?, ?, ?)").run("u4", 0, "{}");
    const uid = db.prepare("SELECT id FROM users WHERE discord_user_id = ?").get("u4") as { id: number };
    db.prepare("INSERT INTO pokemon_instances (owner_user_id, species_id, level, exp, is_shiny, in_team_slot) VALUES (?, ?, ?, ?, ?, ?)").run(uid.id, 4, 20, 0, 0, 1);
    const bid = createGymBattle(uid.id, 1);
    const b = getBattle(bid)!;
    b.participants.playerTeam[b.participants.playerActive].status = "burn";
    db.prepare("UPDATE battles SET participants_json = ? WHERE id = ?").run(JSON.stringify(b.participants), bid);
    const hpBefore = b.participants.playerTeam[b.participants.playerActive].hp;
    const { performAttack } = await import("../src/game/battle");
    performAttack(bid, "player", 0);
    const after = getBattle(bid)!;
    expect(after.participants.playerTeam[after.participants.playerActive].hp).toBeLessThan(hpBefore);
  });
});
