const norm=s=>s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
const markets={receps:['player_receptions','receiving'],receptions:['player_receptions','receiving'],'rush yds':['player_rush_yds','rushing'],'rushing yards':['player_rush_yds','rushing'],'receiving yards':['player_reception_yds','receiving'],'rec yds':['player_reception_yds','receiving'],'pass yds':['player_pass_yds','passing'],'passing yards':['player_pass_yds','passing'],'passing tds':['player_pass_tds','passing'],points:['player_points','points'],rebounds:['player_rebounds','rebounds'],assists:['player_assists','assists'],hits:['batter_hits','hits'],'home runs':['batter_home_runs','home_runs'],strikeouts:['pitcher_strikeouts','strikeouts'],'shots on goal':['player_shots_on_goal','shots']};
const categories={nfl:['passing','rushing','receiving','touchdowns'],cfb:['passing','rushing','receiving','touchdowns'],nba:['points','rebounds','assists'],cbb:['points','rebounds','assists'],mlb:['hits','home_runs','strikeouts'],nhl:['shots','points','assists']};
export function parseSlip(text,sport){
 const parts=text.split(/[,;\n]+/).map(s=>s.trim()).filter(Boolean);if(!parts.length||parts.length>12)throw Error('Paste 1-12 picks separated by commas or new lines.');
 return parts.map(raw=>{let m;if((m=raw.match(/^(.+?)\s+(?:attd|anytime\s+(?:td|touchdown))$/i)))return check({raw,player:m[1],market:'player_anytime_td',category:'touchdowns',outcome:'yes',point:null});
 if((m=raw.match(/^(.+?)\s+(?:ml|moneyline)$/i)))return {raw,player:m[1],market:'h2h',category:'moneyline',point:null};
 if((m=raw.match(/^(.+?)\s+(over|under)\s+(\d+(?:\.\d+)?)\s+(.+)$/i))){const entry=markets[norm(m[4])];if(entry)return check({raw,player:m[1],market:entry[0],category:entry[1],outcome:m[2].toLowerCase(),point:Number(m[3])});}
 throw Error('Unrecognized pick: '+raw.slice(0,100)+'. Use Player ATTD, Player over 2.5 receps, Player over 48.5 rush yds, or Team ML.');
 function check(p){if(!categories[sport]?.includes(p.category))throw Error('That market is not supported for the selected sport.');return p;}
 });
}
export async function matchSlip(slate,text,sport,filter){
 const picks=parseSlip(text,sport),pools=new Map(),coverage=[];
 for(const category of new Set(picks.map(p=>p.category))){const data=await slate(sport,category,filter);pools.set(category,data.rows);coverage.push(`${category}: ${data.covered}/${data.games} games; ${data.failures.length} failed requests`);}
 const results=picks.map(p=>{const wanted=norm(p.player)==='jsn'?'jaxon smith njigba':norm(p.player);const candidates=pools.get(p.category).filter(q=>{const actual=norm(p.market==='h2h'?q.name:q.description||'');return (actual===wanted||actual.split(' ').at(-1)===wanted)&&q.market===p.market&&(!p.outcome||q.name.toLowerCase()===p.outcome)&&(p.point===null||q.point===p.point);});const unique=[...new Map(candidates.map(q=>[q.id,q])).values()];return {raw:p.raw,candidates:unique};});
 const ready=results.every(r=>r.candidates.length===1);const legs=ready?results.map(r=>r.candidates[0]):[];if(ready&&new Set(legs.map(q=>q.id)).size!==legs.length)throw Error('Duplicate selections found. Remove duplicates and retry.');
 return {results,legs,ready,coverage};
}
