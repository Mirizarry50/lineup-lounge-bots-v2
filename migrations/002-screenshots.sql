CREATE TABLE IF NOT EXISTS screenshot_slips (
 id TEXT PRIMARY KEY, owner TEXT NOT NULL, message_id TEXT, channel_id TEXT NOT NULL,
 image_url TEXT NOT NULL, attachment_json TEXT NOT NULL, raw_json TEXT,
 draft_json TEXT, confirmed_json TEXT, quotes_json TEXT, result_json TEXT,
 status TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0,
 created_at TEXT NOT NULL, updated_at TEXT NOT NULL, expires INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS screenshot_reads(id INTEGER PRIMARY KEY, slip_id TEXT NOT NULL, created_at TEXT NOT NULL, raw_json TEXT NOT NULL);
