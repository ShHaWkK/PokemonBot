import { Client, GatewayIntentBits, Interaction, TextChannel, ButtonInteraction, StringSelectMenuInteraction, ChatInputCommandInteraction, ButtonBuilder, ButtonStyle, ActionRowBuilder, EmbedBuilder } from "discord.js";
import { registerCommands } from "./discord/commands";
import { seedIfNeeded } from "./persistence/seed";
import { db } from "./persistence/db";

import { findOrCreateUser, setStarter, addPokemon, setScreenMessageId, addDexSeen, addDexCaught, adjustInventory, getInventory, inTransaction, canAccessZone, awardTeamExp, xpCaptureGainByZone, rewardMilestones } from "./persistence/repo";
import { recordRequest } from "./persistence/idempotency";
import { DISCORD_TOKEN, GUILD_ID } from "./lib/config";
import { buildScreen } from "./renderer/ScreenRenderer";

import { runCapture, runEvolution, runMegaEvolution } from "./renderer/cinematics";
import { randomEncounter } from "./game/spawn";
import { captureChance, attemptCapture } from "./game/capture";
import { parseId, makeId } from "./discord/ids";
import { SceneName } from "./scenes/types";
import { createGymBattle, createRaidBattle, getBattle, performAttack, megaEvolve, switchActive } from "./game/battle";
import { buildBattle } from "./renderer/BattleRenderer";
import { logAudit, lastAudit } from "./persistence/audit";
import { awardBadge, countBadges } from "./persistence/badges";
import { getSettings, setSetting } from "./persistence/repo";
import { checkLevelEvolution } from "./game/evolution";

