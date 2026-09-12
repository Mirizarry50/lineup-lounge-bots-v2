import test from 'node:test';
import assert from 'node:assert/strict';
import {gameParlay} from '../src/analytics/game-parlay.js';
import {shareLeg} from '../src/analytics/share.js';
import {analyticsCommands} from '../src/analytics/commands.js';
const starts='2099-09-13T00:30:00Z';
const quotes=['h2h','spreads','totals'].map((market,n)=>({id:String(n),event:String(n),book:'fanduel',market,name:market==='totals'?'Over':'Team '+n,point:market==='h2h'?null:market==='spreads'?-3.5:48.5,price:-110,starts,updated:new Date().toISOString(),game:'Away at Home',description:''}));
const history={capture(){}};
const api={events:async()=>[...quotes.map(q=>({id:q.event,commence_time:starts})),{id:'later',commence_time:'2099-09-14T00:30:00Z'}],odds:async()=>[...quotes,{...quotes[0],id:'later',event:'later',starts:'2099-09-14T00:30:00Z'}]};
test('CFB mixed ticket uses exact Eastern day and covers all selected markets',async()=>{const ticket=await gameParlay(api,history,'cfb',{from:'2099-09-12',book:'fanduel',markets:'h2h,spreads,totals',legs:3});assert.equal(ticket.legs.length,3);assert.deepEqual(new Set(ticket.legs.map(q=>q.market)),new Set(['h2h','spreads','totals']));assert.ok(ticket.legs.every(q=>q.event!=='later'));});
test('missing market and insufficient legs fail without substitutions',async()=>{await assert.rejects(gameParlay({...api,odds:async()=>quotes.slice(0,2)},history,'cfb',{from:'2099-09-12',book:'fanduel',markets:'h2h,spreads,totals',legs:3}),/No current totals/);await assert.rejects(gameParlay(api,history,'cfb',{from:'2099-09-12',markets:'h2h,spreads,totals',legs:2}),/at least one leg/);});
test('copy text identifies spread team and total game',()=>{assert.equal(shareLeg(quotes[1]),'Team 1 -3.5');assert.equal(shareLeg(quotes[2]),'Away at Home over 48.5 total points');});
test('parlay command exposes market combinations',()=>{const cmd=analyticsCommands.find(c=>c.name==='parlay');assert.equal(cmd.options.find(o=>o.name==='markets').choices.length,7);});

