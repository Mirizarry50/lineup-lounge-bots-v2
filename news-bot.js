import {Client,GatewayIntentBits,PermissionFlagsBits as P,MessageFlags as F} from 'discord.js';
import {newsConfig} from './news-config.js';
import {openStore} from './store.js';
import {providers,PublicError} from './providers.js';
import {researcher,splitMessages} from './research.js';
import {SPORTS,easternDate} from './core.js';

const env=newsConfig(),store=openStore(env.DATABASE_PATH);
if(!env.DISCORD_BOT_TOKEN||!env.DISCORD_APPLICATION_ID||!env.DISCORD_GUILD_ID)throw new Error('News Desk identity settings are missing from .env.news.');
const client=new Client({intents:[GatewayIntentBits.Guilds],allowedMentions:{parse:[]}});
const feeds=providers({},store); // News-only: no odds key or SportsDataIO credentials are supplied.
const research=researcher(env,store);
const busy=new Set(),last=new Map();
async function send(channel,text){for(const content of splitMessages(text))await channel.send({content,allowedMentions:{parse:[]},flags:F.SuppressEmbeds});}
client.on('interactionCreate',async i=>{
  if(!i.isChatInputCommand())return;
  if(i.guildId!==env.DISCORD_GUILD_ID)return i.reply({content:'This bot belongs to another server.',flags:F.Ephemeral});
  const roles=i.member?.roles;
  const hasRole=id=>Boolean(id)&&(Array.isArray(roles)?roles.includes(id):roles?.cache?.has(id));
  const admin=hasRole(store.get('adminRole'));
  if(!admin&&!hasRole(store.get('memberRole')))return i.reply({content:'A F.L.E.A Member role is required.',flags:F.Ephemeral});
  if(i.commandName==='news-feed'&&!admin)return i.reply({content:'Commissioner permission is required.',flags:F.Ephemeral});
  if(busy.has(i.user.id)||(last.get(i.user.id)||0)>Date.now())return i.reply({content:'Please wait before another request.',flags:F.Ephemeral});
  busy.add(i.user.id);last.set(i.user.id,Date.now()+15_000);
  let stage='acknowledge';
  try{
    await i.deferReply({flags:F.Ephemeral});
    stage='build-response';
    const sport=i.options.getString('sport');let text;
    switch(i.commandName){
      case 'headlines':text=(await feeds.news(sport)).slice(0,5).map(n=>`**ESPN · ${SPORTS[sport].name}**\n[${n.category}] ${n.title}\n${n.link}\n${n.published}`).join('\n\n') || 'No recent stats or injury updates are available. Check back later.';break;
      case 'research':text=await research(sport,i.options.getString('topic'),i.options.getString('source')||'all');break;
      case 'news-feed':store.set('enabled:'+sport,i.options.getBoolean('enabled'));store.audit(i.user.id,'news-feed:'+sport+':'+i.options.getBoolean('enabled'));text=`${SPORTS[sport].name} stats and injury feed ${i.options.getBoolean('enabled')?'enabled':'paused'}.`;break;
      default:text='**News Desk · news-only mode**\n'+Object.entries(SPORTS).map(([s,v])=>`${v.name}: ${store.get('enabled:'+s)?'stats and injuries enabled':'paused'}`).join('\n')+`\nAI configured: ${Boolean(env.OPENAI_API_KEY&&env.OPENAI_MODEL)}. /research searches ESPN, Yahoo Sports and indexed X posts. It does not use the Odds API. Commands respond privately; share them in discussion rooms if desired.`;
    }
    stage='send-response';
    const [first,...rest]=splitMessages(text);await i.editReply({content:first,allowedMentions:{parse:[]},flags:F.SuppressEmbeds});
    for(const content of rest)await i.followUp({content,flags:F.Ephemeral|F.SuppressEmbeds,allowedMentions:{parse:[]}});
  }catch(e){
    // Never log credentials, request bodies, or user input.
    const code=String(e?.code??e?.cause?.code??'unknown').replace(/[^A-Za-z0-9_-]/g,'').slice(0,80);
    console.error(JSON.stringify({event:'news-command-failed',command:i.commandName,stage,code}));
    const content=e instanceof PublicError?e.message:`News Desk failed at ${stage} (code: ${code}). Please share this code with the commissioner.`;
    const payload={content,allowedMentions:{parse:[]}};
    if(i.deferred||i.replied)await i.editReply(payload).catch(()=>{});
    else await i.reply({...payload,flags:F.Ephemeral}).catch(()=>{});
  }
  finally{busy.delete(i.user.id);}
});
let ticking=false;
async function tick(){
  if(ticking||!client.isReady())return;ticking=true;
  try{for(const [sport,s] of Object.entries(SPORTS)){
    if(!store.get('enabled:'+sport))continue;
    try{
      const channelId=store.get('channels:'+sport)?.feed;if(!channelId)continue;
      const channel=await client.channels.fetch(channelId);
      const items=await feeds.news(sport);
      const fresh=items.filter(n=>!store.sent('news:'+sport+':'+n.link)&&Date.parse(n.published)>Date.now()-48*3600_000).slice(0,1);
      for(const n of fresh){await send(channel,`**${s.name} · ESPN**\n[${n.category}] ${n.title}\n${n.link}\n${n.published}`);store.mark('news:'+sport+':'+n.link);}
      console.log(JSON.stringify({event:'news-cycle',sport,posted:fresh.length}));
    }catch{console.error(JSON.stringify({event:'news-cycle-failed',sport}));const key='error:'+sport+':'+easternDate();if(store.get('alerts')&&!store.sent(key)){const c=await client.channels.fetch(store.get('alerts')).catch(()=>null);if(c){await send(c,`News Desk ${s.name} stats and injury feed failed. Check channel permissions or provider availability.`).catch(()=>{});store.mark(key);}}}
  }store.prune();for(const [id,until] of last)if(until<Date.now())last.delete(id);}
  finally{ticking=false;}
}
client.once('clientReady',()=>{if(client.user.id!==env.DISCORD_APPLICATION_ID){console.error('News Desk token belongs to a different application.');client.destroy();clearInterval(timer);process.exitCode=1;return;}console.log('F.L.E.A News Desk connected in STATS AND INJURIES mode.');tick().catch(()=>{});});
client.on('error',()=>console.error('News Desk Discord connection error.'));
const timer=setInterval(()=>tick().catch(()=>{}),15*60_000);
for(const sig of ['SIGTERM','SIGINT'])process.on(sig,()=>{clearInterval(timer);client.destroy();store.db.close();process.exit(0);});
try{await client.login(env.DISCORD_BOT_TOKEN);}catch{clearInterval(timer);console.error('News Desk login failed.');process.exitCode=1;}
