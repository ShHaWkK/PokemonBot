import { db } from "../persistence/db";
type SpeciesRow = { id: number; name: string; base_stats_json: string };
export function randomEncounter(zoneId: number): { speciesId: number; level: number; name: string } {
  const rows = db.prepare("SELECT id, name, base_stats_json FROM species").all() as SpeciesRow[];
  const pool = rows.filter(r => filterByZone(zoneId, r.id));
  const pick = pool[Math.floor(Math.random() * pool.length)];
  const level = suggestLevel(zoneId);
  return { speciesId: pick.id, level, name: pick.name };
}
function filterByZone(zoneId: number, speciesId: number): boolean {
  if (zoneId === 1) return [1,4,7,25,133].includes(speciesId);
  if (zoneId === 2) return [1,4,7,25].includes(speciesId);
  if (zoneId === 3) return [1,25].includes(speciesId);
  if (zoneId === 4) return [150,25].includes(speciesId);
  return [7,25,133].includes(speciesId);
}
function suggestLevel(zoneId: number): number {
  if (zoneId === 1) return 5;
  if (zoneId === 2) return 6;
  if (zoneId === 3) return 10;
  if (zoneId === 4) return 20;
  return 8;
}
