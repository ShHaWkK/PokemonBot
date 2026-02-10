import { db } from "../persistence/db";
type SpeciesRow = { id: number; evolutions_json: string; mega_json: string | null; name: string };
export function checkLevelEvolution(speciesId: number, level: number): number | null {
  const row = db.prepare("SELECT id, evolutions_json, name FROM species WHERE id = ?").get(speciesId) as SpeciesRow;
  if (!row) return null;
  const evos = row.evolutions_json ? JSON.parse(row.evolutions_json) as { to: number; level?: number }[] : [];
  for (const e of evos) {
    if (e.level && level >= e.level) return e.to;
  }
  return null;
}
export function checkStoneEvolution(speciesId: number, stoneCategory: string): number | null {
  const row = db.prepare("SELECT id, evolutions_json FROM species WHERE id = ?").get(speciesId) as SpeciesRow;
  if (!row) return null;
  const evos = row.evolutions_json ? JSON.parse(row.evolutions_json) as { to: number; stone?: string }[] : [];
  for (const e of evos) {
    if (e["stone"] && e["stone"] === stoneCategory) return e.to;
  }
  return null;
}
export function megaAvailable(speciesId: number, hasKeystone: boolean, hasStone: boolean): boolean {
  if (!hasKeystone || !hasStone) return false;
  const row = db.prepare("SELECT mega_json FROM species WHERE id = ?").get(speciesId) as SpeciesRow;
  if (!row || !row.mega_json) return false;
  return true;
}
