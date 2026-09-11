import {readFileSync} from 'node:fs';
import {parseEnv} from 'node:util';
import {REST,Routes,PermissionFlagsBits as P} from 'discord.js';
import {newsConfig} from './news-config.js';
import {newsCommands} from './news-commands.js';
import {openStore} from './store.js';
const env=newsConfig();
const news=new REST({version:'10'}).setToken(env.DISCORD_BOT_TOKEN);
try{
  const identity=await news.get(Routes.user('@me'));
  if(identity.id!==env.DISCORD_APPLICATION_ID)throw new Error('News token identity mismatch');
  const oldEnv=parseEnv(readFileSync('.env','utf8'));
  const old=new REST({version:'10'}).setToken(oldEnv.DISCORD_BOT_TOKEN);
  const league=openStore(oldEnv.DATABASE_PATH),store=openStore(env.DATABASE_PATH);
  try{
    for(const key of ['memberRole','adminRole','alerts','channels:nfl','channels:cfb','channels:cbb','channels:mlb']){
      const value=league.get(key);if(!value)throw new Error('Run Analyst /setup before installing News Desk');store.set(key,value);
    }
    const ids=['nfl','cfb','cbb','mlb'].flatMap(s=>Object.values(store.get('channels:'+s)));
    ids.push(store.get('alerts'));
    for(const id of ids)await old.put(Routes.channelPermission(id,identity.id),{body:{type:1,allow:String(P.ViewChannel|P.SendMessages|P.EmbedLinks|P.ReadMessageHistory),deny:'0'}});
    await news.put(Routes.applicationGuildCommands(env.DISCORD_APPLICATION_ID,env.DISCORD_GUILD_ID),{body:newsCommands});
    for(const s of ['nfl','cfb','cbb','mlb'])if(store.get('enabled:'+s)===null)store.set('enabled:'+s,true);
    console.log('News Desk commands registered; channel access granted; new headline feeds enabled.');
  }finally{league.db.close();store.db.close();}
}catch(e){console.error(JSON.stringify({error:'News Desk installation failed',code:e.code||'configuration-or-access'}));process.exitCode=1;}
