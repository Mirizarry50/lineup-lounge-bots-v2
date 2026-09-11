import {screenshotCommands} from './screenshots/discord.js';
import { analyticsCommands } from './analytics/commands.js';
import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { SPORTS, BOOKS } from './core.js';
const bookOption = o => o.setName('book').setDescription('Sportsbook; default is Hard Rock Bet Florida').addChoices(...Object.entries(BOOKS).map(([value,name])=>({name,value})),{name:'All three sportsbooks',value:'all'});
const sportOption = o => o.setName('sport').setDescription('Choose sport').setRequired(true).addChoices(...Object.entries(SPORTS).map(([value,s])=>({name:s.name,value})));
const cmd = (name, description) => new SlashCommandBuilder().setName(name).setDescription(description).setDMPermission(false);
const admin = (name, description) => cmd(name,description).setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);
export const commands = [

  cmd('onboarding','Privately research and analyze your first selection with guided menus'),
  cmd('help','How to use F.L.E.A'),
  cmd('games','Upcoming games with sportsbook odds').addStringOption(sportOption).addStringOption(bookOption),
  cmd('news','Latest linked ESPN headlines').addStringOption(sportOption),
  cmd('odds','Available sportsbook selections and quote IDs').addStringOption(sportOption)
    .addStringOption(o=>o.setName('event').setDescription('Event ID from /games').setRequired(true))
    .addStringOption(o=>o.setName('market').setDescription('h2h, spreads, totals, or supported player_ market').setMaxLength(70))
    .addIntegerOption(o=>o.setName('page').setDescription('Page of selections').setMinValue(1).setMaxValue(100))
    .addStringOption(bookOption),
  cmd('analyze','Research news and published stats to assess selected sportsbook quotes').addStringOption(sportOption)
    .addStringOption(o=>o.setName('quotes').setDescription('1–12 quote IDs from /odds separated by commas').setRequired(true).setMaxLength(220)),
  cmd('stats','Season team stats from SportsDataIO').addStringOption(sportOption)
    .addStringOption(o=>o.setName('team').setDescription('Exact team name, code, or TeamID').setRequired(true).setMaxLength(100)),
  admin('setup','Create F.L.E.A roles and channels; safe to rerun'),
  admin('feed','Enable or pause scheduled headlines and daily analysis').addStringOption(sportOption)
    .addBooleanOption(o=>o.setName('enabled').setDescription('Enable scheduled posts for this sport').setRequired(true)),
  admin('status','Show configuration and feed status'),
  admin('map-team','Map an odds team name to a verified SportsDataIO TeamID').addStringOption(sportOption)
    .addStringOption(o=>o.setName('name').setDescription('Exact team name in /games').setRequired(true).setMaxLength(100))
    .addIntegerOption(o=>o.setName('id').setDescription('SportsDataIO TeamID').setRequired(true).setMinValue(1))
].map(c=>c.toJSON()).concat(analyticsCommands,screenshotCommands);
