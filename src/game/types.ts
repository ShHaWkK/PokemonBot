export type PType = "Feu" | "Eau" | "Plante" | "Electrik" | "Vol" | "Poison" | "Normal" | "Psy";
const chart: Record<PType, Partial<Record<PType, number>>> = {
  Feu: { Plante: 2, Eau: 0.5, Feu: 0.5 },
  Eau: { Feu: 2, Plante: 0.5, Eau: 0.5 },
  Plante: { Eau: 2, Feu: 0.5, Vol: 0.5, Poison: 0.5 },
  Electrik: { Eau: 2, Vol: 2, Plante: 0.5 },
  Vol: { Plante: 2, Electrik: 0.5 },
  Poison: { Plante: 2 },
  Normal: {},
  Psy: {}
};
export function typeMultiplier(moveType: PType, defenderTypes: PType[]): number {
  let m = 1;
  for (const dt of defenderTypes) {
    const v = chart[moveType][dt] ?? 1;
    m *= v;
  }
  return m;
}
