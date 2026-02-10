import { db } from "../persistence/db";
import { PType, typeMultiplier } from "./types";
import { MoveId, getMove, defaultMovesByTypes } from "./moves";
type SpeciesRow = { id: number; name: string; base_stats_json: string; mega_json: string | null; types_json: string };
type TeamMon = { speciesId: number; name: string; level: number; hp: number; maxHp: number; megaUsed?: boolean; types: PType[]; status?: "paralysis" | "burn"; moves: MoveId[] };
type BattleParticipants = { playerTeam: TeamMon[]; npcTeam: TeamMon[]; playerActive: number; npcActive: number };
type BattleRow = { id: number; type: string; state: string; participants_json: string };
let rng: () => number = Math.random;
export function setRng(f: () => number) { rng = f; }
function baseHp(speciesId: number): number {
  const s = db.prepare("SELECT id, name, base_stats_json FROM species WHERE id = ?").get(speciesId) as SpeciesRow;
  const base = JSON.parse(s.base_stats_json).hp as number;
  return Math.floor(base + 2 * base);
}
function makeMon(speciesId: number, level: number): TeamMon {
  const s = db.prepare("SELECT id, name, base_stats_json, types_json FROM species WHERE id = ?").get(speciesId) as SpeciesRow;
  const hp = Math.floor(baseHp(speciesId) + level * 3);
  const types = JSON.parse(s.types_json) as PType[];
  const moves = defaultMovesByTypes(types);
  return { speciesId, name: s.name, level, hp, maxHp: hp, megaUsed: false, types, status: undefined, moves };
}
export function createGymBattle(userId: number, gymId: number): number {
  const teamRows = db.prepare("SELECT species_id, level, in_team_slot FROM pokemon_instances WHERE owner_user_id = ? AND in_team_slot IS NOT NULL ORDER BY in_team_slot").all(userId) as { species_id: number; level: number; in_team_slot:number }[];
  const playerTeam = (teamRows.length ? teamRows : [{ species_id: 7, level: 5, in_team_slot: 1 }]).map(r => makeMon(r.species_id, r.level));
  const gym = db.prepare("SELECT rules_json FROM gyms WHERE id = ?").get(gymId) as { rules_json: string };
  const rules = gym.rules_json ? JSON.parse(gym.rules_json) : {};
  const npcSpecies = (rules.team && rules.team[0]) || 1;
  const npcLevel = (rules.level && rules.level) || 8;
  const npcTeam = [makeMon(npcSpecies, npcLevel)];
  const participants = { playerTeam, npcTeam, playerActive: 0, npcActive: 0 } as BattleParticipants;
  const id = db.prepare("INSERT INTO battles (type, state, participants_json) VALUES (?, ?, ?)").run("gym", "active", JSON.stringify(participants)).lastInsertRowid as number;
  return id;
}
export function createRaidBattle(userId: number): number {
  const teamRows = db.prepare("SELECT species_id, level, in_team_slot FROM pokemon_instances WHERE owner_user_id = ? AND in_team_slot IS NOT NULL ORDER BY in_team_slot").all(userId) as { species_id: number; level: number; in_team_slot:number }[];
  const playerTeam = (teamRows.length ? teamRows : [{ species_id: 7, level: 20, in_team_slot: 1 }]).map(r => makeMon(r.species_id, r.level));
  const npcTeam = [makeMon(150, 70)];
  const participants = { playerTeam, npcTeam, playerActive: 0, npcActive: 0 } as BattleParticipants;
  const id = db.prepare("INSERT INTO battles (type, state, participants_json) VALUES (?, ?, ?)").run("raid", "active", JSON.stringify(participants)).lastInsertRowid as number;
  return id;
}
export function getBattle(battleId: number): { id: number; type: string; state: string; participants: BattleParticipants } | null {
  const row = db.prepare("SELECT id, type, state, participants_json FROM battles WHERE id = ?").get(battleId) as BattleRow | undefined;
  if (!row) return null;
  return { id: row.id, type: row.type, state: row.state, participants: JSON.parse(row.participants_json) as BattleParticipants };
}
function saveBattle(b: { id: number; type: string; state: string; participants: BattleParticipants }) {
  db.prepare("UPDATE battles SET state = ?, participants_json = ? WHERE id = ?").run(b.state, JSON.stringify(b.participants), b.id);
}
export function computeDamage(att: TeamMon, def: TeamMon, moveId: MoveId): number {
  const move = getMove(moveId);
  const base = move.power + att.level;
  const stab = att.types.includes(move.type) ? 1.2 : 1;
  const mult = typeMultiplier(move.type, def.types);
  let dmg = Math.ceil(base * stab * mult / 10);
  if (att.megaUsed) dmg = Math.ceil(dmg * 1.3);
  if (att.status === "burn") dmg = Math.floor(dmg * 0.7);
  if (dmg < 1) dmg = 1;
  return dmg;
}
export function performAttack(battleId: number, side: "player" | "npc", moveIndex: number): { ended: boolean } {
  const b = getBattle(battleId);
  if (!b || b.state !== "active") return { ended: false };
  const att = side === "player" ? b.participants.playerTeam[b.participants.playerActive] : b.participants.npcTeam[b.participants.npcActive];
  const def = side === "player" ? b.participants.npcTeam[b.participants.npcActive] : b.participants.playerTeam[b.participants.playerActive];
  if (att.status === "paralysis" && rng() < 0.25) {
    saveBattle(b);
    return { ended: false };
  }
  const moveId = att.moves[Math.max(0, Math.min(3, moveIndex))];
  const dmg = computeDamage(att, def, moveId);
  def.hp = Math.max(0, def.hp - dmg);
  const move = getMove(moveId);
  if (move.status && rng() < move.status.chance) {
    if (move.status.kind === "burn") def.status = "burn";
    if (move.status.kind === "paralysis") def.status = "paralysis";
  }
  if (att.status === "burn") {
    att.hp = Math.max(0, att.hp - 5);
  }
  if (def.hp === 0) {
    b.state = "ended";
  }
  saveBattle(b);
  return { ended: b.state === "ended" };
}
export function megaEvolve(battleId: number, side: "player" | "npc"): boolean {
  const b = getBattle(battleId);
  if (!b || b.state !== "active") return false;
  const mon = side === "player" ? b.participants.playerTeam[b.participants.playerActive] : b.participants.npcTeam[b.participants.npcActive];
  if (mon.megaUsed) return false;
  mon.megaUsed = true;
  saveBattle(b);
  return true;
}
export function switchActive(battleId: number, side: "player" | "npc", slotIndex: number): boolean {
  const b = getBattle(battleId);
  if (!b || b.state !== "active") return false;
  if (side === "player") {
    if (slotIndex < 0 || slotIndex >= b.participants.playerTeam.length) return false;
    b.participants.playerActive = slotIndex;
  } else {
    if (slotIndex < 0 || slotIndex >= b.participants.npcTeam.length) return false;
    b.participants.npcActive = slotIndex;
  }
  saveBattle(b);
  return true;
}
