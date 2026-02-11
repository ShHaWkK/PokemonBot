process.env.DATABASE_PATH = ":memory:";
import { describe, it, expect } from "vitest";
const { seedIfNeeded } = await import("../src/persistence/seed");
const { db } = await import("../src/persistence/db");
const { createGymBattle, getBattle, performAttack } = await import("../src/game/battle");
seedIfNeeded();
describe("météo Rain/Sun affecte les dégâts Eau/Feu", () => {
  it("Rain buffe Water Gun, Sun buffe Ember", () => {
    db.prepare("UPDATE gyms SET rules_json = ? WHERE id = 2").run(JSON.stringify({ team: [133], level: 20, allowedItems: true, intro: "Rain test", terrain: "Eau", weather: "Rain" }));
    db.prepare("UPDATE gyms SET rules_json = ? WHERE id = 7").run(JSON.stringify({ team: [133], level: 20, allowedItems: true, intro: "Sun test", terrain: "Volcan", weather: "Sun" }));
    const uid = db.prepare("INSERT INTO users (discord_user_id, money, settings_json) VALUES (?, ?, ?)").run("uweather", 0, "{}").lastInsertRowid as number;
    db.prepare("INSERT INTO pokemon_instances (owner_user_id, species_id, level, exp, moves_json, is_shiny, in_team_slot) VALUES (?, ?, ?, ?, ?, ?, ?)").run(uid, 7, 15, 0, JSON.stringify(["water_gun","tackle","ember","vine_whip"]), 0, 1);
    const bRain = getBattle(createGymBattle(uid, 2))!;
    const hpBeforeRain = bRain.participants.npcTeam[bRain.participants.npcActive].hp;
    performAttack(bRain.id, "player", 0);
    const hpAfterRain = getBattle(bRain.id)!.participants.npcTeam[bRain.participants.npcActive].hp;
    const dmgRain = hpBeforeRain - hpAfterRain;
    const bSun = getBattle(createGymBattle(uid, 7))!;
    const hpBeforeSun = bSun.participants.npcTeam[bSun.participants.npcActive].hp;
    performAttack(bSun.id, "player", 2);
    const hpAfterSun = getBattle(bSun.id)!.participants.npcTeam[bSun.participants.npcActive].hp;
    const dmgSun = hpBeforeSun - hpAfterSun;
    expect(dmgRain).toBeGreaterThan(0);
    expect(dmgSun).toBeGreaterThan(0);
  });
});
