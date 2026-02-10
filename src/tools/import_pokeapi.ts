import { db } from "../persistence/db";

type StatMap = { hp: number; atk: number; def: number; spa: number; spd: number; spe: number };
const typeMap: Record<string, string> = {
  normal: "Normal",
  fire: "Feu",
  water: "Eau",
  grass: "Plante",
  electric: "Electrik",
  flying: "Vol",
  poison: "Poison",
  psychic: "Psy",
  ice: "Glace",
  ground: "Sol",
  rock: "Roche",
  dragon: "Dragon",
  dark: "Tenebres",
  fairy: "Fee",
  ghost: "Spectre",
  bug: "Insecte",
  steel: "Acier",
  fighting: "Combat"
};
const knownMoves: Record<string, string> = {
  tackle: "tackle",
  ember: "ember",
  "water-gun": "water_gun",
  "vine-whip": "vine_whip",
  "thunder-shock": "thunder_shock"
};
function toStats(stats: any[]): StatMap {
  const get = (n: string) => stats.find((s) => s.stat.name === n)?.base_stat ?? 1;
  return { hp: get("hp"), atk: get("attack"), def: get("defense"), spa: get("special-attack"), spd: get("special-defense"), spe: get("speed") };
}
function toTypes(types: any[]): string[] {
  const t: string[] = [];
  for (const x of types) {
    const en = x.type.name as string;
    const fr = typeMap[en];
    if (fr) t.push(fr);
  }
  return t.length ? t : ["Normal"];
}
function toLearnset(moves: any[]): { level: number; move: string }[] {
  const out: { level: number; move: string }[] = [];
  for (const m of moves) {
    const name = m.move.name as string;
    if (!knownMoves[name]) continue;
    const vgd = m.version_group_details as any[];
    const entry = vgd.find((d) => d.move_learn_method?.name === "level-up" && (d.level_learned_at ?? 0) > 0);
    if (!entry) continue;
    out.push({ level: entry.level_learned_at, move: knownMoves[name] });
  }
  out.sort((a, b) => a.level - b.level);
  const dedup = new Map<string, number>();
  for (const e of out) {
    if (!dedup.has(e.move)) dedup.set(e.move, e.level);
  }
  return Array.from(dedup.entries()).map(([move, level]) => ({ move, level }));
}
async function getFrenchName(speciesId: number): Promise<string> {
  const res = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${speciesId}/`);
  const j = await res.json();
  const fr = (j.names as any[]).find((n) => n.language?.name === "fr")?.name as string | undefined;
  return fr || (j.name as string);
}
async function importRange(start: number, end: number) {
  const insert = db.prepare("INSERT INTO species (id, name, types_json, base_stats_json, evolutions_json, learnset_json, mega_json) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name=excluded.name, types_json=excluded.types_json, base_stats_json=excluded.base_stats_json, evolutions_json=excluded.evolutions_json, learnset_json=excluded.learnset_json, mega_json=excluded.mega_json");
  let c = 0;
  for (let id = start; id <= end; id++) {
    try {
      const r = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}/`);
      if (!r.ok) continue;
      const p = await r.json();
      const name = await getFrenchName(id);
      const types = toTypes(p.types);
      const base = toStats(p.stats);
      const learnset = toLearnset(p.moves);
      insert.run(id, name, JSON.stringify(types), JSON.stringify(base), JSON.stringify([]), JSON.stringify(learnset), null);
      c++;
      if (c % 25 === 0) console.log(`Insérés: ${c}`);
    } catch {}
  }
  console.log(`Import terminé: ${c} espèces`);
}
async function main() {
  const limit = Number(process.env.POKEDEX_LIMIT || "151");
  await importRange(1, limit);
}
main(); 
