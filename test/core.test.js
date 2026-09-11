import test from 'node:test';
import assert from 'node:assert/strict';
import { quotesFrom,assertFresh,parlayWarnings,easternDate,easternHour,SPORTS,BOOK,BOOKS } from '../src/core.js';
import { openStore } from '../src/store.js';
import { providers } from '../src/providers.js';
import { commands } from '../src/commands.js';

const now=Date.parse('2026-09-09T18:00:00Z');
const fixture=(book=BOOK)=>[{id:'game1',home_team:'Home',away_team:'Away',commence_time:'2026-09-10T18:00:00Z',bookmakers:[{key:book,last_update:'2026-09-09T17:59:00Z',markets:[{key:'h2h',outcomes:[{name:'Home',price:-110},{name:'Away',price:105}]}]}]}];
test('six distinct sports; college football and basketball are separate',()=>{assert.equal(Object.keys(SPORTS).length,6);assert.notEqual(SPORTS.cfb.key,SPORTS.cbb.key);});
test('never substitute a non-Florida feed',()=>assert.deepEqual(quotesFrom(fixture('hardrockbet'),now),[]));
test('all three books retain distinct identities and unsupported books stay excluded',()=>{
 const f=fixture();f[0].bookmakers.push({...f[0].bookmakers[0],key:'fanduel'},{...f[0].bookmakers[0],key:'draftkings'},{...f[0].bookmakers[0],key:'hardrockbet'});
 const q=quotesFrom(f,now,Object.keys(BOOKS));assert.equal(q.length,6);assert.equal(new Set(q.map(x=>x.id)).size,6);
 assert.deepEqual(new Set(q.map(x=>x.book)),new Set(Object.keys(BOOKS)));
 assert.throws(()=>parlayWarnings([q[0],q[2]]),/one sportsbook/);
 assert.equal(quotesFrom(f,now,['fanduel']).length,2);
});
test('sportsbook choices are available on both discovery and odds commands',()=>{
 for(const name of ['games','odds'])assert.deepEqual(commands.find(c=>c.name===name).options.find(o=>o.name==='book').choices.map(c=>c.value),[...Object.keys(BOOKS),'all']);
});
test('past games excluded',()=>assert.deepEqual(quotesFrom(fixture(),now+3*86400000),[]));
test('stale, future timestamp, and started selections rejected',()=>{
 const q=quotesFrom(fixture(),now)[0];assertFresh(q,now);
 assert.throws(()=>assertFresh({...q,updated:'invalid'},now));
 assert.throws(()=>assertFresh({...q,updated:'2026-09-09T16:00:00Z'},now));
 assert.throws(()=>assertFresh({...q,updated:'2026-09-10T16:00:00Z'},now));
 assert.throws(()=>assertFresh({...q,starts:'2026-09-09T17:00:00Z'},now));
});
test('same-game parlays flagged and duplicate legs rejected',()=>{
 const q=quotesFrom(fixture(),now);assert.equal(parlayWarnings(q).length,1);assert.throws(()=>parlayWarnings([q[0],q[0]]));
});
test('Eastern scheduling adjusts for daylight saving',()=>{
 assert.equal(easternHour(new Date('2026-07-01T13:00:00Z')),9);
 assert.equal(easternHour(new Date('2026-12-01T14:00:00Z')),9);
 assert.equal(easternDate(new Date('2026-09-10T02:00:00Z')),'2026-09-09');
});
test('quota persists, cache expires, and delivery deduplication is durable',()=>{
 const s=openStore(':memory:');
 s.take('AI',2);s.take('AI',2);assert.throws(()=>s.take('AI',2));
 s.cache('expired',1,-1);assert.equal(s.cached('expired'),null);
 s.mark('x');s.mark('x');assert.equal(s.sent('x'),true);
 s.set('enabled:nfl',false);assert.equal(s.get('enabled:nfl'),false);s.db.close();
});
test('secrets and wrong roles are absent from registered commands',()=>{
 assert.ok(!JSON.stringify(commands).includes('API_KEY'));
 for(const n of ['setup','feed','status','map-team'])assert.equal(commands.find(c=>c.name===n).default_member_permissions,'32');
});
test('missing credentials and trial data fail closed',async()=>{
 const s=openStore(':memory:');const p=providers({},s);
 await assert.rejects(p.odds('nfl'),/not configured/);
 await assert.rejects(p.analyze('nfl',[]),/not configured/);
 await assert.rejects(providers({SPORTSDATA_API_KEY:'test'},s).stats('nfl'),/trial stats/);s.db.close();
});
test('provider error does not leak request URL or API key',async()=>{
 const original=globalThis.fetch;globalThis.fetch=async()=>{throw new Error('secret-api-key');};
 const s=openStore(':memory:');
 try{await assert.rejects(providers({ODDS_API_KEY:'secret-api-key'},s).odds('nfl'),e=>!e.message.includes('secret')&&/connection failed/.test(e.message));}
 finally{globalThis.fetch=original;s.db.close();}
});
test('odds cache shares in-flight requests and preserves Florida filtering',async()=>{
 const original=globalThis.fetch;let calls=0;
 globalThis.fetch=async url=>{calls++;assert.equal(url.searchParams.get('bookmakers'),BOOK);const f=fixture();f[0].commence_time=new Date(Date.now()+86400000).toISOString();return new Response(JSON.stringify(f));};
 const s=openStore(':memory:');
 try{const p=providers({ODDS_API_KEY:'test'},s);const [a,b]=await Promise.all([p.odds('nfl'),p.odds('nfl')]);assert.equal(calls,1);assert.deepEqual(a,b);assert.equal(a.length,2);}
 finally{globalThis.fetch=original;s.db.close();}
});
test('analysis researches the selected line without SportsDataIO and preserves citations',async()=>{
 const original=globalThis.fetch;const s=openStore(':memory:');let aiCalls=0;
 const f=fixture();f[0].commence_time=new Date(Date.now()+86400000).toISOString();f[0].bookmakers[0].last_update=new Date().toISOString();
 globalThis.fetch=async(url,options)=>{
   if(String(url).includes('api.openai.com')){
     aiCalls++;const body=JSON.parse(options.body);assert.equal(body.store,false);
     assert.ok(!body.input.includes('secret'));assert.ok(body.input.includes('Stats unavailable'));
     assert.equal(body.tool_choice,'required');assert.equal(body.model,'gpt-5-mini');
     assert.deepEqual(body.tools[0].filters.allowed_domains,['espn.com','sports.yahoo.com','x.com','twitter.com']);
     const evidence=JSON.parse(body.input);assert.equal(evidence.quotes[0].book,BOOK);assert.equal(evidence.quotes[0].price,-110);
     return new Response(JSON.stringify({status:'completed',output:[{type:'web_search_call',status:'completed'},{type:'message',content:[{type:'output_text',text:'Published stats [1].',annotations:[{type:'url_citation',start_index:16,end_index:19,url:'https://www.espn.com/nfl/story',title:'Matchup report'}]}]}]}));
   }
   assert.ok(!String(url).includes('sportsdata.io'));
   return new Response(JSON.stringify(String(url).includes('/events/')?f[0]:f));
 };
 try{
   const p=providers({ODDS_API_KEY:'secret-odds',OPENAI_API_KEY:'secret-ai',OPENAI_MODEL:'test'},s);
   const q=await p.odds('nfl');const output=await p.analyze('nfl',[q[0].id]);
   assert.match(output,/Research-backed/);assert.match(output,/\[Matchup report\]\(https:\/\/www.espn.com\/nfl\/story\)/);assert.equal(aiCalls,1);assert.ok(!output.includes('secret'));assert.ok(!output.includes('Additional stats: SportsDataIO'));
 }finally{globalThis.fetch=original;s.db.close();}
});
test('analysis fails closed if web research returns no citations',async()=>{
 const original=globalThis.fetch,s=openStore(':memory:');
 const f=fixture();f[0].commence_time=new Date(Date.now()+86400000).toISOString();f[0].bookmakers[0].last_update=new Date().toISOString();
 globalThis.fetch=async url=>String(url).includes('api.openai.com')
   ?new Response(JSON.stringify({status:'completed',output:[{type:'web_search_call',status:'completed'},{type:'message',content:[{type:'output_text',text:'Unsupported opinion.',annotations:[]}]}]}))
   :new Response(JSON.stringify(String(url).includes('/events/')?f[0]:f));
 try{const p=providers({ODDS_API_KEY:'test',OPENAI_API_KEY:'test'},s);const q=await p.odds('nfl');await assert.rejects(p.analyze('nfl',[q[0].id]),/No cited matchup research/);}
 finally{globalThis.fetch=original;s.db.close();}
});
test('analysis rejects a game that starts during research',async()=>{
 const original=globalThis.fetch,clock=Date.now,s=openStore(':memory:');const initial=Date.now();
 const f=fixture();f[0].commence_time=new Date(initial+30000).toISOString();f[0].bookmakers[0].last_update=new Date(initial).toISOString();
 globalThis.fetch=async url=>{
   if(String(url).includes('api.openai.com')){
     Date.now=()=>initial+60000;
     return new Response(JSON.stringify({status:'completed',output:[{type:'web_search_call',status:'completed'},{type:'message',content:[{type:'output_text',text:'Report [1].',annotations:[{type:'url_citation',start_index:7,end_index:10,url:'https://sports.yahoo.com/story',title:'Report'}]}]}]}));
   }
   return new Response(JSON.stringify(String(url).includes('/events/')?f[0]:f));
 };
 try{const p=providers({ODDS_API_KEY:'test',OPENAI_API_KEY:'test'},s);const q=await p.odds('nfl');await assert.rejects(p.analyze('nfl',[q[0].id]),/game has started/);}
 finally{globalThis.fetch=original;Date.now=clock;s.db.close();}
});
