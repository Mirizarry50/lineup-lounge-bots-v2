import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export function openStore(path = './data/flea.sqlite') {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY,value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS cache(key TEXT PRIMARY KEY,value TEXT NOT NULL,expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS quota(day TEXT,kind TEXT,used INTEGER NOT NULL,PRIMARY KEY(day,kind));
    CREATE TABLE IF NOT EXISTS delivered(key TEXT PRIMARY KEY,at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY,at INTEGER,actor TEXT,action TEXT);`);
  return {
    db,
    get(key) { const r = db.prepare('SELECT value FROM settings WHERE key=?').get(key); return r ? JSON.parse(r.value) : null; },
    set(key, value) { db.prepare('INSERT OR REPLACE INTO settings VALUES (?,?)').run(key, JSON.stringify(value)); },
    cached(key) { const r = db.prepare('SELECT value FROM cache WHERE key=? AND expires>?').get(key, Date.now()); return r ? JSON.parse(r.value) : null; },
    cache(key, value, ttl) { db.prepare('INSERT OR REPLACE INTO cache VALUES (?,?,?)').run(key, JSON.stringify(value), Date.now() + ttl); },
    take(kind, limit) {
      const day = new Date().toISOString().slice(0, 10);
      const r = db.prepare(`INSERT INTO quota VALUES (?,?,1) ON CONFLICT(day,kind) DO UPDATE SET used=used+1 WHERE used<? RETURNING used`).get(day, kind, limit);
      if (!r) throw new Error(`${kind} daily request limit reached. Try tomorrow.`);
    },
    sent(key) { return !!db.prepare('SELECT 1 FROM delivered WHERE key=?').get(key); },
    mark(key) { db.prepare('INSERT OR IGNORE INTO delivered VALUES (?,?)').run(key, Date.now()); },
    audit(actor, action) { db.prepare('INSERT INTO audit(at,actor,action) VALUES (?,?,?)').run(Date.now(), actor, action); },
    prune() { db.prepare('DELETE FROM cache WHERE expires<?').run(Date.now()); db.prepare('DELETE FROM quota WHERE day<?').run(new Date(Date.now()-30*86400000).toISOString().slice(0,10)); }
  };
}
