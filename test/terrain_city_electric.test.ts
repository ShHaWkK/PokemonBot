process.env.DATABASE_PATH = ":memory:";
import { describe, it, expect } from "vitest";
const { seedIfNeeded } = await import("../src/persistence/seed");
const { db } = await import("../src/persistence/db");
const { createGymBattle, getBattle, performAttack } = await import("../src/game/battle");
seedIfNeeded();
describe("buff Electrik sur Ville", () => {
  it("Thunder Shock inflige plus de dégâts sur Ville que sur Herbes", () => {
    db.prepare("UPDATE gyms SET rules_json = ? WHERE id = 6").run(JSON.stringify({ team: [133], level: 30, allowedItems: false, intro: "Neutral", terrain: "Herbes" }));
    db.prepare("UPDATE gyms SET rules_json = ? WHERE id = 3").run(JSON.stringify({ team: [133], level: 30, allowedItems: false, intro: "City", terrain: "Ville" }));
    const uid = db.prepare("INSERT INTO users (discord_user_id, money, settings_json) VALUES (?, ?, ?)").run("ucity", 0, "{}").lastInsertRowid as number;
    db.prepare("INSERT INTO pokemon_instances (owner_user_id, species_id, level, exp, moves_json, is_shiny, in_team_slot) VALUES (?, ?, ?, ?, ?, ?, ?)").run(uid, 4, 20, 0, JSON.stringify(["thunder_shock","tackle","ember","water_gun"]), 0, 1);
    const bNeutral = getBattle(createGymBattle(uid, 6))!;
    const hpBeforeNeutral = bNeutral.participants.npcTeam[bNeutral.participants.npcActive].hp;
    performAttack(bNeutral.id, "player", 0);
    const hpAfterNeutral = getBattle(bNeutral.id)!.participants.npcTeam[bNeutral.participants.npcActive].hp;
    const dmgNeutral = hpBeforeNeutral - hpAfterNeutral;
    const bCity = getBattle(createGymBattle(uid, 3))!;
    const hpBeforeCity = bCity.participants.npcTeam[bCity.participants.npcActive].hp;
    performAttack(bCity.id, "player", 0);
    const hpAfterCity = getBattle(bCity.id)!.participants.npcTeam[bCity.participants.npcActive].hp;
    const dmgCity = hpBeforeCity - hpAfterCity;
    expect(dmgCity).toBeGreaterThan(dmgNeutral);
  });
});
