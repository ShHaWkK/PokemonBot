import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, StringSelectMenuBuilder } from "discord.js";
import { makeId } from "../discord/ids";
import { SceneName, UserScreenState } from "../scenes/types";
export function buildScreen(state: UserScreenState) {
  const embed = new EmbedBuilder().setTitle("Aventure Pokémon").setDescription(buildDescription(state)).setColor(0x2ecc71);
  const rows = [];
  rows.push(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(buildNavMenu(state)));
  rows.push(buildContextRow(state));
  return { embeds: [embed], components: rows };
}
function buildDescription(state: UserScreenState): string {
  if (state.activeScene === "Exploration") return `Zone ${state.zoneId}`;
  if (state.activeScene === "Equipe") return "Gestion de votre équipe";
  if (state.activeScene === "Sac") return "Votre inventaire";
  if (state.activeScene === "Quetes") return "Vos quêtes";
  if (state.activeScene === "Pokedex") return "Progression Pokédex";
  if (state.activeScene === "Arenes") return "Arènes et badges";
  return "Boutique";
}
function buildNavMenu(state: UserScreenState) {
  const menu = new StringSelectMenuBuilder().setCustomId(makeId(state.userId, { scene: state.activeScene, action: "nav" })).setPlaceholder("Navigation");
  const opts: SceneName[] = ["Exploration", "Equipe", "Sac", "Quetes", "Pokedex", "Arenes", "Shop"];
  for (const s of opts) {
    menu.addOptions({ label: s, value: s, default: s === state.activeScene });
  }
  return menu;
}
function buildContextRow(state: UserScreenState) {
  const row = new ActionRowBuilder<ButtonBuilder>();
  if (state.activeScene === "Exploration") {
    row.addComponents(
      new ButtonBuilder().setCustomId(makeId(state.userId, { scene: "Exploration", action: "explore" })).setLabel("Explorer").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(makeId(state.userId, { scene: "Exploration", action: "repousse" })).setLabel("Repousse ON/OFF").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(makeId(state.userId, { scene: "Exploration", action: "info" })).setLabel("Infos Zone").setStyle(ButtonStyle.Secondary)
    );
  } else if (state.activeScene === "Equipe") {
    row.addComponents(
      new ButtonBuilder().setCustomId(makeId(state.userId, { scene: "Equipe", action: "details" })).setLabel("Détails").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(makeId(state.userId, { scene: "Equipe", action: "ordre" })).setLabel("Changer ordre").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(makeId(state.userId, { scene: "Equipe", action: "soigner" })).setLabel("Soigner").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(makeId(state.userId, { scene: "Equipe", action: "apprendre" })).setLabel("Apprendre attaque").setStyle(ButtonStyle.Secondary)
    );
  } else if (state.activeScene === "Sac") {
    row.addComponents(
      new ButtonBuilder().setCustomId(makeId(state.userId, { scene: "Sac", action: "utiliser" })).setLabel("Utiliser").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(makeId(state.userId, { scene: "Sac", action: "equiper" })).setLabel("Équiper").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(makeId(state.userId, { scene: "Sac", action: "filtrer" })).setLabel("Filtrer").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(makeId(state.userId, { scene: "Sac", action: "page" })).setLabel("Page suivante").setStyle(ButtonStyle.Secondary)
    );
  } else if (state.activeScene === "Quetes") {
    row.addComponents(
      new ButtonBuilder().setCustomId(makeId(state.userId, { scene: "Quetes", action: "suivre" })).setLabel("Suivre").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(makeId(state.userId, { scene: "Quetes", action: "recompenses" })).setLabel("Récompenses").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(makeId(state.userId, { scene: "Quetes", action: "abandon" })).setLabel("Abandonner").setStyle(ButtonStyle.Danger)
    );
  } else if (state.activeScene === "Pokedex") {
    row.addComponents(
      new ButtonBuilder().setCustomId(makeId(state.userId, { scene: "Pokedex", action: "filtrer" })).setLabel("Filtrer").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(makeId(state.userId, { scene: "Pokedex", action: "recompenses" })).setLabel("Récompenses").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(makeId(state.userId, { scene: "Pokedex", action: "details" })).setLabel("Voir détails").setStyle(ButtonStyle.Primary)
    );
  } else if (state.activeScene === "Arenes") {
    row.addComponents(
      new ButtonBuilder().setCustomId(makeId(state.userId, { scene: "Arenes", action: "defier" })).setLabel("Défier leader").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(makeId(state.userId, { scene: "Arenes", action: "badges" })).setLabel("Voir badges").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(makeId(state.userId, { scene: "Arenes", action: "infos" })).setLabel("Infos règles").setStyle(ButtonStyle.Secondary)
    );
  } else {
    row.addComponents(
      new ButtonBuilder().setCustomId(makeId(state.userId, { scene: "Shop", action: "acheter" })).setLabel("Acheter").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(makeId(state.userId, { scene: "Shop", action: "panier" })).setLabel("Panier").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(makeId(state.userId, { scene: "Shop", action: "categorie" })).setLabel("Catégorie").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(makeId(state.userId, { scene: "Shop", action: "confirmer" })).setLabel("Confirmer").setStyle(ButtonStyle.Secondary)
    );
  }
  return row;
}
