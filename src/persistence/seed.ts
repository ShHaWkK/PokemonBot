import { db } from "./db";
function exists(table: string): boolean {
  const row = db.prepare(`SELECT COUNT(1) as c FROM ${table}`).get() as { c: number };
  return row.c > 0;
}
export function seedIfNeeded() {
  if (!exists("species")) {
    const insert = db.prepare("INSERT INTO species (id, name, types_json, base_stats_json, evolutions_json, learnset_json, mega_json) VALUES (?, ?, ?, ?, ?, ?, ?)");
    const species = [
      { id: 1, name: "Bulbizarre", types: ["Plante","Poison"], base: { hp:45, atk:49, def:49, spa:65, spd:65, spe:45 }, evo: [{ to: 2, level:16 },{ to:3, level:32 }], learnset: [{ level: 1, move: "tackle" }, { level: 7, move: "vine_whip" }], mega: { stone: "Venusaurite", stats: { hp:45, atk:62, def:63, spa:100, spd:100, spe:40 } } },
      { id: 2, name: "Herbizarre", types: ["Plante","Poison"], base: { hp:60, atk:62, def:63, spa:80, spd:80, spe:60 }, evo: [{ to:3, level:32 }], learnset: [{ level: 1, move: "tackle" }, { level: 7, move: "vine_whip" }], mega: null },
      { id: 3, name: "Florizarre", types: ["Plante","Poison"], base: { hp:80, atk:82, def:83, spa:100, spd:100, spe:80 }, evo: [], learnset: [{ level: 1, move: "tackle" }, { level: 7, move: "vine_whip" }], mega: { stone: "Venusaurite", stats: { hp:80, atk:100, def:123, spa:122, spd:120, spe:80 } } },
      { id: 4, name: "Salamèche", types: ["Feu"], base: { hp:39, atk:52, def:43, spa:60, spd:50, spe:65 }, evo: [{ to:5, level:16 },{ to:6, level:36 }], learnset: [{ level: 1, move: "tackle" }, { level: 7, move: "ember" }], mega: { stone: "Charizardite X", stats: { hp:39, atk:130, def:111, spa:130, spd:85, spe:100 } } },
      { id: 5, name: "Reptincel", types: ["Feu"], base: { hp:58, atk:64, def:58, spa:80, spd:65, spe:80 }, evo: [{ to:6, level:36 }], learnset: [{ level: 1, move: "tackle" }, { level: 7, move: "ember" }], mega: null },
      { id: 6, name: "Dracaufeu", types: ["Feu","Vol"], base: { hp:78, atk:84, def:78, spa:109, spd:85, spe:100 }, evo: [], learnset: [{ level: 1, move: "ember" }, { level: 10, move: "thunder_shock" }], mega: { stone: "Charizardite Y", stats: { hp:78, atk:104, def:78, spa:159, spd:115, spe:100 } } },
      { id: 7, name: "Carapuce", types: ["Eau"], base: { hp:44, atk:48, def:65, spa:50, spd:64, spe:43 }, evo: [{ to:8, level:16 },{ to:9, level:36 }], learnset: [{ level: 1, move: "tackle" }, { level: 7, move: "water_gun" }], mega: { stone: "Blastoisinite", stats: { hp:44, atk:103, def:120, spa:135, spd:115, spe:78 } } },
      { id: 8, name: "Carabaffe", types: ["Eau"], base: { hp:59, atk:63, def:80, spa:65, spd:80, spe:58 }, evo: [{ to:9, level:36 }], learnset: [{ level: 1, move: "tackle" }, { level: 7, move: "water_gun" }], mega: null },
      { id: 9, name: "Tortank", types: ["Eau"], base: { hp:79, atk:83, def:100, spa:85, spd:105, spe:78 }, evo: [], learnset: [{ level: 1, move: "water_gun" }], mega: { stone: "Blastoisinite", stats: { hp:79, atk:103, def:120, spa:135, spd:115, spe:78 } } },
      { id: 25, name: "Pikachu", types: ["Electrik"], base: { hp:35, atk:55, def:40, spa:50, spd:50, spe:90 }, evo: [], learnset: [{ level: 1, move: "tackle" }, { level: 7, move: "thunder_shock" }], mega: null },
      { id: 59, name: "Arcanin", types: ["Feu"], base: { hp:90, atk:110, def:80, spa:100, spd:80, spe:95 }, evo: [], learnset: [{ level: 1, move: "ember" }], mega: null },
      { id: 65, name: "Alakazam", types: ["Psy"], base: { hp:55, atk:50, def:45, spa:135, spd:95, spe:120 }, evo: [], learnset: [{ level: 1, move: "tackle" }], mega: null },
      { id: 74, name: "Racaillou", types: ["Roche","Sol"], base: { hp:40, atk:80, def:100, spa:30, spd:30, spe:20 }, evo: [], learnset: [{ level: 1, move: "tackle" }], mega: null },
      { id: 95, name: "Onix", types: ["Roche","Sol"], base: { hp:35, atk:45, def:160, spa:30, spd:45, spe:70 }, evo: [], learnset: [{ level: 1, move: "tackle" }], mega: null },
      { id: 45, name: "Rafflesia", types: ["Plante","Poison"], base: { hp:75, atk:80, def:85, spa:110, spd:90, spe:50 }, evo: [], learnset: [{ level: 1, move: "tackle" }], mega: null },
      { id: 109, name: "Smogo", types: ["Poison"], base: { hp:40, atk:65, def:95, spa:60, spd:45, spe:35 }, evo: [], learnset: [{ level: 1, move: "tackle" }], mega: null },
      { id: 112, name: "Rhinoféros", types: ["Sol","Roche"], base: { hp:105, atk:130, def:120, spa:45, spd:45, spe:40 }, evo: [], learnset: [{ level: 1, move: "tackle" }], mega: null },
      { id: 120, name: "Stari", types: ["Eau"], base: { hp:30, atk:45, def:55, spa:70, spd:55, spe:85 }, evo: [], learnset: [{ level: 1, move: "water_gun" }], mega: null },
      { id: 133, name: "Evoli", types: ["Normal"], base: { hp:55, atk:55, def:50, spa:45, spd:65, spe:55 }, evo: [], learnset: [{ level: 1, move: "tackle" }], mega: null },
      { id: 150, name: "Mewtwo", types: ["Psy"], base: { hp:106, atk:110, def:90, spa:154, spd:90, spe:130 }, evo: [], learnset: [{ level: 1, move: "tackle" }], mega: { stone: "Mewtwonite", stats: { hp:106, atk:190, def:130, spa:154, spd:90, spe:150 } } }
    ];
    const toJson = (x: unknown) => JSON.stringify(x);
    const insertMany = db.transaction(() => {
      for (const s of species) {
        insert.run(s.id, s.name, toJson(s.types), toJson(s.base), toJson(s.evo), toJson(s.learnset), s.mega ? toJson(s.mega) : null);
      }
    });
    insertMany();
  }
  if (!exists("items")) {
    const insert = db.prepare("INSERT INTO items (id, name, category, price, effect_json) VALUES (?, ?, ?, ?, ?)");
    const items = [
      { id: 1, name: "Poké Ball", category: "Ball", price: 200, effect: { rate: 1 } },
      { id: 2, name: "Super Ball", category: "Ball", price: 600, effect: { rate: 1.5 } },
      { id: 3, name: "Hyper Ball", category: "Ball", price: 1200, effect: { rate: 2 } },
      { id: 10, name: "Potion", category: "Heal", price: 300, effect: { hp: 20 } },
      { id: 11, name: "Super Potion", category: "Heal", price: 700, effect: { hp: 50 } },
      { id: 12, name: "Rappel", category: "Revive", price: 1500, effect: { revive: true } },
      { id: 20, name: "Pierre Feu", category: "Evolution", price: 3000, effect: { evolve: "Feu" } },
      { id: 21, name: "Pierre Eau", category: "Evolution", price: 3000, effect: { evolve: "Eau" } },
      { id: 22, name: "Pierre Foudre", category: "Evolution", price: 3000, effect: { evolve: "Electrik" } },
      { id: 23, name: "Pierre Plante", category: "Evolution", price: 3000, effect: { evolve: "Plante" } },
      { id: 30, name: "Keystone", category: "Key", price: 0, effect: { keystone: true } },
      { id: 31, name: "Charizardite X", category: "Mega Stone", price: 0, effect: { mega: 4 } },
      { id: 32, name: "Charizardite Y", category: "Mega Stone", price: 0, effect: { mega: 6 } },
      { id: 33, name: "Blastoisinite", category: "Mega Stone", price: 0, effect: { mega: 9 } },
      { id: 34, name: "Venusaurite", category: "Mega Stone", price: 0, effect: { mega: 3 } },
      { id: 35, name: "Mewtwonite", category: "Mega Stone", price: 0, effect: { mega: 150 } }
    ];
    const insertMany = db.transaction(() => {
      for (const it of items) {
        insert.run(it.id, it.name, it.category, it.price, JSON.stringify(it.effect));
      }
    });
    insertMany();
  }
  if (!exists("zones")) {
    const insert = db.prepare("INSERT INTO zones (id, name, biome, rules_json) VALUES (?, ?, ?, ?)");
    const zones = [
      { id: 1, name: "Bourg Palette", biome: "Ville", rules: { levelMin: 1 } },
      { id: 2, name: "Route 1", biome: "Herbes", rules: { spawnTierBias: 1, levelMin: 1 } },
      { id: 3, name: "Forêt de Jade", biome: "Herbes", rules: { spawnTierBias: 2, levelMin: 10 } },
      { id: 4, name: "Mont Sélénite", biome: "Grottes", rules: { spawnTierBias: 2, levelMin: 18 } },
      { id: 5, name: "Lac Azure", biome: "Eau", rules: { spawnTierBias: 2, levelMin: 12 } }
    ];
    const insertMany = db.transaction(() => {
      for (const z of zones) {
        insert.run(z.id, z.name, z.biome, JSON.stringify(z.rules));
      }
    });
    insertMany();
  }
  {
    const insert = db.prepare("INSERT INTO gyms (id, guild_id, name, leader_npc_id, badge_id, rules_json, zone_id, difficulty) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET guild_id=excluded.guild_id, name=excluded.name, leader_npc_id=excluded.leader_npc_id, badge_id=excluded.badge_id, rules_json=excluded.rules_json, zone_id=excluded.zone_id, difficulty=excluded.difficulty");
    const gyms = [
      { id: 1, guild_id: null, name: "Arène d'Argenta", leader_npc_id: 1001, badge_id: 1, rules_json: { team: [74,95,112], level: 12, allowedItems: true, intro: "Je suis Pierre, maître des roches.", terrain: "Grottes" }, zone_id: 4, difficulty: 1 },
      { id: 2, guild_id: null, name: "Arène d'Azuria", leader_npc_id: 1002, badge_id: 2, rules_json: { team: [120,7,8], level: 18, allowedItems: true, intro: "Ondine, la sirène de la ville!", terrain: "Eau" }, zone_id: 5, difficulty: 2 },
      { id: 3, guild_id: null, name: "Arène de Carmin", leader_npc_id: 1003, badge_id: 3, rules_json: { team: [25,133,59], level: 22, allowedItems: false, intro: "Major Bob, prêt à vous électriser.", terrain: "Ville" }, zone_id: 2, difficulty: 3 },
      { id: 4, guild_id: null, name: "Arène de Céladopole", leader_npc_id: 1004, badge_id: 4, rules_json: { team: [45,1,3], level: 26, allowedItems: false, intro: "Erika, élégance et nature.", terrain: "Herbes" }, zone_id: 3, difficulty: 4 },
      { id: 5, guild_id: null, name: "Arène de Parmanie", leader_npc_id: 1005, badge_id: 5, rules_json: { team: [109,25,133], level: 30, allowedItems: true, intro: "Koga, maître des poisons.", terrain: "Herbes" }, zone_id: 3, difficulty: 5 },
      { id: 6, guild_id: null, name: "Arène de Safrania", leader_npc_id: 1006, badge_id: 6, rules_json: { team: [65,25,133], level: 36, allowedItems: false, intro: "Je suis Morgane, la psychiste.", terrain: "Ville" }, zone_id: 1, difficulty: 6 },
      { id: 7, guild_id: null, name: "Arène de Cramois’Île", leader_npc_id: 1007, badge_id: 7, rules_json: { team: [59,4,5], level: 42, allowedItems: true, intro: "Auguste, le volcan ardent.", terrain: "Volcan" }, zone_id: 4, difficulty: 7 },
      { id: 8, guild_id: null, name: "Arène de Jadielle", leader_npc_id: 1008, badge_id: 8, rules_json: { team: [112,74,95], level: 50, allowedItems: false, intro: "Giovanni… le chef de la Team Rocket.", terrain: "Grottes" }, zone_id: 3, difficulty: 8 }
    ];
    const insertMany = db.transaction(() => {
      for (const g of gyms) {
        insert.run(g.id, g.guild_id, g.name, g.leader_npc_id, g.badge_id, JSON.stringify(g.rules_json), g.zone_id, g.difficulty);
      }
    });
    insertMany();
  }
  {
    const insert = db.prepare("INSERT INTO badges (id, name, bonus_json) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET name=excluded.name, bonus_json=excluded.bonus_json");
    const badges = [
      { id: 1, name: "Badge Roche", bonus_json: { atk: 5 } },
      { id: 2, name: "Badge Cascade", bonus_json: { atk: 5 } },
      { id: 3, name: "Badge Foudre", bonus_json: { atk: 10 } },
      { id: 4, name: "Badge Prisme", bonus_json: { atk: 5 } },
      { id: 5, name: "Badge Âme", bonus_json: { atk: 5 } },
      { id: 6, name: "Badge Marais", bonus_json: { atk: 10 } },
      { id: 7, name: "Badge Volcan", bonus_json: { atk: 5 } },
      { id: 8, name: "Badge Terre", bonus_json: { atk: 5 } }
    ];
    const insertMany = db.transaction(() => {
      for (const b of badges) {
        insert.run(b.id, b.name, JSON.stringify(b.bonus_json));
      }
    });
    insertMany();
  }
}
