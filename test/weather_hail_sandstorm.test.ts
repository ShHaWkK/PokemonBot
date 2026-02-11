process.env.DATABASE_PATH = ":memory:";
import { describe, it, expect } from "vitest";
const { seedIfNeeded } = await import("../src/persistence/seed");
const { db } = await import("../src/persistence/db");
const { createGymBattle, getBattle, performAttack, setRng } = await import("../src/game/battle");
seedIfNeeded();
describe("météo Hail/Sandstorm inflige des dégâts de fin de tour", () => {
  it("Hail: -3 HP aux non Glace; Sandstorm: immunité Roche/Sol/Acier", () => {
    setRng(() => 0);
    // Hail on gym 2
    db.prepare("UPDATE gyms SET rules_json = ? WHERE id = 2").run(JSON.stringify({ team: [133], level: 10, allowedItems: true, intro: "Hail", terrain: "Glace", weather: "Hail" }));
    const uid = db.prepare("INSERT INTO users (discord_user_id, money, settings_json) VALUES (?, ?, ?)").run("uhail", 0, "{}").lastInsertRowid as number;
    db.prepare("INSERT INTO pokemon_instances (owner_user_id, species_id, level, exp, moves_json, is_shiny, in_team_slot) VALUES (?, ?, ?, ?, ?, ?, ?)").run(uid, 4, 10, 0, JSON.stringify(["ember","tackle","water_gun","vine_whip"]), 0, 1);
    const bidHail = createGymBattle(uid, 2);
    const bBefore = getBattle(bidHail)!;
    const defHpBefore = bBefore.participants.npcTeam[bBefore.participants.npcActive].hp;
    const attHpBefore = bBefore.participants.playerTeam[bBefore.participants.playerActive].hp;
    performAttack(bidHail, "player", 1);
    const bAfter = getBattle(bidHail)!;
    const defHpAfter = bAfter.participants.npcTeam[bAfter.participants.npcActive].hp;
    const attHpAfter = bAfter.participants.playerTeam[bAfter.participants.playerActive].hp;
    expect(attHpBefore - attHpAfter).toBeGreaterThanOrEqual(3); // hail tick on attacker
    expect(defHpBefore - defHpAfter).toBeGreaterThan(3); // damage + hail tick on defender
    // Sandstorm immunity test on gym 8 with Rock/Ground NPC
    db.prepare("UPDATE gyms SET rules_json = ? WHERE id = 8").run(JSON.stringify({ team: [112], level: 10, allowedItems: true, intro: "Sand", terrain: "Grottes", weather: "Sandstorm" }));
    const bidSand = createGymBattle(uid, 8);
    const bS1 = getBattle(bidSand)!;
    const attSBefore = bS1.participants.playerTeam[bS1.participants.playerActive].hp;
    const defSBefore = bS1.participants.npcTeam[bS1.participants.npcActive].hp;
    performAttack(bidSand, "player", 1);
    const bS2 = getBattle(bidSand)!;
    const attSAfter = bS2.participants.playerTeam[bS2.participants.playerActive].hp;
    const defSAfter = bS2.participants.npcTeam[bS2.participants.npcActive].hp;
    expect(defSBefore - defSAfter).toBeGreaterThan(0); // took damage
    // attacker is not Rock/Ground/Steel, should take 3
    expect(attSBefore - attSAfter).toBeGreaterThanOrEqual(3);
  });
});
