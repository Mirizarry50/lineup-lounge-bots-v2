import {BOOKS} from '../core.js';
const labels={player_pass_yds:'pass yds',player_pass_tds:'passing TDs',player_pass_completions:'completions',player_pass_attempts:'pass attempts',player_pass_interceptions:'interceptions',player_rush_yds:'rush yds',player_rush_attempts:'rush attempts',player_rush_reception_yds:'rush + receiving yds',player_reception_yds:'receiving yds',player_receptions:'receptions',player_reception_longest:'longest reception yds',player_points:'points',player_rebounds:'rebounds',player_assists:'assists',batter_hits:'hits',batter_home_runs:'home runs',pitcher_strikeouts:'strikeouts',player_shots_on_goal:'shots on goal'};
const clean=v=>String(v??'').replace(/[`\r\n]/g,' ').replace(/@/g,'').replace(/\s+/g,' ').trim().slice(0,80);
export function shareLeg(q){
 const name=clean(q.description||q.name),outcome=clean(q.name),point=q.point==null?'':String(q.point);
 if(q.market==='h2h')return `${clean(q.name)} ML`;
 if(q.market==='player_anytime_td')return `${name} ${outcome.toLowerCase()==='yes'?'ATTD':outcome.toLowerCase()==='no'?'no anytime TD':outcome}`;
 return `${name} ${outcome.toLowerCase()} ${point} ${labels[q.market]||clean(q.market).replaceAll('_',' ')}`.replace(/\s+/g,' ').trim();
}
export function shareMessages(legs){
 const chunks=[];let current='';for(const leg of legs){const text=shareLeg(leg);if(current.length+text.length>1700){chunks.push(current);current='';}current+=(current?', ':'')+text;}if(current)chunks.push(current);
 const books=[...new Set(legs.map(q=>BOOKS[q.book]||'Unknown sportsbook'))].join(', ');
 return chunks.map((text,n)=>`**Copy picks into chat${chunks.length>1?` (${n+1}/${chunks.length})`:''}**\n${books} | Selection summary; verify current lines.\n\`\`\`text\n${text}\n\`\`\``);
}
