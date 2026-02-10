import { db } from "../persistence/db";
import { PType, typeMultiplier } from "./types";
import { MoveId, getMove, defaultMovesByTypes } from "./moves";
import { awardBadge, getBadgeAtkBonus } from "../persistence/badges";
type StatusKind = "paralysis" | "burn" | "poison" | "sleep" | "freeze";
type SpeciesRow = { id: number; name: string; base_stats_json: string; mega_json: string | null; types_json: string };
type TeamMon = { speciesId: number; name: string; level: number; hp: number; maxHp: number; megaUsed?: boolean; types: PType[]; status?: StatusKind; statusTurns?: number; moves: MoveId[] };
type BattleParticipants = { playerUserId?: number; playerTeam: TeamMon[]; npcTeam: TeamMon[]; playerActive: number; npcActive: number };
type BattleRow = { id: number; type: string; state: string; participants_json: string; turn_log_json: string | null };
let rng: () => number = Math.random;
export function setRng(f: () => number) { rng = f; }
function baseHp(speciesId: number): number {
  const s = db.prepare("SELECT id, name, base_stats_json FROM species WHERE id = ?").get(speciesId) as SpeciesRow;
  const base = JSON.parse(s.base_stats_json).hp as number;
  return Math.floor(base + 2 * base);
}
function makeMon(speciesId: number, level: number, movesOverride?: MoveId[]): TeamMon {
  const s = db.prepare("SELECT id, name, base_stats_json, types_json FROM species WHERE id = ?").get(speciesId) as SpeciesRow;
  const hp = Math.floor(baseHp(speciesId) + level * 3);
  const types = JSON.parse(s.types_json) as PType[];
  const moves = movesOverride && movesOverride.length ? movesOverride : defaultMovesByTypes(types);
  return { speciesId, name: s.name, level, hp, maxHp: hp, megaUsed: false, types, status: undefined, statusTurns: undefined, moves };
}
export function createGymBattle(userId: number, gymId: number): number {
  const teamRows = db.prepare("SELECT species_id, level, moves_json, in_team_slot FROM pokemon_instances WHERE owner_user_id = ? AND in_team_slot IS NOT NULL ORDER BY in_team_slot").all(userId) as { species_id: number; level: number; moves_json: string | null; in_team_slot:number }[];
  const playerTeam = (teamRows.length ? teamRows : [{ species_id: 7, level: 5, moves_json: null, in_team_slot: 1 }]).map(r => {
    const mv = r.moves_json ? JSON.parse(r.moves_json) as MoveId[] : undefined;
    return makeMon(r.species_id, r.level, mv);
  });
  const gym = db.prepare("SELECT rules_json FROM gyms WHERE id = ?").get(gymId) as { rules_json: string };
  const rules = gym.rules_json ? JSON.parse(gym.rules_json) : {};
  const npcSpecies = (rules.team && rules.team[0]) || 1;
  const npcLevel = (rules.level && rules.level) || 8;
  const npcTeam = [makeMon(npcSpecies, npcLevel)];
  const participants = { playerUserId: userId, playerTeam, npcTeam, playerActive: 0, npcActive: 0 } as BattleParticipants;
  const id = db.prepare("INSERT INTO battles (type, state, participants_json, turn_log_json) VALUES (?, ?, ?, ?)").run("gym", "active", JSON.stringify(participants), JSON.stringify([])).lastInsertRowid as number;
  return id;
}
export function createRaidBattle(userId: number): number {
  const teamRows = db.prepare("SELECT species_id, level, moves_json, in_team_slot FROM pokemon_instances WHERE owner_user_id = ? AND in_team_slot IS NOT NULL ORDER BY in_team_slot").all(userId) as { species_id: number; level: number; moves_json: string | null; in_team_slot:number }[];
  const playerTeam = (teamRows.length ? teamRows : [{ species_id: 7, level: 20, moves_json: null, in_team_slot: 1 }]).map(r => {
    const mv = r.moves_json ? JSON.parse(r.moves_json) as MoveId[] : undefined;
    return makeMon(r.species_id, r.level, mv);
  });
  const npcTeam = [makeMon(150, 70)];
  const participants = { playerUserId: userId, playerTeam, npcTeam, playerActive: 0, npcActive: 0 } as BattleParticipants;
  const id = db.prepare("INSERT INTO battles (type, state, participants_json, turn_log_json) VALUES (?, ?, ?, ?)").run("raid", "active", JSON.stringify(participants), JSON.stringify([])).lastInsertRowid as number;
  return id;
}
export function getBattle(battleId: number): { id: number; type: string; state: string; participants: BattleParticipants; log: string[] } | null {
  const row = db.prepare("SELECT id, type, state, participants_json, turn_log_json FROM battles WHERE id = ?").get(battleId) as BattleRow | undefined;
  if (!row) return null;
  const log = row.turn_log_json ? JSON.parse(row.turn_log_json) as string[] : [];
  return { id: row.id, type: row.type, state: row.state, participants: JSON.parse(row.participants_json) as BattleParticipants, log };
}
function saveBattle(b: { id: number; type: string; state: string; participants: BattleParticipants; log?: string[] }) {
  const lg = b.log ?? getBattle(b.id)?.log ?? [];
  db.prepare("UPDATE battles SET state = ?, participants_json = ?, turn_log_json = ? WHERE id = ?").run(b.state, JSON.stringify(b.participants), JSON.stringify(lg), b.id);
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
let currentBattleId = 0;
export function performAttack(battleId: number, side: "player" | "npc", moveIndex: number): { ended: boolean } {
  currentBattleId = battleId;
  const b = getBattle(battleId);
  if (!b || b.state !== "active") return { ended: false };
  const att = side === "player" ? b.participants.playerTeam[b.participants.playerActive] : b.participants.npcTeam[b.participants.npcActive];
  const def = side === "player" ? b.participants.npcTeam[b.participants.npcActive] : b.participants.playerTeam[b.participants.playerActive];
  if (att.status === "sleep") {
    if ((att.statusTurns ?? 0) > 0) {
      att.statusTurns = (att.statusTurns ?? 0) - 1;
      b.log.push(`${att.name} is asleep.`);
      saveBattle(b);
      return { ended: false };
    } else {
      att.status = undefined;
      att.statusTurns = undefined;
      b.log.push(`${att.name} woke up.`);
    }
  }
  if (att.status === "freeze") {
    if (rng() < 0.2) {
      att.status = undefined;
      b.log.push(`${att.name} thawed out.`);
    } else {
      b.log.push(`${att.name} is frozen solid.`);
      saveBattle(b);
      return { ended: false };
    }
  }
  if (att.status === "paralysis" && rng() < 0.25) {
    b.log.push(`${att.name} is paralyzed! It can't move!`);
    saveBattle(b);
    return { ended: false };
  }
  const moveId = att.moves[Math.max(0, Math.min(3, moveIndex))];
  const dmg = computeDamage(att, def, moveId);
  const move = getMove(moveId);
  if (rng() > (move.accuracy ?? 1)) {
    b.log.push(`${att.name} used ${move.name}, but it missed!`);
    saveBattle(b);
    return { ended: false };
  }
  let finalDmg = dmg;
  const isCrit = rng() < 1/16;
  if (isCrit) finalDmg = Math.floor(finalDmg * 1.5);
  if (side === "player" && b.participants.playerUserId) {
    const bonus = getBadgeAtkBonus(b.participants.playerUserId);
    if (bonus > 0) finalDmg = Math.floor(finalDmg * (1 + bonus / 100));
  }
  def.hp = Math.max(0, def.hp - finalDmg);
  b.log.push(`${att.name} used ${move.name}. ${isCrit ? "A critical hit! " : ""}It dealt ${finalDmg}.`);
  if (move.status && rng() < move.status.chance) {
    if (move.status.kind === "burn") def.status = "burn";
    if (move.status.kind === "paralysis") def.status = "paralysis";
    if (move.status.kind === "poison") def.status = "poison";
    if (move.status.kind === "sleep") { def.status = "sleep"; def.statusTurns = 2 + Math.floor(rng() * 3); }
    if (move.status.kind === "freeze") def.status = "freeze";
  }
  if (att.status === "burn") {
    att.hp = Math.max(0, att.hp - 5);
  }
  if (att.status === "poison") {
    att.hp = Math.max(0, att.hp - 5);
  }
  if (def.hp === 0) {
    b.state = "ended";
    b.log.push(`${def.name} fainted.`);
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
