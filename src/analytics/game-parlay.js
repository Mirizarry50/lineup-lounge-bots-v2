import {BOOK,BOOKS} from '../core.js';
import {exactDay,easternDay} from './dates.js';
import {rank,buildParlay} from './model.js';

export async function gameParlay(api,history,sport,options={}){
 const date=exactDay(options.from),book=options.book||BOOK;
 const markets=[...new Set((options.markets||'h2h').split(','))];
 if(!Object.hasOwn(BOOKS,book)||markets.some(m=>!['h2h','spreads','totals'].includes(m)))throw Error('Choose a supported sportsbook and game market.');
 const count=options.legs||4;
 if(count<markets.length)throw Error('Choose at least one leg per selected market type.');
 const games=(await api.events(sport)).filter(g=>Date.parse(g.commence_time)>Date.now()&&easternDay(g.commence_time)===date);
 if(!games.length)throw Error(`No unstarted ${sport.toUpperCase()} games on ${date} (Eastern time). Choose another date.`);
 const ids=new Set(games.map(g=>g.id));
 const quotes=(await api.odds(sport,undefined,markets.join(','),book)).filter(q=>ids.has(q.event)&&q.book===book&&markets.includes(q.market)&&easternDay(q.starts)===date&&(q.market==='h2h'||Number.isFinite(q.point)));
 history.capture(sport,quotes);
 const rows=rank(quotes,sport).map(q=>({...q,category:q.market}));
 const missing=markets.filter(m=>!rows.some(q=>q.category===m));
 if(missing.length)throw Error(`No current ${missing.join(', ')} lines from ${BOOKS[book]} on ${date}. Try another book/date or fewer market types.`);
 if(new Set(rows.map(q=>q.event)).size<count)throw Error(`Not enough distinct games with current lines for ${count} legs. Choose fewer legs or another date.`);
 return {...buildParlay(rows,count,false,markets),date,markets};
}
