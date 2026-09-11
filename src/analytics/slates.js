import {exactDay,easternDay} from './dates.js';
import {BOOK,BOOKS} from '../core.js';
import {rank} from './model.js';
export const MARKETS={points:['player_points'],rebounds:['player_rebounds'],assists:['player_assists'],hits:['batter_hits'],home_runs:['batter_home_runs'],strikeouts:['pitcher_strikeouts'],shots:['player_shots_on_goal'],passing:['player_pass_yds','player_pass_tds','player_pass_completions','player_pass_attempts','player_pass_interceptions'],rushing:['player_rush_yds','player_rush_attempts','player_rush_reception_yds'],receiving:['player_reception_yds','player_receptions','player_reception_longest'],touchdowns:['player_anytime_td'],nba:['player_points','player_rebounds','player_assists'],mlb:['batter_hits','batter_home_runs','pitcher_strikeouts'],nhl:['player_shots_on_goal','player_points','player_assists']};
export function slateService(api,history){return async(sport,category='moneyline',filter={})=>{
 const book=filter.book||BOOK;if(!Object.hasOwn(BOOKS,book))throw Error('Choose a supported sportsbook.');
 const games=await api.events(sport);const from=filter.exactDate?exactDay(filter.from):filter.from||new Date().toISOString().slice(0,10);const end=new Date(from+'T00:00:00Z');if(!/^\d{4}-\d{2}-\d{2}$/.test(from)||!Number.isFinite(+end)||end.toISOString().slice(0,10)!==from)throw Error('Use a valid YYYY-MM-DD date');end.setUTCDate(end.getUTCDate()+7);
 const eligible=games.filter(g=>Date.parse(g.commence_time)>Date.now()&&(filter.exactDate?easternDay(g.commence_time)===from:g.commence_time>=from&&Date.parse(g.commence_time)<+end)&&(!filter.game||`${g.home_team} ${g.away_team}`.toLowerCase().includes(filter.game.toLowerCase())));
 if(category==='moneyline'){const quotes=(await api.odds(sport,undefined,'h2h',book)).filter(q=>eligible.some(g=>g.id===q.event));history.capture(sport,quotes);return {rows:rank(quotes,sport),games:eligible.length,covered:new Set(quotes.map(q=>q.event)).size,failures:[],from};}
 const markets=MARKETS[category]||MARKETS[sport];if(!markets)throw Error('Unsupported prop category');const quotes=[],failures=[];
 // Sequential event requests bound concurrency; provider cache shares each event/market fetch.
 for(const g of eligible){try{const q=await api.odds(sport,g.id,markets.join(','),book);quotes.push(...q.filter(x=>!filter.exactDate||x.event===g.id&&easternDay(x.starts)===from));}catch{failures.push(g.id);}}
 history.capture(sport,quotes);return {rows:rank(quotes.filter(q=>!filter.player||q.description.toLowerCase().includes(filter.player.toLowerCase())),sport),games:eligible.length,covered:new Set(quotes.map(q=>q.event)).size,failures,from};
 };}
