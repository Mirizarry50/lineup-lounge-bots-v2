import {readFileSync} from 'node:fs';
import {MODEL_VERSION} from './model.js';
export function analyticsStore(store){const db=store.db;db.exec('PRAGMA foreign_keys=ON');db.exec(readFileSync(new URL('../../migrations/001-analytics.sql',import.meta.url),'utf8'));
 return {db,
 capture(sport,quotes){const stmt=db.prepare('INSERT OR IGNORE INTO odds_history(sport,quote_id,event_id,captured_at,odds_updated,snapshot) VALUES(?,?,?,?,?,?)');for(const q of quotes)stmt.run(sport,q.id,q.event,new Date().toISOString(),q.updated,JSON.stringify(q));},
 save(owner,sport,q){return Number(db.prepare('INSERT INTO analysis_results(owner,sport,created_at,model_version,snapshot) VALUES(?,?,?,?,?)').run(owner,sport,new Date().toISOString(),MODEL_VERSION,JSON.stringify(q)).lastInsertRowid);},
 history(owner){return db.prepare('SELECT a.*,r.outcome FROM analysis_results a LEFT JOIN results r ON r.analysis_id=a.id WHERE owner=? ORDER BY a.id DESC LIMIT 20').all(owner);},
 results(since){return db.prepare('SELECT a.*,r.* FROM analysis_results a JOIN results r ON r.analysis_id=a.id WHERE a.created_at>=?').all(since);}
 };}
