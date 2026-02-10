import { Client, EmbedBuilder, TextChannel } from "discord.js";
function delay(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}
export async function runCapture(client: Client, channelId: string, messageId: string, speciesName: string) {
  const channel = await client.channels.fetch(channelId) as TextChannel;
  const msg = await channel.messages.fetch(messageId);
  const frames = [
    new EmbedBuilder().setTitle("Une rencontre sauvage").setDescription("Une Poké Ball est lancée"),
    new EmbedBuilder().setTitle("Capture").setDescription("La balle remue"),
    new EmbedBuilder().setTitle("Capture").setDescription("La balle remue"),
    new EmbedBuilder().setTitle("Capture").setDescription("La balle remue"),
    new EmbedBuilder().setTitle("Capture").setDescription("Flash"),
    new EmbedBuilder().setTitle("Révélation").setDescription(speciesName)
  ];
  for (const f of frames) {
    await msg.edit({ embeds: [f] });
    await delay(500);
  }
}
export async function runEvolution(client: Client, channelId: string, messageId: string, fromName: string, toName: string) {
  const channel = await client.channels.fetch(channelId) as TextChannel;
  const msg = await channel.messages.fetch(messageId);
  const frames = [
    new EmbedBuilder().setTitle("Évolution").setDescription("Silhouette"),
    new EmbedBuilder().setTitle("Évolution").setDescription("Énergie"),
    new EmbedBuilder().setTitle("Évolution").setDescription("Flash"),
    new EmbedBuilder().setTitle("Évolution").setDescription(toName)
  ];
  for (const f of frames) {
    await msg.edit({ embeds: [f] });
    await delay(600);
  }
}
export async function runMegaEvolution(client: Client, channelId: string, messageId: string, name: string) {
  const channel = await client.channels.fetch(channelId) as TextChannel;
  const msg = await channel.messages.fetch(messageId);
  const frames = [
    new EmbedBuilder().setTitle("Méga-Évolution").setDescription("Aura"),
    new EmbedBuilder().setTitle("Méga-Évolution").setDescription("Flash"),
    new EmbedBuilder().setTitle("Méga-Évolution").setDescription(name)
  ];
  for (const f of frames) {
    await msg.edit({ embeds: [f] });
    await delay(600);
  }
}
