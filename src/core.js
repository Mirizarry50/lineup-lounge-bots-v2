import { createHash } from 'node:crypto';

export const SPORTS = {
  nba: {name:'NBA',key:'basketball_nba',rss:'nba',category:'NBA'},
  nhl: {name:'NHL',key:'icehockey_nhl',rss:'nhl',category:'NHL'},
  nfl: { name: 'NFL', key: 'americanfootball_nfl', rss: 'nfl', category: 'NFL' },
  cfb: { name: 'College football', key: 'americanfootball_ncaaf', rss: 'ncf', category: 'NCAA' },
  cbb: { name: 'College basketball (men)', key: 'basketball_ncaab', rss: 'ncb', category: 'NCAA' },
  mlb: { name: 'MLB', key: 'baseball_mlb', rss: 'mlb', category: 'MLB' }
};
export const BOOK = 'hardrockbet_fl';
export const BOOKS = { hardrockbet_fl: 'Hard Rock Bet Florida', fanduel: 'FanDuel', draftkings: 'DraftKings' };
export const clean = (value, max = 500) => String(value ?? '').replace(/<[^>]*>/g, '').replace(/@/g, '@\u200b').slice(0, max);
export function quoteId(q) {
  return createHash('sha256').update(JSON.stringify([q.book, q.event, q.market, q.name, q.description, q.point])).digest('hex').slice(0, 16);
}
export function quotesFrom(events, now = Date.now(), books = [BOOK]) {
  return events.filter(e => Date.parse(e.commence_time) > now).flatMap(e =>
    (e.bookmakers ?? []).filter(b => books.includes(b.key) && Object.hasOwn(BOOKS,b.key)).flatMap(b => (b.markets ?? []).flatMap(m =>
      (m.outcomes ?? []).filter(o => Number.isFinite(o.price)).map(o => {
        const q = { event: e.id, game: `${e.away_team} at ${e.home_team}`, home: e.home_team, away: e.away_team,
          starts: e.commence_time, book: b.key, market: m.key, name: o.name,
          description: o.description ?? '', point: o.point ?? null, price: o.price,
          updated: m.last_update ?? b.last_update };
        return { ...q, id: quoteId(q) };
      }))));
}
export function assertFresh(q, now = Date.now()) {
  if (!Object.hasOwn(BOOKS,q.book) || !Number.isFinite(Date.parse(q.updated)) || now - Date.parse(q.updated) > 15 * 60_000 || Date.parse(q.updated) > now + 60_000)
    throw new Error('Sportsbook odds are missing or older than 15 minutes. Refresh /odds before analysis.');
  if (!(Date.parse(q.starts) > now)) throw new Error('This game has started or its start time is unavailable. Pregame analysis only.');
}
export function quoteLine(q) {
  return `${BOOKS[q.book] || 'Unknown sportsbook'} | ${clean(q.game, 100)} | ${clean(q.market, 70)} | ${clean(q.description, 90)} ${clean(q.name, 90)}${q.point === null ? '' : ` ${q.point}`} (${q.price > 0 ? '+' : ''}${q.price})`;
}
export function parlayWarnings(quotes) {
  if (new Set(quotes.map(q => q.book)).size > 1) throw new Error('A parlay must use one sportsbook. Analyze each sportsbook separately.');
  if (new Set(quotes.map(q => q.id)).size !== quotes.length) throw new Error('Remove repeated quote IDs.');
  return new Set(quotes.map(q => q.event)).size < quotes.length
    ? ['Multiple legs share a game. Correlation or conflicting selections may make the combination unavailable. No combined price is calculated.'] : [];
}
export function easternDate(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}
export function easternHour(now = new Date()) {
  return Number(new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: '2-digit', hourCycle: 'h23' }).format(now));
}
