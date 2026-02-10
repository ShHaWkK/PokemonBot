process.env.DATABASE_PATH = ":memory:";
import { describe, it, expect } from "vitest";
const { seedIfNeeded } = await import("../src/persistence/seed");
const { db } = await import("../src/persistence/db");
const { createGymBattle, getBattle, performAttack } = await import("../src/game/battle");
seedIfNeeded();
describe("terrain personnalisé du leader (override)", () => {
  it("Volcan augmente les dégâts Feu vs neutral", () => {
    db.prepare("UPDATE gyms SET rules_json = ? WHERE id = 6").run(JSON.stringify({ team: [133], level: 30, allowedItems: false, intro: "Test neutral", terrain: "Ville" }));
    db.prepare("UPDATE gyms SET rules_json = ? WHERE id = 7").run(JSON.stringify({ team: [133], level: 30, allowedItems: true, intro: "Test volcan", terrain: "Volcan" }));
    const uid = db.prepare("INSERT INTO users (discord_user_id, money, settings_json) VALUES (?, ?, ?)").run("uterrain", 0, "{}").lastInsertRowid as number;
    db.prepare("INSERT INTO pokemon_instances (owner_user_id, species_id, level, exp, moves_json, is_shiny, in_team_slot) VALUES (?, ?, ?, ?, ?, ?, ?)").run(uid, 4, 20, 0, JSON.stringify(["ember","tackle","vine_whip","thunder_shock"]), 0, 1);
    const bNeutral = getBattle(createGymBattle(uid, 6))!;
    const hpBeforeNeutral = bNeutral.participants.npcTeam[bNeutral.participants.npcActive].hp;
    performAttack(bNeutral.id, "player", 0);
    const hpAfterNeutral = getBattle(bNeutral.id)!.participants.npcTeam[bNeutral.participants.npcActive].hp;
    const dmgNeutral = hpBeforeNeutral - hpAfterNeutral;
    const bVolcan = getBattle(createGymBattle(uid, 7))!;
    const hpBeforeVolcan = bVolcan.participants.npcTeam[bVolcan.participants.npcActive].hp;
    performAttack(bVolcan.id, "player", 0);
    const hpAfterVolcan = getBattle(bVolcan.id)!.participants.npcTeam[bVolcan.participants.npcActive].hp;
    const dmgVolcan = hpBeforeVolcan - hpAfterVolcan;
    expect(dmgVolcan).toBeGreaterThan(dmgNeutral);
  });
});
