import {assertFresh,parlayWarnings} from '../core.js';
export const MODEL_VERSION='market-baseline-v1';
export const FACTORS={nfl:['QB availability','offensive/defensive efficiency','injuries','rest/travel','strength of schedule','turnovers','game total'],nba:['net/offensive/defensive rating','pace','lineup','back-to-back','rest/travel'],mlb:['starting pitcher','bullpen workload','handedness splits','park/weather','offense'],nhl:['confirmed goalie','goalie performance','expected goals','special teams','rest/travel']};
export function implied(a){if(!Number.isFinite(a)||Math.abs(a)<100)throw Error('Invalid American odds');return a>0?100/(a+100):-a/(-a+100);}
export function decimal(a){return a>0?1+a/100:1+100/-a;}
export function rank(quotes,sport){
 const fresh=quotes.filter(q=>{try{assertFresh(q);implied(q.price);return true;}catch{return false;}});
 return fresh.map(q=>{
  const peers=fresh.filter(x=>x.event===q.event&&x.book===q.book&&x.market===q.market&&x.description===q.description&&x.point===q.point);
  const sum=peers.reduce((v,x)=>v+implied(x.price),0);const complete=peers.length>=2&&new Set(peers.map(x=>x.name)).size===peers.length;
  const marketProbability=complete?implied(q.price)/sum:null;
  return {...q,impliedProbability:implied(q.price),marketProbability,modelProbability:null,edge:null,projection:null,historicalAverage:null,recentAverage:null,score:Math.round((marketProbability??implied(q.price))*100),scoreBasis:'Market probability ranking only; not predictive strength or value',modelVersion:MODEL_VERSION,missingFactors:FACTORS[sport]||['player usage','injuries','opponent matchup'],reason:complete?'Price normalized against available opposing outcomes. No independent model estimate.':'Opposing outcomes unavailable; score uses raw implied probability including bookmaker margin.',riskFlags:['Uncalibrated market baseline','Structured statistical inputs unavailable']};
 }).sort((a,b)=>(b.score??-1)-(a.score??-1)||a.id.localeCompare(b.id));
}
export function buildParlay(rows,count,allowCorrelated=false,requiredCategories=[]){
 if(!Number.isInteger(count)||count<2||count>12)throw Error('Choose 2-12 legs');
 // Spread candidates across price bands so ticket construction is not just largest favorites.
 const buckets=[rows.filter(q=>q.price<=-200),rows.filter(q=>q.price>-200&&q.price<100),rows.filter(q=>q.price>=100&&q.price<250),rows.filter(q=>q.price>=250)];
 const pool=[];for(let n=0;n<Math.max(...buckets.map(b=>b.length));n++)for(const b of buckets)if(b[n])pool.push(b[n]);
 const required=[...new Set(requiredCategories)];
 const missing=required.filter(c=>!rows.some(q=>q.category===c));if(missing.length)throw Error('No eligible current selections for: '+missing.join(', ')+'. These categories were not returned by the sportsbook, or provider requests failed. Try fewer categories or another book/date.');
 if(required.length>count)throw Error('Choose at least one leg per selected category.');
 const compatible=(chosen,q)=>!chosen.some(x=>x.id===q.id||x.event===q.event&&(!allowCorrelated||x.market===q.market&&x.description===q.description));
 function seed(index,chosen){if(index===required.length)return chosen;for(const q of pool.filter(q=>q.category===required[index])){if(!compatible(chosen,q))continue;const found=seed(index+1,[...chosen,q]);if(found)return found;}return null;}
 const selected=seed(0,[]);if(!selected)throw Error(allowCorrelated?'Cannot include all selected categories without conflicting selections. Choose fewer categories or another slate.':'The selected categories cannot fit into different games. Rerun /prop-parlay with same_game:true to allow several legs from one matchup, or choose another slate.');
 for(const q of pool){if(selected.length===count)break;if(q.score===null)continue;if(selected.some(x=>x.id===q.id||x.event===q.event&&(!allowCorrelated||x.market===q.market&&x.description===q.description)))continue;selected.push(q);if(selected.length===count)break;}
 if(selected.length<count)throw Error(`Only ${selected.length} eligible selections ${allowCorrelated?'without conflicting markets':'from distinct games'}; requested ${count}. ${allowCorrelated?'Try fewer legs or another slate.':'For /prop-parlay, use same_game:true to allow several legs per game.'}`);
 selected.forEach(q=>assertFresh(q));parlayWarnings(selected);
 const independent=new Set(selected.map(q=>q.event)).size===selected.length;
 const d=selected.reduce((v,q)=>v*decimal(q.price),1);
 return {legs:selected,estimatedAmericanOdds:independent?Math.round(d>=2?(d-1)*100:-100/(d-1)):null,combinedProbability:null,warning:!independent?'Same-game legs may be correlated or unavailable as a combination. Check your sportsbook for the actual parlay price. No combined win probability or value claim.':'Estimated Parlay Odds only. Assumes multiplying standalone prices, not a sportsbook quote. Final sportsbook price may differ. No combined win probability or value claim.'};
}
