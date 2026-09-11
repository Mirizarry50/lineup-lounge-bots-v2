import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {PublicError} from '../errors.js';
export function screenshotStore(store){const db=store.db;db.exec(readFileSync(new URL('../../migrations/002-screenshots.sql',import.meta.url),'utf8'));
 return {create(owner,channel,message,attachment){const id=randomUUID(),now=new Date().toISOString();db.prepare('INSERT INTO screenshot_slips(id,owner,channel_id,message_id,image_url,attachment_json,status,created_at,updated_at,expires) VALUES(?,?,?,?,?,?,?,?,?,?)').run(id,owner,channel,message,attachment.url,JSON.stringify(attachment),'reading',now,now,Date.now()+1800000);return id;},
 get(id,owner,revision){const s=db.prepare('SELECT * FROM screenshot_slips WHERE id=? AND owner=?').get(id,owner);if(!s||s.expires<Date.now()||['cancelled','complete'].includes(s.status)||revision!==undefined&&s.revision!==revision)throw new PublicError('This screen expired or was already used. Run /analyze-image again.');return s;},
 update(id,fields){const allowed=['raw_json','draft_json','confirmed_json','quotes_json','result_json','status'];if(Object.keys(fields).some(k=>!allowed.includes(k)))throw Error('Invalid fields');db.prepare(`UPDATE screenshot_slips SET ${Object.keys(fields).map(k=>k+'=?').join(',')},revision=revision+1,updated_at=? WHERE id=?`).run(...Object.values(fields),new Date().toISOString(),id);},
 read(id,raw){db.prepare('INSERT INTO screenshot_reads(slip_id,created_at,raw_json) VALUES(?,?,?)').run(id,new Date().toISOString(),JSON.stringify(raw));db.prepare('UPDATE screenshot_slips SET raw_json=COALESCE(raw_json,?) WHERE id=?').run(JSON.stringify(raw),id);}
 };
}
