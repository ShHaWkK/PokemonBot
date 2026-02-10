import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from "discord.js";
import { makeId } from "../discord/ids";
export function buildBattle(userId: string, battle: { id: number; type: string; state: string; participants: { player: { name: string; hp: number; maxHp: number; megaUsed?: boolean; level:number }, npc: { name: string; hp: number; maxHp: number; megaUsed?: boolean; level:number } } }) {
  const p = battle.participants.player;
  const n = battle.participants.npc;
  const embed = new EmbedBuilder().setTitle("Combat").setDescription(`${p.name} Lv.${p.level} ${bar(p.hp, p.maxHp)}\nVS\n${n.name} Lv.${n.level} ${bar(n.hp, n.maxHp)}`).setColor(0xe74c3c);
  const actions = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(makeId(userId, { scene: "Battle", action: "atk1", data: String(battle.id) })).setLabel("Attaque 1").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(makeId(userId, { scene: "Battle", action: "atk2", data: String(battle.id) })).setLabel("Attaque 2").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(makeId(userId, { scene: "Battle", action: "atk3", data: String(battle.id) })).setLabel("Attaque 3").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(makeId(userId, { scene: "Battle", action: "atk4", data: String(battle.id) })).setLabel("Attaque 4").setStyle(ButtonStyle.Primary)
  );
  const utility = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(makeId(userId, { scene: "Battle", action: "objet", data: String(battle.id) })).setLabel("Objet").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(makeId(userId, { scene: "Battle", action: "changer", data: String(battle.id) })).setLabel("Changer").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(makeId(userId, { scene: "Battle", action: "mega", data: String(battle.id) })).setLabel("Méga-Évolution").setStyle(ButtonStyle.Success).setDisabled(!!p.megaUsed),
    new ButtonBuilder().setCustomId(makeId(userId, { scene: "Battle", action: "fuir", data: String(battle.id) })).setLabel("Fuir").setStyle(ButtonStyle.Danger)
  );
  return { embeds: [embed], components: [actions, utility] };
}
function bar(hp: number, max: number): string {
  const ratio = Math.max(0, Math.min(1, hp / max));
  const len = 10;
  const filled = Math.floor(ratio * len);
  return `[${"#".repeat(filled)}${"-".repeat(len - filled)}] ${hp}/${max}`;
}
