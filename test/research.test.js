import test from 'node:test';
import assert from 'node:assert/strict';
import {renderResearch,sourceUrl,splitMessages,researcher,SOURCES} from '../src/research.js';
import {openStore} from '../src/store.js';
import {newsCommands} from '../src/news-commands.js';
const data=(url='https://www.espn.com/story')=>({status:'completed',output:[{type:'web_search_call',status:'completed'},{type:'message',content:[{type:'output_text',text:'Reported today [1].',annotations:[{type:'url_citation',start_index:15,end_index:18,url,title:'ESPN report'}]}]}]});
test('research citations are clickable and source allowlist rejects lookalikes',()=>{
  assert.match(renderResearch(data(),SOURCES.all),/\[ESPN report\]\(https:\/\/www.espn.com\/story\)/);
  assert.equal(sourceUrl('https://espn.com.attacker.test/',SOURCES.all),null);
  assert.equal(sourceUrl('https://espn.com@attacker.test/',SOURCES.all),null);
  assert.equal(sourceUrl('http://espn.com/',SOURCES.all),null);
  assert.throws(()=>renderResearch(data('https://attacker.test'),SOURCES.all));
});
test('uncited or incomplete results are not presented as verified research',()=>{
  const d=data();d.status='incomplete';assert.throws(()=>renderResearch(d,SOURCES.all));
  d.status='completed';d.output.shift();assert.throws(()=>renderResearch(d,SOURCES.all));
  const n=data();n.output[1].content[0].annotations=[];assert.match(renderResearch(n,SOURCES.all),/No verifiable/);
});
test('message splitter preserves long citations',()=>{
 const link='[Source](https://www.espn.com/'+('a'.repeat(100))+')';
 const p=splitMessages('x'.repeat(1880)+'\n'+link+'\nMore');
 assert.ok(p.every(x=>x.length<=1900));assert.ok(p.some(x=>x.includes(link)));
});
test('news commands contain no odds or bet execution functionality',()=>{
 assert.deepEqual(newsCommands.map(c=>c.name),['headlines','research','news-feed','news-status']);
 assert.equal(newsCommands.find(c=>c.name==='news-feed').default_member_permissions,'32');
});
test('research calls only OpenAI, caches results and does not send tokens as evidence',async()=>{
 const old=globalThis.fetch,s=openStore(':memory:');let calls=0;
 globalThis.fetch=async(url,options)=>{calls++;assert.equal(url,'https://api.openai.com/v1/responses');const b=JSON.parse(options.body);assert.equal(b.store,false);assert.equal(b.tool_choice,'required');assert.deepEqual(b.tools[0].filters.allowed_domains,['espn.com']);assert.ok(!b.input.includes('secret'));return new Response(JSON.stringify(data()));};
 try{const f=researcher({OPENAI_API_KEY:'secret',OPENAI_MODEL:'test'},s);await Promise.all([f('nfl','team news','espn'),f('nfl','team news','espn')]);assert.equal(calls,1);await f('nfl','team news','espn');assert.equal(calls,1);}finally{globalThis.fetch=old;s.db.close();}
});
test('billing errors are safe and actionable',async()=>{
 const old=globalThis.fetch,s=openStore(':memory:');globalThis.fetch=async()=>new Response(JSON.stringify({error:{code:'insufficient_quota',message:'secret'}}),{status:429});
 try{await assert.rejects(researcher({OPENAI_API_KEY:'secret',OPENAI_MODEL:'test'},s)('nfl','news'),e=>e.message.includes('billing')&&!e.message.includes('secret'));}finally{globalThis.fetch=old;s.db.close();}
});
