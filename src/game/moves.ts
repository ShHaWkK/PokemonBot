import { PType } from "./types";
export type MoveId = "tackle" | "ember" | "water_gun" | "vine_whip" | "thunder_shock";
export type Move = { id: MoveId; name: string; type: PType; power: number; status?: { kind: "burn" | "paralysis"; chance: number } };
const moves: Record<MoveId, Move> = {
  tackle: { id: "tackle", name: "Tackle", type: "Normal", power: 40 },
  ember: { id: "ember", name: "Ember", type: "Feu", power: 40, status: { kind: "burn", chance: 0.1 } },
  water_gun: { id: "water_gun", name: "Water Gun", type: "Eau", power: 40 },
  vine_whip: { id: "vine_whip", name: "Vine Whip", type: "Plante", power: 45 },
  thunder_shock: { id: "thunder_shock", name: "Thunder Shock", type: "Electrik", power: 40, status: { kind: "paralysis", chance: 0.1 } }
};
export function getMove(id: MoveId): Move {
  return moves[id];
}
export function defaultMovesByTypes(types: PType[]): MoveId[] {
  if (types.includes("Feu")) return ["ember", "tackle", "vine_whip", "thunder_shock"];
  if (types.includes("Eau")) return ["water_gun", "tackle", "vine_whip", "thunder_shock"];
  if (types.includes("Plante")) return ["vine_whip", "tackle", "ember", "water_gun"];
  if (types.includes("Electrik")) return ["thunder_shock", "tackle", "ember", "water_gun"];
  return ["tackle", "ember", "water_gun", "vine_whip"];
}
