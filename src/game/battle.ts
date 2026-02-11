import { db } from "../persistence/db";
import { PType, typeMultiplier } from "./types";
import { MoveId, getMove, defaultMovesByTypes } from "./moves";
import { awardBadge, getBadgeAtkBonus } from "../persistence/badges";
import { awardTeamExp, rewardMilestones } from "../persistence/repo";
import { logAudit } from "../persistence/audit";
import { checkLevelEvolution } from "./evolution";



type StatusKind = "paralysis" | "burn" | "poison" | "sleep" | "freeze";

type SpeciesRow = { 
  id: number; 
  name: string; 
  base_stats_json: 
  string; mega_json: string | null; types_json: string };
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
  const gym = db.prepare("SELECT rules_json, badge_id FROM gyms WHERE id = ?").get(gymId) as { rules_json: string; badge_id: number };
  const rules = gym.rules_json ? JSON.parse(gym.rules_json) : {};
  const npcLevel = (rules.level && rules.level) || 8;
  const npcTeam = Array.isArray(rules.team) && rules.team.length ? rules.team.map((sid: number) => makeMon(sid, npcLevel)) : [makeMon(1, npcLevel)];
  const participants = { playerUserId: userId, playerTeam, npcTeam, playerActive: 0, npcActive: 0 } as BattleParticipants;
  const id = db.prepare("INSERT INTO battles (type, state, participants_json, turn_log_json, rewards_json) VALUES (?, ?, ?, ?, ?)").run("gym", "active", JSON.stringify(participants), JSON.stringify([]), JSON.stringify({ badgeId: gym.badge_id, gymId })).lastInsertRowid as number;
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
export function getBattle(battleId: number): { id: number; type: string; state: string; participants: BattleParticipants; log: string[]; rewards?: Record<string, unknown> } | null {
  const row = db.prepare("SELECT id, type, state, participants_json, turn_log_json, rewards_json FROM battles WHERE id = ?").get(battleId) as (BattleRow & { rewards_json: string | null }) | undefined;
  if (!row) return null;
  const log = row.turn_log_json ? JSON.parse(row.turn_log_json) as string[] : [];
  const rewards = row.rewards_json ? JSON.parse(row.rewards_json) as Record<string, unknown> : undefined;
  return { id: row.id, type: row.type, state: row.state, participants: JSON.parse(row.participants_json) as BattleParticipants, log, rewards };
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
  let env = 1;
  if (currentBattleId) {
    const b = getBattle(currentBattleId);
    if (b && b.type === "gym") {
      const gymId = (b.rewards && typeof (b.rewards as any).gymId === "number") ? (b.rewards as any).gymId as number : 0;
      if (gymId) {
        const gym = db.prepare("SELECT zone_id, rules_json FROM gyms WHERE id = ?").get(gymId) as { zone_id:number; rules_json:string } | undefined;
        let biome = "";
        let wx = 1;
        if (gym?.rules_json) {
          try {
            const rules = JSON.parse(gym.rules_json) as Record<string, unknown>;
            if (typeof (rules as any).terrain === "string") biome = (rules as any).terrain as string;
            const w = (rules as any).weather;
            if (typeof w === "string") {
              if (w === "Rain" && move.type === "Eau") wx = 1.2;
              if (w === "Sun" && move.type === "Feu") wx = 1.2;
            }
          } catch {}
        }
        if (!biome && gym && gym.zone_id) {
          const zone = db.prepare("SELECT biome FROM zones WHERE id = ?").get(gym.zone_id) as { biome:string } | undefined;
          biome = zone?.biome || "";
        }
        if (biome === "Herbes" && move.type === "Plante") env = 1.2;
        if (biome === "Eau" && move.type === "Eau") env = 1.2;
        if (biome === "Grottes" && (move.type === "Roche" || move.type === "Sol")) env = 1.2;
        if (biome === "Volcan" && move.type === "Feu") env = 1.2;
        if (biome === "Ville" && move.type === "Electrik") env = 1.2;
        if ((biome === "Glace" || biome === "Montagne") && move.type === "Glace") env = 1.2;
        env *= wx;
      }
    }
  }
  let dmg = Math.ceil(base * stab * mult * env / 10);
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
  if (att.status === "paralysis") finalDmg = Math.floor(finalDmg * 0.95);
  if (side === "player" && b.participants.playerUserId) {
    const bonus = getBadgeAtkBonus(b.participants.playerUserId);
    if (bonus > 0) finalDmg = Math.floor(finalDmg * (1 + bonus / 100));
  }
  def.hp = Math.max(0, def.hp - finalDmg);
  b.log.push(`${att.name} used ${move.name}. ${isCrit ? "A critical hit! " : ""}It dealt ${finalDmg}.`);
  if (move.type === "Feu" && def.status === "freeze") {
    def.status = undefined;
    b.log.push(`${def.name} thawed out from the heat.`);
  }
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
  // End-of-turn weather ticks
  if (b.type === "gym") {
    const gymId = (b.rewards && typeof (b.rewards as any).gymId === "number") ? (b.rewards as any).gymId as number : 0;
    if (gymId) {
      const gym = db.prepare("SELECT rules_json FROM gyms WHERE id = ?").get(gymId) as { rules_json:string } | undefined;
      let w = "";
      if (gym?.rules_json) {
        try {
          const rules = JSON.parse(gym.rules_json) as Record<string, unknown>;
          if (typeof (rules as any).weather === "string") w = (rules as any).weather as string;
        } catch {}
      }
      const tick = (mon: TeamMon) => {
        if (w === "Hail") {
          if (!mon.types.includes("Glace")) mon.hp = Math.max(0, mon.hp - 3);
        } else if (w === "Sandstorm") {
          const immune = mon.types.includes("Roche") || mon.types.includes("Sol") || mon.types.includes("Acier");
          if (!immune) mon.hp = Math.max(0, mon.hp - 3);
        }
      };
      tick(att);
      tick(def);
    }
  }
  if (def.hp === 0) {
    b.state = "ended";
    b.log.push(`${def.name} fainted.`);
  }
  if (def.hp === 0) {
    b.state = "ended";
  }
  if (b.state === "ended" && b.type === "gym") {
    const badgeId = (b.rewards && typeof (b.rewards as any).badgeId === "number") ? (b.rewards as any).badgeId as number : 1;
    const gymId = (b.rewards && typeof (b.rewards as any).gymId === "number") ? (b.rewards as any).gymId as number : 0;
    if (b.participants.playerUserId) {
      logAudit(b.participants.playerUserId, "gym_win", "battle", b.id, `gym_win:battle_${b.id}`, {}, true);
      const usedItems = !!((b.rewards as any)?.usedItems);
      if (!usedItems) logAudit(b.participants.playerUserId, "challenge_no_items_win", "battle", b.id, `no_items:battle_${b.id}`, {}, true);
      const gymRow = db.prepare("SELECT difficulty FROM gyms WHERE id = ?").get(gymId) as { difficulty:number } | undefined;
      const diff = gymRow?.difficulty || 1;
      const ups = awardTeamExp(b.participants.playerUserId, diff * 20);
      const rewards = rewardMilestones(b.participants.playerUserId, ups.map(u => ({ before: u.before, after: u.after })));
      for (const u of ups) {
        const to = checkLevelEvolution(u.species_id, u.after);
        if (to) {
          db.prepare("UPDATE pokemon_instances SET species_id = ? WHERE id = ?").run(to, u.id);
          const srow = db.prepare("SELECT learnset_json FROM species WHERE id = ?").get(to) as { learnset_json:string };
          const mrow = db.prepare("SELECT moves_json, level FROM pokemon_instances WHERE id = ?").get(u.id) as { moves_json:string | null; level:number };
          const moves = mrow.moves_json ? JSON.parse(mrow.moves_json) as string[] : [];
          const ls = srow.learnset_json ? JSON.parse(srow.learnset_json) as { level:number; move:string }[] : [];
          const candidate = ls.filter(e => e.level <= mrow.level && !moves.includes(e.move)).slice(-1)[0];
          if (candidate) {
            const next = [...moves, candidate.move].slice(-4);
            db.prepare("UPDATE pokemon_instances SET moves_json = ? WHERE id = ?").run(JSON.stringify(next), u.id);
          }
        }
      }
      awardBadge(b.participants.playerUserId, badgeId);
    }
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
