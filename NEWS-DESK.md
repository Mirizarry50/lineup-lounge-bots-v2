# F.L.E.A News Desk — news-only operation

News Desk is a separate Discord application from Analyst. It requires no Odds API or SportsDataIO subscription. It never calls those services. ESPN headlines work without OpenAI; AI research uses the existing OpenAI key and model from `.env`, or News Desk overrides in `.env.news`.

For publisher-filtered research, set `NEWS_OPENAI_MODEL=gpt-5-mini` in `.env.news`. A live request established that `gpt-4.1-mini` rejects domain filters. OpenAI credits have been added and a News Desk research request completed with citations. ESPN headlines remain independent of OpenAI billing. Model and search-tool charges apply to research.

The separate Analyst `/analyze` now uses the same web-search and citation approach automatically for selected odds. Members do not need to run `/research` first or buy SportsDataIO. News Desk itself remains news-only.

## Commands

- `/headlines sport:nfl`: five ESPN headlines, dates and original article links; no AI cost.
- `/research sport:nfl topic:Miami Dolphins injury updates source:all`: AI news and published-stat research, with clickable inline source citations. Choose `espn`, `yahoo`, `x`, or `all`. Results are private; members may copy them to discussion rooms.
- `/news-feed sport:nfl enabled:false`: commissioner pause/resume for automatic headlines.
- `/news-status`: show status for all four sports.

Automatic posting publishes at most one unseen ESPN headline per sport every 15 minutes, only from the last 48 hours. New feeds are enabled by `news:install`; existing enabled/paused choices are retained. Delivery markers persist in `data/news.sqlite`, separate from Analyst. As with Analyst, a crash after delivery and before marking can repeat a post. Run one News Desk process. AI research is on demand, not automatically billed every polling cycle.

## Sources and limitations

Research uses OpenAI Responses `web_search`, restricted to espn.com, sports.yahoo.com, x.com and twitter.com. It asks for current news, dates, statistical season/range, distinctions between facts and implications, and missing evidence. Only source citations returned by the API are rendered; out-of-domain citations and responses without a completed search fail closed. No citations produces an availability message. Evidence is not independently fact-checked by code, so check the linked source before relying on any figure.

**X is indexed public-web research only, not direct X API access, a live stream, or an authenticated timeline.** It may return no results or old posts. It does not bypass logins/paywalls. Yahoo is searched on demand, not scraped or polled as an unofficial statistics API. News research does not replace a complete real-time statistics feed or price analysis. No odds, wager execution, confidence scores, staking, or payout handling are included.

[OpenAI web-search documentation](https://developers.openai.com/api/docs/guides/tools-web-search)

## Setup and running

In `.env.news` (never commit it), set the News Desk application, guild ID and token. The original Analyst `.env` keeps its original token. Shared OpenAI keys are read internally; no Discord user identity or message history is sent to OpenAI. The research topic is sent to OpenAI, so keep it about sports and do not enter private information. Search tool charges apply in addition to model usage; the app caps News Desk research at 20 requests/day (UTC), caches matching requests for 15 minutes, and uses a per-user cooldown. Set `NEWS_AI_DAILY_LIMIT` in `.env.news` to change the cap.

```sh
npm run news:install
npm run news:start
```

The installer uses the existing Analyst bot's Manage Roles access to grant News Desk View Channel, Send Messages, Embed Links and Read Message History in the configured sports feed/discussion rooms and admin alerts room. It copies role/channel references from the league database, and registers commands only for the News Desk application. It does not replace Analyst's command list or token. If you rerun Analyst `/setup`, rerun `news:install` afterward to restore News Desk-specific channel access.

Only F.L.E.A Members and commissioners may use commands. Discord initially restricts `/news-feed` to Manage Server; allow your Commissioner role under Integrations if needed. No privileged intents are used.

An always-on worker or this computer must remain running. For hosting, mount persistent storage for both settings databases and use the `news:start` process separately from Analyst. `.env.news` or `NEWS_DISCORD_BOT_TOKEN`, `NEWS_DISCORD_APPLICATION_ID`, `NEWS_DISCORD_GUILD_ID` environment variables configure News Desk; `OPENAI_API_KEY`, `OPENAI_MODEL`, and `NEWS_DATABASE_PATH` may also be supplied through hosting secrets. The image excludes `.env*`; use hosting secrets or secret file mounts. The installer additionally requires the existing Analyst configuration and settings database locally.

Automatic posts and /headlines now filter ESPN titles and summaries for injury/availability updates or numeric performance statistics. General news is skipped; when no matching updates are available the automatic feed stays quiet. Article links and publication dates are preserved. This is article coverage, not a complete live injury or statistics feed. /research focuses on sourced injuries, availability and published stats without requiring SportsDataIO.
