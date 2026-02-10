import { db } from "../persistence/db";
type SpeciesRow = { id: number; name: string; base_stats_json: string; mega_json: string | null };
type TeamMon = { speciesId: number; name: string; level: number; hp: number; maxHp: number; megaUsed?: boolean };
type BattleParticipants = { player: TeamMon; npc: TeamMon };
type BattleRow = { id: number; type: string; state: string; participants_json: string };
function baseHp(speciesId: number): number {
  const s = db.prepare("SELECT id, name, base_stats_json FROM species WHERE id = ?").get(speciesId) as SpeciesRow;
  const base = JSON.parse(s.base_stats_json).hp as number;
  return Math.floor(base + 2 * base);
}
function makeMon(speciesId: number, level: number): TeamMon {
  const s = db.prepare("SELECT id, name, base_stats_json FROM species WHERE id = ?").get(speciesId) as SpeciesRow;
  const hp = Math.floor(baseHp(speciesId) + level * 3);
  return { speciesId, name: s.name, level, hp, maxHp: hp, megaUsed: false };
}
export function createGymBattle(userId: number, gymId: number): number {
  const teamRow = db.prepare("SELECT species_id, level FROM pokemon_instances WHERE owner_user_id = ? AND in_team_slot = 1").get(userId) as { species_id: number; level: number } | undefined;
  const player = makeMon(teamRow ? teamRow.species_id : 7, teamRow ? teamRow.level : 5);
  const gym = db.prepare("SELECT rules_json FROM gyms WHERE id = ?").get(gymId) as { rules_json: string };
  const rules = gym.rules_json ? JSON.parse(gym.rules_json) : {};
  const npcSpecies = (rules.team && rules.team[0]) || 1;
  const npcLevel = (rules.level && rules.level) || 8;
  const npc = makeMon(npcSpecies, npcLevel);
  const participants = { player, npc } as BattleParticipants;
  const id = db.prepare("INSERT INTO battles (type, state, participants_json) VALUES (?, ?, ?)").run("gym", "active", JSON.stringify(participants)).lastInsertRowid as number;
  return id;
}
export function createRaidBattle(userId: number): number {
  const teamRow = db.prepare("SELECT species_id, level FROM pokemon_instances WHERE owner_user_id = ? AND in_team_slot = 1").get(userId) as { species_id: number; level: number } | undefined;
  const player = makeMon(teamRow ? teamRow.species_id : 7, teamRow ? teamRow.level : 20);
  const npc = makeMon(150, 70);
  const participants = { player, npc } as BattleParticipants;
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
export function performAttack(battleId: number, side: "player" | "npc", moveIndex: number): { ended: boolean } {
  const b = getBattle(battleId);
  if (!b || b.state !== "active") return { ended: false };
  const att = side === "player" ? b.participants.player : b.participants.npc;
  const def = side === "player" ? b.participants.npc : b.participants.player;
  const base = 10 + Math.floor(att.level / 2);
  const boost = att.megaUsed ? Math.floor(base * 0.3) : 0;
  const dmg = base + boost;
  def.hp = Math.max(0, def.hp - dmg);
  if (def.hp === 0) {
    b.state = "ended";
  }
  saveBattle(b);
  return { ended: b.state === "ended" };
}
export function megaEvolve(battleId: number, side: "player" | "npc"): boolean {
  const b = getBattle(battleId);
  if (!b || b.state !== "active") return false;
  const mon = side === "player" ? b.participants.player : b.participants.npc;
  if (mon.megaUsed) return false;
  mon.megaUsed = true;
  saveBattle(b);
  return true;
}
