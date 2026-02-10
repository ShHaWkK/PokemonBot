import { db } from "../persistence/db";
type ItemRow = { id: number; name: string; category: string; effect_json: string };
export function captureChance(ballItemId: number, speciesId: number, level: number, status?: string): number {
  const item = db.prepare("SELECT id, name, category, effect_json FROM items WHERE id = ?").get(ballItemId) as ItemRow;
  if (!item || item.category !== "Ball") return 0;
  const rate = JSON.parse(item.effect_json).rate || 1;
  const base = baseRateBySpecies(speciesId);
  let chance = base * rate;
  if (status === "sleep" || status === "frozen") chance *= 1.5;
  if (status === "paralyzed" || status === "poisoned" || status === "burned") chance *= 1.2;
  chance *= Math.max(0.5, 1 - level / 100);
  if (chance > 0.95) chance = 0.95;
  if (chance < 0.05) chance = 0.05;
  return chance;
}
function baseRateBySpecies(speciesId: number): number {
  if ([150].includes(speciesId)) return 0.05;
  if ([25,133].includes(speciesId)) return 0.35;
  return 0.5;
}
export function attemptCapture(chance: number): boolean {
  return Math.random() < chance;
}
