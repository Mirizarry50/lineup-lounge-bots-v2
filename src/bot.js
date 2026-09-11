import {installScreenshots} from './screenshots/discord.js';
import { installAnalytics } from './analytics/discord.js';
import { onboarding } from './onboarding.js';
import { memberAccess } from './member-access.js';
import { Client, GatewayIntentBits, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { SPORTS, BOOK, BOOKS, quoteLine, clean, easternDate, easternHour } from './core.js';
import { openStore } from './store.js';
import { providers, PublicError } from './providers.js';
import { setup } from './setup.js';
import { splitMessages } from './research.js';

const env=process.env;
for (const k of ['DISCORD_BOT_TOKEN','DISCORD_GUILD_ID']) if (!env[k]) throw new Error(`Missing ${k}. Configure .env before starting.`);
const store=openStore(env.DATABASE_PATH);
const api=providers(env,store);
const client=new Client({intents:[GatewayIntentBits.Guilds,GatewayIntentBits.GuildMembers,...(env.SCREENSHOT_AUTO_DETECT==='true'?[GatewayIntentBits.GuildMessages,GatewayIntentBits.MessageContent]:[])],allowedMentions:{parse:[]}});
const analyticsNames=installAnalytics(client,store,api,env);
onboarding(client,store,api,env);
installScreenshots(client,store,api,env);
const stopMemberAccess=memberAccess(client,store,env.DISCORD_GUILD_ID);
const running=new Set();
const cooldown=new Map();
let ticking=false;
const adminCommands=new Set(['setup','feed','status','map-team']);
const chunks=splitMessages;
async function send(channel,text) { for(const content of chunks(text)) await channel.send({content,allowedMentions:{parse:[]},flags:MessageFlags.SuppressEmbeds}); }

client.on('interactionCreate',async i=>{
  if(!i.isChatInputCommand()||['onboarding','analyze-image'].includes(i.commandName)||analyticsNames.has(i.commandName)) return;
  if(i.guildId!==env.DISCORD_GUILD_ID) return i.reply({content:'This bot is restricted to its configured server.',flags:MessageFlags.Ephemeral});
  const isAdmin=i.member.roles.cache.has(store.get('adminRole'));
  const isMember=isAdmin||i.member.roles.cache.has(store.get('memberRole'));
  if(!isMember || (adminCommands.has(i.commandName)&&!isAdmin)) return i.reply({content:'Your role does not allow this command.',flags:MessageFlags.Ephemeral});
  if(running.has(i.user.id)||(cooldown.get(i.user.id)||0)>Date.now()) return i.reply({content:'Please wait a few seconds before another command.',flags:MessageFlags.Ephemeral});
  running.add(i.user.id); cooldown.set(i.user.id,Date.now()+10_000);
  try {
    await i.deferReply({flags:MessageFlags.Ephemeral});
    const sport=i.options.getString('sport');
    let output;
    switch(i.commandName) {
      case 'help': output='**F.L.E.A Analytics**\nANALYSIS: /flea /moneyline /props /parlay /prop-parlay\nNFL: /td slate /td player /td leaderboard\nOTHER SPORTS: /ml nba /ml mlb /ml nhl\nRESULTS: /history /results /model\nLEAGUE: /pick\nCOMMISSIONER: /admin /feed /setup /status /map-team\n/games → /odds → /analyze (one selection or up to 12 parlay legs from one sportsbook). /analyze automatically researches the matchup using ESPN, Yahoo Sports and available indexed X posts, then assesses your exact odds with cited sources. SportsDataIO is optional. /news links to headlines; /stats is the optional SportsDataIO feed. Commands respond privately. Share useful results in your sport’s discussion room. Each person decides independently whether to wager.'; break;
      case 'setup': output=await setup(i.guild,store); break;
      case 'feed': store.set(`enabled:${sport}`,i.options.getBoolean('enabled')); output=`${SPORTS[sport].name} scheduled posts ${i.options.getBoolean('enabled')?'enabled':'paused'}.`; break;
      case 'status': output=Object.entries(SPORTS).map(([s,v])=>`${v.name}: ${store.get(`enabled:${s}`)?'enabled':'paused'}; channels ${store.get(`channels:${s}`)?'configured':'missing'}`).join('\n')+`\nOdds key: ${!!env.ODDS_API_KEY}; AI configured: ${!!env.OPENAI_API_KEY&&!!env.OPENAI_MODEL}; production stats enabled: ${env.SPORTSDATA_PRODUCTION==='true'}`; break;
      case 'map-team': {
        const data=await api.stats(sport), id=i.options.getInteger('id');
        if(!data.rows.some(r=>r.TeamID===id)) throw new PublicError('TeamID not found in this sport’s current season stats.');
        store.set(`aliases:${sport}`,{...(store.get(`aliases:${sport}`)||{}),[i.options.getString('name')]:id}); output='Team mapping saved.'; break;
      }
      case 'games': {
        const q=await api.odds(sport,undefined,'h2h',i.options.getString('book')||BOOK);
        const events=[...new Map(q.map(x=>[x.event,x])).values()].slice(0,20);
        output=events.length?events.map(x=>`${clean(x.game)} · ${x.starts}\nEvent: \`${x.event}\``).join('\n\n'):'No upcoming games with moneylines from the selected sportsbooks. Coverage may be unavailable or out of season.'; break;
      }
      case 'odds': {
        const book=i.options.getString('book')||BOOK;
        const q=await api.odds(sport,i.options.getString('event'),i.options.getString('market')||'h2h',book);
        const page=i.options.getInteger('page')||1;
        const requested=book==='all'?Object.keys(BOOKS):[book];
        const coverage=requested.map(b=>`${BOOKS[b]}: ${q.some(x=>x.book===b)?'available':'not returned'}`).join(' · ');
        if(q.length && (page-1)*8>=q.length) throw new PublicError('That page is unavailable. Start with page 1.');
        output=`**${book==='all'?'Sportsbook comparison':BOOKS[book]}**\n${coverage}\n`+(q.length?`Page ${page}/${Math.ceil(q.length/8)}\n`+q.slice((page-1)*8,page*8).map(x=>`${quoteLine(x)}\nQuote: \`${x.id}\` · updated ${x.updated}`).join('\n\n'):'No selections returned for this market.')+'\n\nLines and points can differ. These feeds do not establish sportsbook availability in your location.'; break;
      }
      case 'news': output=(await api.news(sport)).slice(0,5).map(n=>`**ESPN:** [${n.category}] ${n.title}\n${n.link}\n${n.published}`).join('\n\n') || 'No recent stats or injury updates are available. Check back later.'; break;
      case 'stats': {
        const s=await api.stats(sport), term=i.options.getString('team').toLowerCase();
        const rows=s.rows.filter(r=>[r.TeamID,r.Name,r.TeamName,r.Team].some(v=>String(v).toLowerCase()===term));
        if(rows.length!==1) throw new PublicError('No unique match. Use the exact SportsDataIO team code or TeamID.');
        output=`SportsDataIO · season ${s.season} · retrieved ${s.retrieved}\n`+Object.entries(rows[0]).filter(([k,v])=>v!==null&&!/Fantasy|Global|Opponent|StatID/.test(k)).slice(0,35).map(([k,v])=>`${k}: ${clean(v,80)}`).join('\n'); break;
      }
      case 'analyze': output=await api.analyze(sport,i.options.getString('quotes').split(',').map(x=>x.trim()).filter(Boolean)); break;
      default: output='Unknown command. Use /help.';
    }
    if(adminCommands.has(i.commandName)) store.audit(i.user.id,i.commandName);
    const [first,...rest]=chunks(output);
    await i.editReply({content:first,allowedMentions:{parse:[]},flags:MessageFlags.SuppressEmbeds});
    for(const content of rest) await i.followUp({content,flags:MessageFlags.Ephemeral|MessageFlags.SuppressEmbeds,allowedMentions:{parse:[]}});
  } catch(e) {
    await i.editReply({content:e instanceof PublicError || /Sportsbook odds|game has started|repeated quote/.test(e.message) ? e.message : 'Command failed. Check provider access, channel permissions, and configuration; then retry.',allowedMentions:{parse:[]}}).catch(()=>{});
  } finally {running.delete(i.user.id);}
});

async function tick() {
  if(ticking||!client.isReady()) return;
  ticking=true;
  try {
    for(const sport of Object.keys(SPORTS)) {
      if(!store.get(`enabled:${sport}`)) continue;
      try {
        const channels=store.get(`channels:${sport}`);
        if(!channels) continue;
        const channel=await client.channels.fetch(channels.feed);
        const headlines=await api.news(sport);
        const unseen=headlines.filter(n=>!store.sent(`news:${sport}:${n.link}`)&&Date.parse(n.published)>Date.now()-48*3600_000).slice(0,3);
        for(const n of unseen) {
          await send(channel,`**${SPORTS[sport].name} · ESPN**\n[${n.category}] ${n.title}\n${n.link}\n${n.published}`);
          store.mark(`news:${sport}:${n.link}`);
        }
        const daily=`brief:${sport}:${easternDate()}`;
        if(easternHour()>=9 && !store.sent(daily)) {
          const odds=await api.odds(sport);
          const game=odds.find(q=>Date.parse(q.starts)-Date.now()<36*3600_000);
          if(game) {
            const text=await api.analyze(sport,[game.id]);
            await send(channel,`**Daily matchup spotlight**\nSelection chosen by feed order, not a ranking or recommendation.\n${text}`);
          } else await send(channel,`${SPORTS[sport].name}: no Florida moneyline matchup available in the next 36 hours.`);
          store.mark(daily);
        }
      } catch {
        const key=`error:${sport}:${easternDate()}`;
        if(!store.sent(key) && store.get('alerts')) {
          const c=await client.channels.fetch(store.get('alerts')).catch(()=>null);
          if(c) { await send(c,`${SPORTS[sport].name} feed needs attention. Check configured API keys, quota, provider availability, and permissions. Posts will retry on the next cycle.`).catch(()=>{}); store.mark(key); }
        }
      }
    }
    store.prune();
    for(const [id,until] of cooldown) if(until<Date.now()) cooldown.delete(id);
  } finally {ticking=false;}
}
client.once('clientReady',()=>{console.log('F.L.E.A connected. Scheduled feeds follow saved settings.'); tick().catch(()=>{});});
client.on('error',()=>console.error('Discord connection error; checking connection.'));
const timer=setInterval(()=>tick().catch(()=>{}),15*60_000);
for(const signal of ['SIGTERM','SIGINT']) process.on(signal,()=>{clearInterval(timer);stopMemberAccess();client.destroy();store.db.close();process.exit(0);});
try {await client.login(env.DISCORD_BOT_TOKEN);} catch {clearInterval(timer);console.error('Discord login failed. Check bot token and connectivity.');process.exitCode=1;}
