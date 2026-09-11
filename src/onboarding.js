import {ActionRowBuilder,StringSelectMenuBuilder,ButtonBuilder,ButtonStyle,MessageFlags as F,PermissionFlagsBits as P} from 'discord.js';
import {randomUUID} from 'node:crypto';
import {SPORTS,BOOKS,quoteLine} from './core.js';
import {researcher,splitMessages} from './research.js';
import {PublicError} from './errors.js';
export function onboarding(client,store,api,env,researchOverride){
 const sessions=new Map(),busy=new Set(),last=new Map();
 const research=researchOverride||researcher({...env,OPENAI_MODEL:env.ANALYSIS_RESEARCH_MODEL||'gpt-5-mini'},store);
 const row=component=>new ActionRowBuilder().addComponents(component);
 const select=(id,options)=>row(new StringSelectMenuBuilder().setCustomId('ob:'+id).addOptions(options));
 const options=map=>Object.entries(map).map(([value,label])=>({label:String(label).slice(0,100),value}));
 const button=(label,id)=>row(new ButtonBuilder().setCustomId('ob:'+id).setLabel(label).setStyle(ButtonStyle.Primary));
 async function show(i,content,components=[]){await i.editReply({content,components,allowedMentions:{parse:[]}});}
 async function output(i,text){const parts=splitMessages(text);await show(i,parts[0]);for(const content of parts.slice(1))await i.followUp({content,flags:F.Ephemeral,allowedMentions:{parse:[]}});}
 client.on('interactionCreate',async i=>{
  const start=i.isChatInputCommand()&&i.commandName==='onboarding'||i.isButton()&&i.customId==='ob:start';
  if(!start&&!((i.isButton()||i.isStringSelectMenu())&&i.customId.startsWith('ob:')))return;
  if(i.guildId!==env.DISCORD_GUILD_ID)return;
  const roles=i.member?.roles;const has=id=>Array.isArray(roles)?roles.includes(id):roles?.cache?.has(id);
  if(!has(store.get('memberRole'))&&!has(store.get('adminRole'))&&!i.memberPermissions?.has(P.ManageGuild))return i.reply({content:'You need the Member role. Ask a commissioner if it has not appeared yet.',flags:F.Ephemeral});
  if(busy.has(i.user.id))return i.reply({content:'Your previous step is still running. Please wait.',flags:F.Ephemeral});
  busy.add(i.user.id);
  try{
   if(start){
    if((last.get(i.user.id)||0)>Date.now())return await i.reply({content:'Wait a few seconds before restarting.',flags:F.Ephemeral});
    last.set(i.user.id,Date.now()+10000);
    const s={id:randomUUID(),owner:i.user.id,stage:'sport',expires:Date.now()+30*60000};sessions.set(i.user.id,s);
    await i.deferReply({flags:F.Ephemeral});await show(i,'**First-pick walkthrough · 1/6: Sport**\nResearch a single selection privately. No wager is placed, and passing is always an option. Choose a sport.',[select(s.id+':sport',options(Object.fromEntries(Object.entries(SPORTS).map(([k,v])=>[k,v.name]))))]);return;
   }
   const [,id,step]=i.customId.split(':');const s=sessions.get(i.user.id);
   if(!s||s.id!==id||s.stage!==step||s.expires<Date.now())return await i.reply({content:'This step expired or was already completed. Run /onboarding to start again.',flags:F.Ephemeral});
   await i.deferUpdate();const value=i.values?.[0];
   if(step==='sport'){
    if(!SPORTS[value])throw Error('Invalid sport');s.sport=value;s.stage='book';await show(i,'**2/6: Sportsbook**\nChoose the book you want to compare with your own account. Available data does not establish sportsbook availability in your location.',[select(s.id+':book',options(BOOKS))]);
   }else if(step==='book'){
    if(!BOOKS[value])throw Error('Invalid book');s.book=value;
    const q=await api.odds(s.sport,undefined,'h2h',s.book);s.games=[...new Map(q.filter(q=>Date.parse(q.starts)>Date.now()).map(q=>[q.event,q])).values()].slice(0,25);
    if(!s.games.length)throw new PublicError('No upcoming games returned. Run /onboarding and try another sport or book.');
    s.stage='game';await show(i,'**3/6: Game**\nChoose an upcoming matchup. Up to 25 games are shown.',[select(s.id+':game',s.games.map((q,n)=>({label:q.game.slice(0,100),value:String(n)})))]);
   }else if(step==='game'){
    const game=s.games[Number(value)];if(!game)throw Error('Invalid game');s.game=game;
    await show(i,'**4/6: Researching the matchup…**\nChecking published stats and injuries. This may take about a minute.');
    const report=await research(s.sport,`${game.game.slice(0,150)}: injuries, game availability and relevant published team statistics`,'all');
    await output(i,report);s.stage='market';await i.followUp({content:'**5/6: Choose a market**\nMoneyline: who wins. Spread: performance against a points handicap. Total: combined score over/under a line. Review the research above before choosing.',components:[select(s.id+':market',options({h2h:'Moneyline - game winner',spreads:'Spread - points handicap',totals:'Total - combined score'}))],flags:F.Ephemeral});
   }else if(step==='market'){
    if(!['h2h','spreads','totals'].includes(value))throw Error('Invalid market');
    s.quotes=(await api.odds(s.sport,s.game.event,value,s.book)).slice(0,25);
    if(!s.quotes.length)throw new PublicError('No lines returned for this market. Try another market using this menu.');
    s.stage='quote';await show(i,'**Choose one selection**\nCheck the line and price below. These are options, not recommendations.',[select(s.id+':quote',s.quotes.map((q,n)=>({label:`${q.name} ${q.point??''} (${q.price>0?'+':''}${q.price})`.slice(0,100),value:String(n)})))]);
   }else if(step==='quote'){
    const q=s.quotes[Number(value)];if(!q)throw Error('Invalid quote');s.quote=q;s.stage='analyze';
    await show(i,`**6/6: Review your selection**\n${quoteLine(q)}\n\nRun analysis to refresh the odds and assess supporting evidence, risks and missing information. No stake is selected and no wager is submitted.`,[button('Research and analyze this selection',s.id+':analyze')]);
   }else if(step==='analyze'){
    await show(i,'**Analyzing your selection…**\nRefreshing odds and checking cited research.');
    const report=await api.analyze(s.sport,[s.quote.id]);await output(i,report);s.stage='done';store.set('onboarding:completed:'+i.user.id,new Date().toISOString());
    await i.followUp({content:'**Walkthrough complete**\nYou can pass, research more, or copy the analysis into a discussion room. Verify current odds and player availability in your own sportsbook before independently deciding whether to wager. This bot does not place bets.\nUse /onboarding to practice again, or /games → /odds → /analyze for the usual workflow.',flags:F.Ephemeral});
   }
  }catch(e){await i.followUp({content:e instanceof PublicError?e.message:'This step could not finish. Run /onboarding to try again or ask a commissioner.',flags:F.Ephemeral,allowedMentions:{parse:[]}}).catch(()=>{});}
  finally{busy.delete(i.user.id);for(const [key,s]of sessions)if(s.expires<Date.now())sessions.delete(key);for(const [key,time]of last)if(time<Date.now())last.delete(key);}
 });
}
