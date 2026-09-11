import {PublicError} from '../errors.js';
import {assertFresh} from '../core.js';
export const MARKETS={receiving_yards:'player_reception_yds',receptions:'player_receptions',rushing_yards:'player_rush_yds',passing_yards:'player_pass_yds',passing_touchdowns:'player_pass_tds',anytime_touchdown:'player_anytime_td',first_touchdown:'player_1st_td',touchdowns:'player_tds_over',moneyline:'h2h',spread:'spreads',game_total:'totals',player_points:'player_points',player_assists:'player_assists',player_rebounds:'player_rebounds',hits:'batter_hits',home_runs:'batter_home_runs',strikeouts:'pitcher_strikeouts',shots_on_goal:'player_shots_on_goal'};
const normalize=s=>String(s||'').toLowerCase().normalize('NFKD').replace(/[.'’\-]/g,'').replace(/[^a-z0-9 ]/g,' ').replace(/\b(jr|sr|iii|ii|iv)\b/g,'').replace(/\s+/g,'').trim();
const teams={NE:'New England Patriots',SEA:'Seattle Seahawks',ARI:'Arizona Cardinals',ATL:'Atlanta Falcons',BAL:'Baltimore Ravens',BUF:'Buffalo Bills',CAR:'Carolina Panthers',CHI:'Chicago Bears',CIN:'Cincinnati Bengals',CLE:'Cleveland Browns',DAL:'Dallas Cowboys',DEN:'Denver Broncos',DET:'Detroit Lions',GB:'Green Bay Packers',HOU:'Houston Texans',IND:'Indianapolis Colts',JAX:'Jacksonville Jaguars',KC:'Kansas City Chiefs',LV:'Las Vegas Raiders',LAC:'Los Angeles Chargers',LAR:'Los Angeles Rams',MIA:'Miami Dolphins',MIN:'Minnesota Vikings',NO:'New Orleans Saints',NYG:'New York Giants',NYJ:'New York Jets',PHI:'Philadelphia Eagles',PIT:'Pittsburgh Steelers',SF:'San Francisco 49ers',TB:'Tampa Bay Buccaneers',TEN:'Tennessee Titans',WAS:'Washington Commanders'};
function teamName(t,sport){return ['nfl','cfb'].includes(sport)?teams[String(t).toUpperCase()]||t:t;}
export function gameMatches(hint,event,sport){if(!hint)return true;if(hint===event.id)return true;const codes=sport==='nfl'?String(hint).toUpperCase().match(/\b[A-Z]{2,3}\b/g)?.filter(x=>teams[x]):[];if(codes?.length>=2)return [...new Set(codes)].every(t=>normalize(event.away_team+' '+event.home_team).includes(normalize(teams[t])));const parts=hint.split(/\s+(?:vs\.?|at|@)\s+/i);const game=normalize(event.away_team+' '+event.home_team);return parts.every(t=>game.includes(normalize(teamName(t,sport))));}
export function adapter(leg){const base=Object.hasOwn(MARKETS,leg.market)?MARKETS[leg.market]:null;if(!base)throw new PublicError('Unsupported market: '+String(leg.market).slice(0,60)+'. Edit the leg or use another ticket.');
 let point=leg.line,outcome=leg.direction,market=base;
 if(outcome==='at_least'){if(!Number.isInteger(point)||point<1||['h2h','spreads','totals','player_anytime_td','player_1st_td'].includes(base))throw new PublicError('Cannot safely convert this alternate threshold.');point-=0.5;outcome='over';}
 if(['player_anytime_td','player_1st_td'].includes(base)){point=null;outcome=outcome||'yes';if(!['yes','no'].includes(outcome))throw new PublicError('Touchdown scorer direction must be yes or no.');}
 else if(base!=='h2h'&&(!Number.isFinite(point)||!['over','under'].includes(outcome)&&base!=='spreads'))throw new PublicError('A line and over/under direction are required.');
 const markets=base.startsWith('player_')&&!['player_anytime_td','player_1st_td','player_tds_over'].includes(base)&&leg.alternate_line?[base,base+'_alternate']:[base];
 return {markets,point,outcome};
}
export async function resolveTicket(api,draft){
 const {ticket,sport,book,from}=draft;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(from||'')||new Date(from+'T00:00:00Z').toISOString().slice(0,10)!==from)throw new PublicError('Set the actual game date (YYYY-MM-DD UTC) with Edit Legs. Today on an old screenshot is not a date.');
 const end=Date.parse(from+'T00:00:00Z')+7*86400000;
 const events=(await api.events(sport)).filter(e=>Date.parse(e.commence_time)>Date.now()&&e.commence_time>=from&&Date.parse(e.commence_time)<end);
 const result=[],coverage=[];const cache=new Map();
 for(const [index,leg] of ticket.legs.entries()){
  if(!leg.player&& !['game_total'].includes(leg.market))throw new PublicError(`Leg ${index+1} needs a player or team name.`);
  const a=adapter(leg),games=events.filter(e=>gameMatches(leg.game,e,sport));let quotes=[],failed=0;
  for(const e of games){for(const market of a.markets){const key=e.id+':'+market;if(!cache.has(key)){try{cache.set(key,await api.odds(sport,e.id,market,book));}catch{cache.set(key,null);}}const found=cache.get(key);if(found)quotes.push(...found);else failed++;}}
  quotes=quotes.filter(q=>{try{assertFresh(q);}catch{return false;}if(q.book!==book)return false;const player=leg.market==='moneyline'||leg.market==='spread'?q.name:q.description;const identity=leg.market==='game_total'||normalize(player)===normalize(teamName(leg.player,sport));return identity&&(a.point===null||q.point===a.point)&&(['moneyline','spread'].includes(leg.market)||q.name.toLowerCase()===a.outcome);});
  // Prefer standard/alternate representations of the same outcome without treating different events as identical.
  const unique=[...new Map(quotes.map(q=>[[q.event,q.book,normalize(q.description),q.name,q.point].join('|'),q])).values()];
  coverage.push({leg:index+1,games:games.length,failed});if(unique.length!==1)throw new PublicError(`Leg ${index+1}: ${unique.length?'multiple games match. Enter the exact event ID in the fifth Edit Legs field.':'no exact current line returned. Check the date, full name, game and line; it may be unsupported or expired.'} ${failed} provider requests failed. No selection was substituted.`);
  result.push(unique[0]);
 }
 if(new Set(result.map(q=>q.id)).size!==result.length)throw new PublicError('Duplicate legs found. Remove the repeated selection.');
 return {quotes:result,coverage};
}
export function editLines(ticket){return ticket.legs.map(l=>[l.player||'',l.market||'',l.direction||'',l.line??'',l.game||''].join(' | ')).join('\n');}
export function applyEdits(draft,lines){const legs=lines.split('\n').filter(s=>s.trim()).map(line=>{const p=line.split('|').map(x=>x.trim());if(p.length!==5)throw new PublicError('Use five fields per line: name | market | direction | line | game');const [player,market,direction,value,game]=p;const n=value===''?null:Number(value);if(value!==''&&!Number.isFinite(n))throw new PublicError('Line must be a number or blank.');return {player:player||null,team:null,opponent:null,market:market.toLowerCase().replaceAll(' ','_'),direction:direction.toLowerCase()||null,line:n,game:game||null,alternate_line:direction==='at_least',confidence:1};});if(!legs.length||legs.length>12)throw new PublicError('Use 1-12 legs.');legs.forEach(adapter);return {...draft,ticket:{...draft.ticket,legs,leg_count:legs.length},reviewed:true};}
