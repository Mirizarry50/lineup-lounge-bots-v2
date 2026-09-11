import {SlashCommandBuilder,PermissionFlagsBits as P} from 'discord.js';
import {SPORTS} from './core.js';
const sport=o=>o.setName('sport').setDescription('Choose a sport').setRequired(true).addChoices(...Object.entries(SPORTS).map(([value,s])=>({name:s.name,value})));
const cmd=(n,d)=>new SlashCommandBuilder().setName(n).setDescription(d).setDMPermission(false);
export const newsCommands=[
  cmd('headlines','ESPN stats and injury updates, with original links').addStringOption(sport),
  cmd('research','AI news and published-stat research; no odds required').addStringOption(sport)
    .addStringOption(o=>o.setName('topic').setDescription('Team, player, or matchup to research').setRequired(true).setMaxLength(250))
    .addStringOption(o=>o.setName('source').setDescription('Publisher to search').addChoices({name:'All sources',value:'all'},{name:'ESPN',value:'espn'},{name:'Yahoo Sports',value:'yahoo'},{name:'X / Twitter (indexed posts only)',value:'x'})),
  cmd('news-feed','Enable or pause automatic ESPN stats and injury posts').setDefaultMemberPermissions(P.ManageGuild).addStringOption(sport)
    .addBooleanOption(o=>o.setName('enabled').setDescription('Enable stats and injury posting').setRequired(true)),
  cmd('news-status','Show News Desk status and enabled sports')
].map(c=>c.toJSON());
