import { REST, Routes } from 'discord.js';
import { commands } from './commands.js';
for (const k of ['DISCORD_BOT_TOKEN','DISCORD_APPLICATION_ID','DISCORD_GUILD_ID']) {
  if (!process.env[k]) throw new Error(`Missing ${k}; set it privately in .env.`);
}
try {
  // Use a dedicated Discord application: this replaces its guild command list.
  await new REST({version:'10'}).setToken(process.env.DISCORD_BOT_TOKEN).put(
    Routes.applicationGuildCommands(process.env.DISCORD_APPLICATION_ID,process.env.DISCORD_GUILD_ID),{body:commands});
  console.log('F.L.E.A guild commands registered.');
} catch { console.error('Registration failed. Check application ID, guild ID, bot token and install permissions.'); process.exitCode=1; }
