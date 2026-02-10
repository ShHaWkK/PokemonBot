import { REST, Routes, SlashCommandBuilder } from "discord.js";
import { CLIENT_ID, DISCORD_TOKEN, GUILD_ID } from "../lib/config";

export const commandBuilders = [
  new SlashCommandBuilder().setName("start").setDescription("Commencer l'aventure et choisir un starter"),
  new SlashCommandBuilder().setName("screen").setDescription("Ouvrir votre écran persistant"),
  new SlashCommandBuilder().setName("settings").setDescription("Préférences utilisateur"),
  new SlashCommandBuilder().setName("redeem").setDescription("Réclamer une récompense via code"),
  new SlashCommandBuilder().setName("help").setDescription("Aide contextuelle")
].map(c => c.toJSON());
export async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);
  if (GUILD_ID) {
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commandBuilders });
  } else {
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commandBuilders });
  }
}
