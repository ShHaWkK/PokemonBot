export type PType = "Feu" | "Eau" | "Plante" | "Electrik" | "Vol" | "Poison" | "Normal" | "Psy" | "Glace" | "Sol" | "Roche" | "Dragon" | "Tenebres" | "Fee" | "Spectre" | "Insecte" | "Acier" | "Combat";
const chart: Record<PType, Partial<Record<PType, number>>> = {
  Feu: { Plante: 2, Eau: 0.5, Feu: 0.5, Glace: 2, Insecte: 2, Acier: 2, Roche: 0.5, Dragon: 0.5 },
  Eau: { Feu: 2, Plante: 0.5, Eau: 0.5, Sol: 2, Roche: 2, Dragon: 0.5 },
  Plante: { Eau: 2, Feu: 0.5, Vol: 0.5, Poison: 0.5, Roche: 2, Sol: 2, Insecte: 0.5, Dragon: 0.5, Acier: 0.5 },
  Electrik: { Eau: 2, Vol: 2, Plante: 0.5, Sol: 0 },
  Vol: { Plante: 2, Electrik: 0.5, Roche: 0.5 },
  Poison: { Plante: 2, Roche: 0.5, Sol: 0.5, Spectre: 0.5, Acier: 0 },
  Normal: { Roche: 0.5, Acier: 0.5, Spectre: 0 },
  Psy: { Combat: 2, Poison: 2, Acier: 0.5, Tenebres: 0, Psy: 0.5 },
  Glace: { Plante: 2, Vol: 2, Dragon: 2, Sol: 2, Feu: 0.5, Eau: 0.5, Glace: 0.5, Acier: 0.5 },
  Sol: { Feu: 2, Electrik: 2, Roche: 2, Acier: 2, Plante: 0.5, Insecte: 0.5, Vol: 0 },
  Roche: { Feu: 2, Vol: 2, Insecte: 2, Glace: 2, Sol: 0.5, Acier: 0.5, Combat: 0.5 },
  Dragon: { Dragon: 2, Acier: 0.5, Fee: 0 },
  Tenebres: { Psy: 2, Spectre: 2, Combat: 0.5, Fee: 0.5 },
  Fee: { Dragon: 2, Combat: 2, Tenebres: 2, Feu: 0.5, Acier: 0.5, Poison: 0.5 },
  Spectre: { Psy: 2, Spectre: 2, Tenebres: 0.5, Normal: 0 },
  Insecte: { Plante: 2, Psy: 2, Tenebres: 2, Feu: 0.5, Vol: 0.5, Roche: 0.5, Acier: 0.5 },
  Acier: { Roche: 2, Glace: 2, Fee: 2, Feu: 0.5, Eau: 0.5, Electrik: 0.5, Acier: 0.5 },
  Combat: { Normal: 2, Roche: 2, Acier: 2, Tenebres: 2, Glace: 2, Vol: 0.5, Poison: 0.5, Psy: 0.5, Insecte: 0.5, Fee: 0.5 }
};
export function typeMultiplier(moveType: PType, defenderTypes: PType[]): number {
  let m = 1;
  for (const dt of defenderTypes) {
    const v = chart[moveType][dt] ?? 1;
    m *= v;
  }
  return m;
}
