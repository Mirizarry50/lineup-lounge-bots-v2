import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

export function newsConfig() {
  const read = path => { try { return parseEnv(readFileSync(path, 'utf8')); } catch(e) { if(e.code==='ENOENT')return {};throw e; } };
  const shared = read('.env');
  const news = read('.env.news');
  // Only share AI settings. News Desk must never inherit the Analyst token or odds key.
  return {
    ...news,
    DISCORD_BOT_TOKEN: news.DISCORD_BOT_TOKEN || process.env.NEWS_DISCORD_BOT_TOKEN,
    DISCORD_APPLICATION_ID: news.DISCORD_APPLICATION_ID || process.env.NEWS_DISCORD_APPLICATION_ID,
    DISCORD_GUILD_ID: news.DISCORD_GUILD_ID || process.env.NEWS_DISCORD_GUILD_ID,
    OPENAI_API_KEY: news.OPENAI_API_KEY || process.env.OPENAI_API_KEY || shared.OPENAI_API_KEY,
    OPENAI_MODEL: news.NEWS_OPENAI_MODEL || process.env.NEWS_OPENAI_MODEL || news.OPENAI_MODEL || process.env.OPENAI_MODEL || shared.OPENAI_MODEL,
    DATABASE_PATH: news.NEWS_DATABASE_PATH || process.env.NEWS_DATABASE_PATH || './data/news.sqlite'
  };
}
