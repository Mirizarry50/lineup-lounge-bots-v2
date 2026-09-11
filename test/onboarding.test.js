import test from 'node:test';import assert from 'node:assert/strict';import {onboarding} from '../src/onboarding.js';
test('guided onboarding enforces membership, researches before analysis, and rejects reused steps',async()=>{
 let handler;const client={on:(_e,h)=>handler=h};const values=new Map([['memberRole','member']]);const store={get:k=>values.get(k),set:(k,v)=>values.set(k,v)};
 const calls=[];const q={event:'event',game:'Away at Home',starts:new Date(Date.now()+3600000).toISOString(),id:'quote',book:'fanduel',name:'Home',price:120,market:'h2h',updated:new Date().toISOString()};
 onboarding(client,store,{odds:async()=>[q],analyze:async(_s,ids)=>{calls.push('analyze');assert.deepEqual(ids,['quote']);return 'Analysis';}},{DISCORD_GUILD_ID:'guild'},async()=>{calls.push('research');return 'Research';});
 let messages=[];const make=(customId, value, member=true)=>({guildId:'guild',user:{id:'user'},member:{roles:member?['member']:[]},memberPermissions:{has:()=>false},commandName:'onboarding',customId,values:[value],isChatInputCommand:()=>!customId,isButton:()=>!!customId,isStringSelectMenu:()=>!!customId,reply:async m=>messages.push(m),deferReply:async()=>{},deferUpdate:async()=>{},editReply:async m=>messages.push(m),followUp:async m=>messages.push(m)});
 await handler(make(null,null,false));assert.match(messages.at(-1).content,/Member role/);
 await handler(make());let next=()=>messages.at(-1).components[0].components[0].data.custom_id;
 const sport=next();await handler(make(sport,'nfl'));await handler(make(next(),'fanduel'));await handler(make(next(),'0'));assert.deepEqual(calls,['research']);
 await handler(make(next(),'h2h'));await handler(make(next(),'0'));const analyze=next();await handler(make(analyze));assert.deepEqual(calls,['research','analyze']);assert.ok(values.get('onboarding:completed:user'));await handler(make(analyze));assert.match(messages.at(-1).content,/expired|completed/);
});