function emojiForTypes(types: string[]): string {
  const t = types[0];
  const map: Record<string, string> = {
    "Feu": "🔥",
    "Eau": "💧",
    "Plante": "🌿",
    "Electrik": "⚡",
    "Glace": "❄️",
    "Roche": "🪨",
    "Sol": "⛰️",
    "Vol": "🕊️",
    "Poison": "☠️",
    "Psy": "🔮",
    "Tenebres": "🌑",
    "Fee": "✨",
    "Spectre": "👻",
    "Insecte": "🐛",
    "Acier": "⚙️",
    "Dragon": "🐉",
    "Combat": "🥊",
    "Normal": "🐾"
  };
  return map[t] || "⭐";
}
async function imageForSpeciesId(id: number): Promise<string> {
  try {
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}/`);
    if (res.ok) {
      const p = await res.json();
      const url = p?.sprites?.other?.["official-artwork"]?.front_default as string | undefined;
      if (url) return url;
    }
  } catch {}
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
}



const client = new Client(
  { intents: 
    [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] 
  }
);


async function ensureScreenMessage(interaction: Interaction, userId: number, discordUserId: string, state: 
  { scene: SceneName; zoneId: number 

  }) {
  const user = findOrCreateUser(discordUserId, interaction.guildId || undefined);
  const channel = interaction.channel as TextChannel;
  if 
  (!user.screen_message_id) 
  {
    const message = await channel.send(buildScreen({ userId: discordUserId, activeScene: state.scene, zoneId: state.zoneId }));
    setScreenMessageId(user.id, message.id);
    return message;
  } else 
    {
    const msg = await channel.messages.fetch(user.screen_message_id).catch(() => null);
    if (!msg) {
      const message = await channel.send(buildScreen({ userId: discordUserId, activeScene: state.scene, zoneId: state.zoneId }));
      setScreenMessageId(user.id, message.id);
      return message;
    }
    await msg.edit(buildScreen({ userId: discordUserId, activeScene: state.scene, zoneId: state.zoneId }));
    return msg;
  }
}
client.once("ready", async () => 
  {
  seedIfNeeded();
  await registerCommands();
});

client.on("interactionCreate", async (interaction) => 
  {
  if (interaction.isChatInputCommand()) return handleCommand(interaction);
  if (interaction.isButton()) return handleButton(interaction);
  if (interaction.isStringSelectMenu()) return handleSelect(interaction);
});

async function handleCommand(interaction: ChatInputCommandInteraction) {
  const discordUserId = interaction.user.id;
  const user = findOrCreateUser(discordUserId, interaction.guildId || undefined);
  if (!recordRequest(user.id, interaction.id)) {
    await interaction.reply({ content: "Déjà traité", ephemeral: true });
    return;
  }
  if (interaction.commandName === "start") {
    await interaction.reply({ content: "Choisissez votre starter", ephemeral: true, components: [
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId("starter:7").setLabel("Carapuce").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("starter:1").setLabel("Bulbizarre").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("starter:4").setLabel("Salamèche").setStyle(ButtonStyle.Danger)
      )
    ]});
  } else if (interaction.commandName === "screen") 
    {
    await interaction.deferReply({ ephemeral: true });
    await ensureScreenMessage(interaction, user.id, discordUserId, 
      { scene: "Exploration", zoneId: 2 

    });
    await interaction.editReply({ content: "Écran prêt" });
  } else if (interaction.commandName === "settings") 
    {

    await interaction.reply({ content: "Réglez vos préférences", ephemeral: true, components: 
      [
      new ActionRowBuilder<ButtonBuilder>().addComponents
      (

        new ButtonBuilder().setCustomId("set:anim:on").setLabel("Animations ON").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("set:anim:off").setLabel("Animations OFF").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("set:acc:on").setLabel("Accessibilité ON").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("set:acc:off").setLabel("Accessibilité OFF").setStyle(ButtonStyle.Secondary)
      )
    ]});
  } else if (interaction.commandName === "redeem") {
    await interaction.reply({ content: "Code non reconnu", ephemeral: true });
  } else if (interaction.commandName === "help") {
    await interaction.reply({ content: "Aide contextuelle: utilisez le menu pour naviguer", ephemeral: true });
  }
}
async function handleButton(interaction: ButtonInteraction) {
  const discordUserId = interaction.user.id;
  const user = findOrCreateUser(discordUserId, interaction.guildId || undefined);
  if (!recordRequest(user.id, interaction.id)) {
    await interaction.reply({ content: "Déjà traité", ephemeral: true });
    return;
  }
  if (interaction.customId.startsWith("starter:")) {
    const speciesId = parseInt(interaction.customId.split(":")[1], 10);
    setStarter(user.id, speciesId);
    addPokemon(user.id, speciesId, 5, false);
    adjustInventory(user.id, 1, 10);
    await interaction.reply({ content: "Starter choisi. Écran en cours d'initialisation.", ephemeral: true });
    const channel = interaction.channel as TextChannel;
    const msg = await ensureScreenMessage(interaction, user.id, discordUserId, { scene: "Exploration", zoneId: 2 });
    await msg.edit(buildScreen({ userId: discordUserId, activeScene: "Exploration", zoneId: 2 }));
    return;
  }
  const parsed = parseId(interaction.customId);
  if (parsed.scene === "Exploration" && parsed.action === "explore") {
    const zoneId = parsed.data ? Number(parsed.data) : 2;
    if (!canAccessZone(user.id, zoneId)) {
      await interaction.reply({ content: "Zone verrouillée. Niveau insuffisant.", ephemeral: true });
      return;
    }
    const encounter = randomEncounter(zoneId);
    addDexSeen(user.id, encounter.speciesId, false);
    await interaction.reply({ content: `Rencontre: ${encounter.name}`, ephemeral: true });
    const channel = interaction.channel as TextChannel;
    const userRow = findOrCreateUser(discordUserId, interaction.guildId || undefined);
    if (userRow.screen_message_id) {
      const settings = getSettings(user.id);
      const anim = (settings as any).animations !== false;
      if (anim) await runCapture(client, channel.id, userRow.screen_message_id, encounter.name, await imageForSpeciesId(encounter.speciesId));
    }
    const inv = getInventory(user.id);
    const hasPokeball = inv.find(i => i.item_id === 1)?.quantity || 0;
    const hasGreat = inv.find(i => i.item_id === 2)?.quantity || 0;
    const hasUltra = inv.find(i => i.item_id === 3)?.quantity || 0;
    await interaction.followUp({ ephemeral: true, content: "Choisissez une balle", components: [
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(`cap:${encounter.speciesId}:${encounter.level}:1:${zoneId}`).setLabel(`Poké Ball (${hasPokeball})`).setStyle(ButtonStyle.Primary).setDisabled(hasPokeball <= 0),
        new ButtonBuilder().setCustomId(`cap:${encounter.speciesId}:${encounter.level}:2:${zoneId}`).setLabel(`Super Ball (${hasGreat})`).setStyle(ButtonStyle.Success).setDisabled(hasGreat <= 0),
        new ButtonBuilder().setCustomId(`cap:${encounter.speciesId}:${encounter.level}:3:${zoneId}`).setLabel(`Hyper Ball (${hasUltra})`).setStyle(ButtonStyle.Danger).setDisabled(hasUltra <= 0)
      )
    ]});
  } else if (parsed.scene === "Exploration" && parsed.action === "repousse") {
    await interaction.reply({ content: "Repousse activé/désactivé", ephemeral: true });
  } else if (parsed.scene === "Exploration" && parsed.action === "info") {
    const zoneId = parsed.data ? Number(parsed.data) : 2;
    const z = db.prepare("SELECT name, biome, rules_json FROM zones WHERE id = ?").get(zoneId) as { name:string; biome:string; rules_json:string } | undefined;
    const rules = z?.rules_json ? JSON.parse(z.rules_json) as Record<string, unknown> : {};
    const min = typeof (rules as any).levelMin === "number" ? (rules as any).levelMin : 1;
    await interaction.reply({ content: z ? `${z.name} (${z.biome}) • Niveau min ${min}` : "Zone inconnue", ephemeral: true });
  } else if (parsed.scene === "Exploration" && parsed.action === "zones") {
    const zones = db.prepare("SELECT id, name FROM zones ORDER BY id").all() as { id:number; name:string }[];
    const rows = [];
    for (let i = 0; i < zones.length; i += 4) {
      const slice = zones.slice(i, i + 4);
      const row = new ActionRowBuilder<ButtonBuilder>();
      for (const z of slice) {
        row.addComponents(new ButtonBuilder().setCustomId(makeId(discordUserId, { scene: "Exploration", action: "zone", data: String(z.id) })).setLabel(z.name).setStyle(ButtonStyle.Secondary));
      }
      rows.push(row);
    }
    await interaction.reply({ content: "Choisissez une zone", ephemeral: true, components: rows });
  } else if (parsed.scene === "Exploration" && parsed.action === "zone") {
    const zoneId = Number(parsed.data);
    if (!canAccessZone(user.id, zoneId)) {
      await interaction.reply({ content: "Zone verrouillée. Niveau insuffisant.", ephemeral: true });
      return;
    }
    const msg = await ensureScreenMessage(interaction, user.id, discordUserId, { scene: "Exploration", zoneId });
    await interaction.reply({ content: "Zone sélectionnée", ephemeral: true });
  } else if (parsed.action === "soigner") {
    await interaction.reply({ content: "Centre Pokémon: vos Pokémon sont soignés", ephemeral: true });
  } else if (parsed.scene === "Equipe" && parsed.action === "details") {
    const team = db.prepare("SELECT pi.id, s.name, pi.level, pi.in_team_slot FROM pokemon_instances pi JOIN species s ON s.id = pi.species_id WHERE pi.owner_user_id = ? AND pi.in_team_slot IS NOT NULL ORDER BY pi.in_team_slot").all(user.id) as { id:number; name:string; level:number; in_team_slot:number }[];
    const text = team.length ? team.map(t => `#${t.in_team_slot} ${t.name} Lv.${t.level}`).join("\n") : "Équipe vide";
    await interaction.reply({ content: text, ephemeral: true });
  } else if (parsed.scene === "Equipe" && parsed.action === "apprendre") {
    const team = db.prepare("SELECT id, species_id, level, moves_json FROM pokemon_instances WHERE owner_user_id = ? AND in_team_slot IS NOT NULL ORDER BY in_team_slot").all(user.id) as { id:number; species_id:number; level:number; moves_json:string | null }[];
    if (!team.length) {
      await interaction.reply({ content: "Équipe vide", ephemeral: true });
      return;
    }
    const mon = team[0];
    const srow = db.prepare("SELECT learnset_json FROM species WHERE id = ?").get(mon.species_id) as { learnset_json: string };
    const learned = mon.moves_json ? JSON.parse(mon.moves_json) as string[] : [];
    const ls = srow.learnset_json ? JSON.parse(srow.learnset_json) as { level:number; move:string }[] : [];
    const candidates = ls.filter(e => e.level <= mon.level && !learned.includes(e.move)).slice(-1);
    if (!candidates.length) {
      await interaction.reply({ content: "Aucune nouvelle attaque à apprendre", ephemeral: true });
      return;
    }
    const move = candidates[0].move;
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(makeId(discordUserId, { scene: "Equipe", action: "learn", data: `${mon.id}:${move}:0` })).setLabel("Remplacer #1").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(makeId(discordUserId, { scene: "Equipe", action: "learn", data: `${mon.id}:${move}:1` })).setLabel("Remplacer #2").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(makeId(discordUserId, { scene: "Equipe", action: "learn", data: `${mon.id}:${move}:2` })).setLabel("Remplacer #3").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(makeId(discordUserId, { scene: "Equipe", action: "learn", data: `${mon.id}:${move}:3` })).setLabel("Remplacer #4").setStyle(ButtonStyle.Primary)
    );
    await interaction.reply({ content: `Apprendre ${move}`, ephemeral: true, components: [row] });
  } else if (parsed.scene === "Equipe" && parsed.action === "learn") {
    const [pidStr, move, slotStr] = String(parsed.data).split(":");
    const pid = parseInt(pidStr, 10);
    const slot = parseInt(slotStr, 10);
    const row = db.prepare("SELECT moves_json FROM pokemon_instances WHERE id = ?").get(pid) as { moves_json: string } | undefined;
    let moves = row?.moves_json ? JSON.parse(row!.moves_json) as string[] : [];
    if (!moves.length) moves = ["tackle", "ember", "water_gun", "vine_whip"];
    moves[slot] = move;
    db.prepare("UPDATE pokemon_instances SET moves_json = ? WHERE id = ?").run(JSON.stringify(moves), pid);
    await interaction.reply({ content: "Attaque remplacée", ephemeral: true });
  } else if (parsed.scene === "Sac" && parsed.action === "utiliser") {
    const inv = getInventory(user.id);
    const potion = inv.find(i => i.item_id === 10)?.quantity || 0;
    if (potion <= 0) {
      await interaction.reply({ content: "Aucune potion", ephemeral: true });
    } else {
      adjustInventory(user.id, 10, -1);
      await interaction.reply({ content: "Potion utilisée", ephemeral: true });
    }
  } else if (parsed.scene === "Pokedex" && parsed.action === "details") {
    const dex = db.prepare("SELECT s.name, p.seen_count, p.caught_count FROM pokedex p JOIN species s ON s.id = p.species_id WHERE p.owner_user_id = ? ORDER BY s.id").all(user.id) as { name:string; seen_count:number; caught_count:number }[];
    const text = dex.length ? dex.map(d => `${d.name} vu:${d.seen_count} capturé:${d.caught_count}`).join("\n") : "Aucune entrée";
    await interaction.reply({ content: text, ephemeral: true });
  } else if (parsed.scene === "Shop" && parsed.action === "acheter") {
    const price = 200;
    const ok = db.prepare("SELECT money FROM users WHERE id = ?").get(user.id) as { money:number };
    if (ok.money < price) {
      await interaction.reply({ content: "Fonds insuffisants", ephemeral: true });
    } else {
      db.prepare("UPDATE users SET money = money - ? WHERE id = ?").run(price, user.id);
      adjustInventory(user.id, 1, 1);
      await interaction.reply({ content: "Achat: Poké Ball +1", ephemeral: true });
    }
  } else if (parsed.scene === "Shop" && parsed.action === "categorie") {
    const badges = countBadges(user.id);
    const hasKeystone = getInventory(user.id).find(i => i.item_id === 30)?.quantity || 0;
    const raidWin = !!lastAudit(user.id, "raid_win");
    if (!hasKeystone || (badges < 1 && !raidWin)) {
      await interaction.reply({ content: "Mega Stones indisponibles. Obtenez un badge ou gagnez un raid et la Keystone.", ephemeral: true });
    } else {
      await interaction.reply({ content: "Mega Stones", ephemeral: true, components: [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder().setCustomId("shop:mega:34").setLabel("Venusaurite").setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId("shop:mega:31").setLabel("Charizardite X").setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId("shop:mega:32").setLabel("Charizardite Y").setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId("shop:mega:33").setLabel("Blastoisinite").setStyle(ButtonStyle.Primary)
        )
      ]});
    }
  } else if (interaction.customId.startsWith("shop:mega:")) {
    const itemId = Number(interaction.customId.split(":")[2]);
    const price = 0;
    const badges = countBadges(user.id);
    const raidWin = !!lastAudit(user.id, "raid_win");
    const hasKeystone = getInventory(user.id).find(i => i.item_id === 30)?.quantity || 0;
    if (!hasKeystone || (badges < 1 && !raidWin)) {
      await interaction.reply({ content: "Conditions non remplies", ephemeral: true });
      return;
    }
    adjustInventory(user.id, itemId, 1);
    await interaction.reply({ content: "Mega Stone ajoutée", ephemeral: true });
  } else if (parsed.scene === "Arenes" && parsed.action === "defier") {
    await interaction.reply({ content: "Choisissez une arène", ephemeral: true, components: [
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(makeId(discordUserId, { scene: "Arenes", action: "arena", data: "1" })).setLabel("Jadielle").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(makeId(discordUserId, { scene: "Arenes", action: "arena", data: "2" })).setLabel("Argenta").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(makeId(discordUserId, { scene: "Arenes", action: "arena", data: "3" })).setLabel("Azuria").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(makeId(discordUserId, { scene: "Arenes", action: "arena", data: "4" })).setLabel("Carmin").setStyle(ButtonStyle.Success)
      ),
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId(makeId(discordUserId, { scene: "Arenes", action: "arena", data: "5" })).setLabel("Céladopole").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(makeId(discordUserId, { scene: "Arenes", action: "arena", data: "6" })).setLabel("Safrania").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(makeId(discordUserId, { scene: "Arenes", action: "arena", data: "7" })).setLabel("Parmanie").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(makeId(discordUserId, { scene: "Arenes", action: "arena", data: "8" })).setLabel("Cramois’Île").setStyle(ButtonStyle.Success)
      )
    ]});
  } else if (parsed.scene === "Arenes" && parsed.action === "arena") {
    const gymId = Number(parsed.data);
    const badges = countBadges(user.id);
    if (badges < gymId - 1) {
      await interaction.reply({ content: "Arène verrouillée. Obtenez le badge précédent.", ephemeral: true });
      return;
    }
    const battleId = createGymBattle(user.id, gymId);
    const b = getBattle(battleId)!;
    const msg = await ensureScreenMessage(interaction, user.id, discordUserId, { scene: "Battle", zoneId: 2 });
    await msg.edit(buildBattle(discordUserId, b));
    const gym = db.prepare("SELECT name, rules_json FROM gyms WHERE id = ?").get(gymId) as { name:string; rules_json:string };
    const rules = gym.rules_json ? JSON.parse(gym.rules_json) as Record<string, unknown> : {};
    const intro = typeof (rules as any).intro === "string" ? (rules as any).intro : "Leader prêt au combat.";
    const portraits: Record<number, string> = {
      1: "https://i.imgur.com/pierre.png",
      2: "https://i.imgur.com/ondine.png",
      3: "https://i.imgur.com/majorbob.png",
      4: "https://i.imgur.com/erika.png",
      5: "https://i.imgur.com/koga.png",
      6: "https://i.imgur.com/morgane.png",
      7: "https://i.imgur.com/auguste.png",
      8: "https://i.imgur.com/giovanni.png"
    };
    const emojis: Record<number, string> = { 1: "🪨", 2: "💧", 3: "⚡", 4: "🌿", 5: "☠️", 6: "🔮", 7: "🔥", 8: "🛡️" };
    const embed = new EmbedBuilder().setTitle(gym.name).setDescription(`${emojis[gymId] || "🏆"} ${intro}`).setThumbnail(portraits[gymId] || "https://i.imgur.com/default.png").setColor(0x3498db);
    await interaction.reply({ ephemeral: true, embeds: [embed] });
  } else if (parsed.scene === "Quetes" && parsed.action === "suivre") {
    const last = lastAudit(user.id, "raid_start");
    if (last && Date.now() - new Date(last.created_at).getTime() < 24 * 60 * 60 * 1000) {
      await interaction.reply({ content: "Raid en cooldown", ephemeral: true });
    } else {
      const battleId = createRaidBattle(user.id);
      logAudit(user.id, "raid_start", "battle", battleId, interaction.id, {}, true);
      const b = getBattle(battleId)!;
      const msg = await ensureScreenMessage(interaction, user.id, discordUserId, { scene: "Battle", zoneId: 2 });
      await msg.edit(buildBattle(discordUserId, b));
      await interaction.reply({ content: "Raid légendaire engagé", ephemeral: true });
    }
  } else if (parsed.scene === "Quetes" && parsed.action === "recompenses") {
    const sinceDay = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const sinceWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const dayCaptures = (db.prepare("SELECT COUNT(1) as c FROM audit WHERE user_id = ? AND action = 'capture_success' AND created_at >= ?").get(user.id, sinceDay) as { c:number }).c;
    const weekGyms = (db.prepare("SELECT COUNT(1) as c FROM audit WHERE user_id = ? AND action = 'gym_win' AND created_at >= ?").get(user.id, sinceWeek) as { c:number }).c;
    const noItemWin = !!lastAudit(user.id, "challenge_no_items_win");
    const rewardsText = [];
    if (dayCaptures >= 5) {
      adjustInventory(user.id, 1, 3);
      rewardsText.push("Quête quotidienne: 5 captures → Poké Ball x3");
    } else {
      rewardsText.push(`Captures aujourd'hui: ${dayCaptures}/5`);
    }
    if (weekGyms >= 1) {
      adjustInventory(user.id, 2, 1);
      rewardsText.push("Quête hebdo: 1 arène → Super Ball x1");
    } else {
      rewardsText.push(`Arènes cette semaine: ${weekGyms}/1`);
    }
    if (noItemWin) {
      rewardsText.push("Défi: Arène sans objets → Titre ‘Spartiate’ débloqué");
      setSetting(user.id, "title", "Spartiate");
    }
    await interaction.reply({ content: rewardsText.join("\n"), ephemeral: true });
  } else if (parsed.scene === "Battle" && parsed.action?.startsWith("atk")) {
    const battleId = Number(parsed.data);
    const idx = parsed.action === "atk1" ? 0 : parsed.action === "atk2" ? 1 : parsed.action === "atk3" ? 2 : 3;
    const res = performAttack(battleId, "player", idx);
    const b = getBattle(battleId)!;
    const channel = interaction.channel as TextChannel;
    const userRow = findOrCreateUser(discordUserId, interaction.guildId || undefined);
    const msg = await channel.messages.fetch(userRow.screen_message_id!);
    await msg.edit(buildBattle(discordUserId, b));
    if (res.ended) {
      if (b.type === "gym") {
        adjustInventory(user.id, 1, 2);
        const badgeId = (b.rewards && typeof (b.rewards as any).badgeId === "number") ? (b.rewards as any).badgeId as number : 1;
        awardBadge(user.id, badgeId);
        logAudit(user.id, "gym_win", "battle", battleId, interaction.id, {}, true);
        const usedItems = !!((b.rewards as any)?.usedItems);
        if (!usedItems) logAudit(user.id, "challenge_no_items_win", "battle", battleId, interaction.id, {}, true);
        const gymRow = db.prepare("SELECT difficulty FROM gyms WHERE id = ?").get((b.rewards as any).gymId) as { difficulty:number } | undefined;
        const diff = gymRow?.difficulty || 1;
        const ups = awardTeamExp(user.id, diff * 20);
        const icons: Record<number, string> = { 1: "https://i.imgur.com/7g1Badge.png", 2: "https://i.imgur.com/2c2Badge.png", 3: "https://i.imgur.com/3f3Badge.png", 4: "https://i.imgur.com/4p4Badge.png", 5: "https://i.imgur.com/5a5Badge.png", 6: "https://i.imgur.com/6m6Badge.png", 7: "https://i.imgur.com/7v7Badge.png", 8: "https://i.imgur.com/8t8Badge.png" };
        const embed = { embeds: [{ title: `Badge obtenu`, description: `Badge #${badgeId}`, thumbnail: { url: icons[badgeId] || "https://i.imgur.com/default.png" } }] };
        await interaction.reply({ content: `Victoire d'arène. Poké Ball x2`, ephemeral: true, ...embed });
        if (ups.length) {
          const upText = ups.map((u: { slot:number; before:number; after:number; name:string }) => `#${u.slot} ${u.name} ${u.before}→${u.after}`).join("\n");
          await interaction.followUp({ ephemeral: true, content: `Level-ups:\n${upText}` });
          const userRow2 = findOrCreateUser(discordUserId, interaction.guildId || undefined);
          const settings2 = getSettings(user.id);
          const anim2 = (settings2 as any).animations !== false;
          if (anim2 && userRow2.screen_message_id) {
            const evoEvents = ups.map(u => {
              const cur = db.prepare("SELECT s.name, s.id FROM pokemon_instances pi JOIN species s ON s.id = pi.species_id WHERE pi.id = ?").get(u.id) as { name:string; id:number } | undefined;
              const evolved = cur && cur.name !== u.name;
              return evolved ? { from: u.name, to: cur!.name, speciesId: cur!.id } : null;
            }).filter(Boolean) as { from:string; to:string; speciesId:number }[];
            if (evoEvents.length) {
              const channel2 = interaction.channel as TextChannel;
              for (const ev of evoEvents) {
                await runEvolution(client, channel2.id, userRow2.screen_message_id, ev.from, ev.to, await imageForSpeciesId(ev.speciesId));
              }
            }
          }
        }
      } else {
        const inv = getInventory(user.id);
        const hasHyper = inv.find(i => i.item_id === 3)?.quantity || 0;
        logAudit(user.id, "raid_win", "battle", battleId, interaction.id, {}, true);
        adjustInventory(user.id, 30, 1);
        await interaction.reply({ content: "Raid gagné. Essai de capture disponible", ephemeral: true });
        await interaction.followUp({ ephemeral: true, content: "Choisissez une balle", components: [
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId(`cap:150:70:3`).setLabel(`Hyper Ball (${hasHyper})`).setStyle(ButtonStyle.Danger).setDisabled(hasHyper <= 0)
          )
        ]});
      }
    } else {
      await interaction.reply({ content: "Attaque effectuée", ephemeral: true });
    }
  } else if (parsed.scene === "Battle" && parsed.action === "mega") {
    const battleId = Number(parsed.data);
    const inv = getInventory(user.id);
    const hasKeystone = inv.find(i => i.item_id === 30)?.quantity || 0;
    const b = getBattle(battleId)!;
    const stoneSpecies = [31,32,33,34,35].map(id => ({ id, qty: inv.find(i => i.item_id === id)?.quantity || 0 })).find(s => s.qty > 0);
    if (!hasKeystone || !stoneSpecies) {
      await interaction.reply({ content: "Keystone ou Mega Stone manquants", ephemeral: true });
      return;
    }
    const ok = megaEvolve(battleId, "player");
    if (!ok) {
      await interaction.reply({ content: "Méga déjà utilisée", ephemeral: true });
      return;
    }
    const channel = interaction.channel as TextChannel;
    const userRow = findOrCreateUser(discordUserId, interaction.guildId || undefined);
    const msg = await channel.messages.fetch(userRow.screen_message_id!);
    const activeName = b.participants.playerTeam[b.participants.playerActive].name;
    await runMegaEvolution(client, channel.id, msg.id, activeName);
    await msg.edit(buildBattle(discordUserId, getBattle(battleId)!));
    await interaction.reply({ content: "Méga-Évolution activée", ephemeral: true });
  } else if (parsed.scene === "Battle" && parsed.action === "objet") {
    const battleId = Number(parsed.data);
    const inv = getInventory(user.id);
    const potion = inv.find(i => i.item_id === 10)?.quantity || 0;
    if (potion <= 0) {
      await interaction.reply({ content: "Aucune potion", ephemeral: true });
    } else {
      const b = getBattle(battleId)!;
      if (b.type === "gym") {
        const gymId = (b.rewards && typeof (b.rewards as any).gymId === "number") ? (b.rewards as any).gymId as number : 0;
        const gym = db.prepare("SELECT rules_json FROM gyms WHERE id = ?").get(gymId) as { rules_json:string } | undefined;
        const rules = gym?.rules_json ? JSON.parse(gym.rules_json) as Record<string, unknown> : {};
        const allowed = (rules as any).allowedItems !== false;
        if (!allowed) {
          await interaction.reply({ content: "Objets interdits dans cette arène", ephemeral: true });
          return;
        }
      }
      adjustInventory(user.id, 10, -1);
      const p = b.participants.playerTeam[b.participants.playerActive];
      p.hp = Math.min(p.maxHp, p.hp + 20);
      const rewards = (b.rewards as any) || {};
      rewards.usedItems = true;
      db.prepare("UPDATE battles SET participants_json = ?, rewards_json = ? WHERE id = ?").run(JSON.stringify(b.participants), JSON.stringify(rewards), battleId);
      const channel = interaction.channel as TextChannel;
      const userRow = findOrCreateUser(discordUserId, interaction.guildId || undefined);
      const msg = await channel.messages.fetch(userRow.screen_message_id!);
      await msg.edit(buildBattle(discordUserId, getBattle(battleId)!));
      await interaction.reply({ content: "Potion utilisée", ephemeral: true });
    }
  } else if (parsed.scene === "Battle" && parsed.action === "changer") {
    const battleId = Number(parsed.data);
    const b = getBattle(battleId)!;
    const team = b.participants.playerTeam;
    const row = new ActionRowBuilder<ButtonBuilder>();
    for (let i = 0; i < team.length; i++) {
      row.addComponents(new ButtonBuilder().setCustomId(`swp:${battleId}:${i}`).setLabel(`#${i + 1} ${team[i].name}`).setStyle(ButtonStyle.Secondary).setDisabled(i === b.participants.playerActive || team[i].hp === 0));
    }
    await interaction.reply({ content: "Choisissez un Pokémon", ephemeral: true, components: [row] });
  } else if (interaction.customId.startsWith("swp:")) {
    const [, battleIdStr, slotStr] = interaction.customId.split(":");
    const battleId = Number(battleIdStr);
    const slotIndex = Number(slotStr);
    const ok = switchActive(battleId, "player", slotIndex);
    const b = getBattle(battleId)!;
    const channel = interaction.channel as TextChannel;
    const userRow = findOrCreateUser(discordUserId, interaction.guildId || undefined);
    const msg = await channel.messages.fetch(userRow.screen_message_id!);
    await msg.edit(buildBattle(discordUserId, b));
    await interaction.reply({ content: ok ? "Changement effectué" : "Changement impossible", ephemeral: true });
  } else if (parsed.scene === "Battle" && parsed.action === "fuir") {
    const battleId = Number(parsed.data);
    db.prepare("UPDATE battles SET state = ? WHERE id = ?").run("ended", battleId);
    await interaction.reply({ content: "Vous avez fui le combat", ephemeral: true });
  } else if (interaction.customId.startsWith("cap:")) {
    const parts = interaction.customId.split(":");
    const [, speciesIdStr, levelStr, ballIdStr, zoneIdStr] = parts;
    const speciesId = parseInt(speciesIdStr, 10);
    const level = parseInt(levelStr, 10);
    const ballId = parseInt(ballIdStr, 10);
    const zoneId = zoneIdStr ? parseInt(zoneIdStr, 10) : 2;
    if (speciesId === 150) {
      const row = db.prepare("SELECT caught_count FROM pokedex WHERE owner_user_id = ? AND species_id = ?").get(user.id, 150) as { caught_count:number } | undefined;
      if (row && row.caught_count > 0) {
        await interaction.reply({ content: "Rencontre légendaire déjà capturée", ephemeral: true });
        return;
      }
    }
    const chance = captureChance(ballId, speciesId, level);
    const success = attemptCapture(chance);
    const evoEvents: { from:string; to:string; speciesId:number }[] = [];
    inTransaction(() => {
      adjustInventory(user.id, ballId, -1);
      if (success) {
        addPokemon(user.id, speciesId, level, false);
        addDexCaught(user.id, speciesId, false);
        logAudit(user.id, "capture_success", "species", speciesId, interaction.id, { level }, true);
        const gain = xpCaptureGainByZone(zoneId);
        const ups = awardTeamExp(user.id, gain);
        for (const u of ups) {
          const to = checkLevelEvolution(u.species_id, u.after);
          if (to) {
            db.prepare("UPDATE pokemon_instances SET species_id = ? WHERE id = ?").run(to, u.id);
            const newName = (db.prepare("SELECT name FROM species WHERE id = ?").get(to) as { name:string }).name;
            evoEvents.push({ from: u.name, to: newName, speciesId: to });
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
        const rewards = rewardMilestones(user.id, ups.map(u => ({ before: u.before, after: u.after })));
        const chunks: string[] = [];
        if (ups.length) {
          const upText = ups.map((u: { slot:number; before:number; after:number; name:string }) => `#${u.slot} ${u.name} ${u.before}→${u.after}`).join("\n");
          chunks.push(`Level-ups:\n${upText}`);
        }
        if (evoEvents.length) {
          const evosText = evoEvents.map(e => `${e.from} → ${e.to}`).join("\n");
          chunks.push(`Évolutions:\n${evosText}`);
        }
        const r = [];
        if (rewards.pokeball) r.push(`Poké Ball x${rewards.pokeball}`);
        if (rewards.greatball) r.push(`Super Ball x${rewards.greatball}`);
        if (rewards.ultraball) r.push(`Hyper Ball x${rewards.ultraball}`);
        if (r.length) chunks.push(`Récompenses palier:\n${r.join(", ")}`);
        if (chunks.length) interaction.followUp({ ephemeral: true, content: chunks.join("\n\n") });
      }
    });
    await interaction.reply({ content: success ? "Capture réussie" : "Capture échouée", ephemeral: true });
    if (success) {
      const userRow = findOrCreateUser(discordUserId, interaction.guildId || undefined);
      const settings = getSettings(user.id);
      const anim = (settings as any).animations !== false;
      if (anim && userRow.screen_message_id) {
        const channel = interaction.channel as TextChannel;
        for (const ev of evoEvents) {
          await runEvolution(client, channel.id, userRow.screen_message_id, ev.from, ev.to, await imageForSpeciesId(ev.speciesId));
        }
      }
    }
  } else {
    await interaction.reply({ content: "Action non gérée", ephemeral: true });
  }
}
async function handleSelect(interaction: StringSelectMenuInteraction) {
  const discordUserId = interaction.user.id;
  const user = findOrCreateUser(discordUserId, interaction.guildId || undefined);
  if (!recordRequest(user.id, interaction.id)) {
    await interaction.reply({ content: "Déjà traité", ephemeral: true });
    return;
  }
  const selected = interaction.values[0] as SceneName;
  if (!selected) {
    await interaction.reply({ content: "Aucune sélection", ephemeral: true });
    return;
  }
  const channel = interaction.channel as TextChannel;
  const msg = await ensureScreenMessage(interaction, user.id, discordUserId, { scene: selected, zoneId: 2 });
  await interaction.reply({ content: `Scène: ${selected}`, ephemeral: true });
}
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;
  if (interaction.customId.startsWith("set:")) {
    const discordUserId = interaction.user.id;
    const user = findOrCreateUser(discordUserId, interaction.guildId || undefined);
    const [, key, val] = interaction.customId.split(":");
    if (key === "anim") setSetting(user.id, "animations", val === "on");
    if (key === "acc") setSetting(user.id, "accessibility", val === "on");
    await interaction.reply({ content: "Préférence mise à jour", ephemeral: true });
  }
});
async function start() {
  await client.login(DISCORD_TOKEN);
}
start();
