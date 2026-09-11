# F.L.E.A Discord

**Sportsbook update:** `/games` and `/odds` now offer `book` choices: Hard Rock Bet Florida (default), FanDuel, DraftKings, or all three. `book:all` shows each quote with its sportsbook, points and timestamp, and labels missing feeds. The saved The Odds API key serves all three, subject to account/market coverage. Quote IDs include the sportsbook; refresh old quote IDs with `/odds`. `/analyze` refreshes the same sportsbook and rejects parlays mixing sportsbooks. No feed establishes availability in your location. News Desk remains independent and news-only. Earlier Florida-only descriptions below describe the default, not the full supported set.

**Separate News Desk bot:** see [NEWS-DESK.md](NEWS-DESK.md) for news-only operation, automatic ESPN headlines, and AI research across ESPN, Yahoo Sports and indexed X posts. It does not need odds access.

A Discord-only discussion community for NFL, college football, college basketball (men's Division I in this first build), and MLB. One bot serves all four sports. No website is required.

**Deployment:** Analyst and News Desk have been installed in the configured Discord server and run locally. Always-on cloud hosting has not been configured. API access remains dependent on provider billing and market coverage.

## Channel structure

```text
F.L.E.A COMMUNITY
  #welcome-and-rules
  #announcements
  #general-chat
  #winning-tickets
F.L.E.A NFL
  #nfl-news-and-analysis
  #nfl-bet-discussion
F.L.E.A NCAA
  #cfb-news-and-analysis
  #cfb-bet-discussion
  #cbb-news-and-analysis
  #cbb-bet-discussion
F.L.E.A MLB
  #mlb-news-and-analysis
  #mlb-bet-discussion
F.L.E.A COMMISSIONER (private)
  #bot-controls-and-alerts
```

`/setup` creates these channels, plus F.L.E.A Member and F.L.E.A Commissioner roles. Ordinary members see community/sports rooms; feed rooms are read-only. Commissioners and server managers can administer the bot. Server administrators retain Discord's normal override access. Discussion rooms support member-created threads. Setup is repeatable and reapplies the documented permissions to matching F.L.E.A channels; use a dedicated server or review existing matching names before running it.

## Member workflow

Members can post winning slips, screenshots, and celebrations in `#winning-tickets` under Community. It covers all sports and allows attachments, reactions, and discussion threads. Run `/setup` again after updating an existing installation to add the channel.

1. `/games sport:nfl` lists upcoming events available in the Florida moneyline feed.
2. `/odds sport:nfl event:EVENT_ID market:h2h` returns selections with quote IDs and source timestamps. Use `spreads`, `totals`, or an event-specific supported `player_...` market key. Use `page` for additional selections.
3. `/analyze sport:nfl quotes:QUOTE_ID` refreshes the exact selection and automatically researches its matchup using ESPN, Yahoo Sports, and available indexed X posts. It uses published stats and news to assess supporting evidence, risks, and missing information with clickable citations. No separate `/research` step or SportsDataIO key is required. Comma-separate up to 12 IDs from one sportsbook to assess a parlay. Research must complete with citations; otherwise analysis stops instead of silently falling back to odds alone. Unsupported legs are labeled as insufficient evidence. The bot also checks start times and odds freshness after research.
4. Copy the analysis into the sport's discussion room if you want to share it. Start a thread for that ticket to keep replies together.
5. Each person independently chooses whether to place their own wager in their own sportsbook account. The bot never places wagers.

Other commands: `/news sport:cfb`, `/stats sport:mlb team:TEAM_CODE`, `/help`. All command responses are private to the requester. Ordinary chat messages are not read by the bot; Message Content and Server Members privileged intents are not required.

There is no payment collection, pooled bankroll, sportsbook login, payout processing, mandatory participation, 24-member cap, A/B split, or Wednesday deadline in this revised discussion-board version.

## Automated posts

Feeds start paused. A commissioner enables each using `/feed sport:cfb enabled:true`; use `false` to pause.

- Every 15 minutes: up to three newly seen headlines per sport from the last 48 hours, with ESPN attribution and original article links.
- Once per Eastern calendar day, at the first cycle at/after 9 AM ET: an AI spotlight on the first available moneyline selection in a game starting within 36 hours. Feed order chooses the selection; it is explicitly not a ranked recommendation. No game returns a clear availability message.
- Downtime: a restart later that day catches up once, rather than replaying past days. Eastern scheduling adjusts for daylight saving.
- Missing keys, exhausted limits, or provider errors: retry next cycle and send at most one private admin alert per sport/day. Independent sports continue processing.
- SQLite delivery markers survive restarts. Delivery is at-least-once: a crash after Discord accepts a message but before the marker commits can repeat that post. Run **one bot replica**.

## Data providers and research

Checked September 9, 2026:

- **The Odds API**, `https://api.the-odds-api.com/v4`, supplies `hardrockbet_fl`, `fanduel`, and `draftkings`. The implementation requests the selected book(s) and never silently substitutes generic Hard Rock or another state. Moneyline, spread, total and supported event-level props are implemented. Not all sports/events/markets will be available. This is an independent data provider, not an official Hard Rock partnership. No sportsbook scraping or account access is used.
  - [Bookmaker coverage](https://the-odds-api.com/sports-odds-data/bookmaker-apis.html)
  - [API reference and market parameters](https://the-odds-api.com/liveapi/guides/v4/)
  - [Provider terms](https://the-odds-api.com/terms-and-conditions.html)
- **Optional SportsDataIO** team season stats: `/v3/{nfl|cfb|cbb|mlb}/scores/json/TeamSeasonStats/{season}`, authenticated by `Ocp-Apim-Subscription-Key`. Without these keys, `/analyze` uses cited web research. `/stats` and `/map-team` still require SportsDataIO. Confirm production coverage and permitted display/AI processing with your subscription. Trial stats may be scrambled, so production usage is gated by `SPORTSDATA_PRODUCTION=true`.
  - [OpenAPI catalog](https://sportsdata.io/developers/sports-data-open-api-swagger-files)
  - [Available feeds](https://sportsdata.io/developers/available-data-feeds)
- **ESPN published RSS feeds**, with attribution and links. Only headlines are reposted; feeds are `nfl`, `ncf`, `ncb`, and `mlb`. Automated headlines remain separate from the on-demand web research performed by `/analyze` and News Desk `/research`.
  - [RSS index and usage conditions](https://www.espn.com/espn/news/story/_/id/3437834)
- **OpenAI Responses API with web search** generates discussion analysis from the selected odds, newly retrieved news and published stats, and optional matched SportsDataIO rows. Publisher filters restrict research to ESPN, Yahoo Sports and indexed X/Twitter. This is automatic research of the selected quote's teams/players, not reading Discord conversations or earlier `/research` messages. No Discord username, user ID, chat history, or credentials are sent as model input. `store:false` is set; review your API account's separate retention settings.
  - [Responses API](https://developers.openai.com/api/reference/cli/resources/responses/methods/create)

AI output distinguishes reported facts, unconfirmed social posts, and inferred matchup implications. It discusses supporting/opposing evidence, missing information, and parlay conflicts/correlation. Research citations returned by the API become clickable inline links; uncited or out-of-domain responses fail closed. Injuries and player statistics may be included when supported by retrieved sources with dates and statistical periods. Missing data must remain missing. This is not a complete real-time stats feed, and numerical claims are not independently fact-checked by code. No combined parlay price, guaranteed winner, or fabricated edge is generated.

## Setup on your computer

Install Node.js 24.15 or newer within the Node 24 line.

```powershell
npm ci
Copy-Item .env.example .env
# Edit .env privately with a text editor.
npm test
npm run register
npm start
```

Do not paste tokens in Discord or chat. `.env` is ignored by Git and excluded from the Docker image. In production use hosting secrets, not a committed file. All keys stay server-side. `/analyze` uses `ANALYSIS_RESEARCH_MODEL`, default `gpt-5-mini`, with low reasoning. This model supports the publisher filter that `gpt-4.1-mini` rejected during a live test. The older `OPENAI_MODEL` setting does not override this research setting. Rotate any exposed credential at its issuer.

### Discord application

1. Create a dedicated application at the [Discord Developer Portal](https://discord.com/developers/applications). Create its bot and put the bot token in `DISCORD_BOT_TOKEN`. Add the application ID and your server ID to `.env`.
2. Install using the `bot` and `applications.commands` scopes. Grant View Channels, Send Messages, Embed Links, Read Message History, Create Public Threads, and Send Messages in Threads. For `/setup`, also grant Manage Channels and Manage Roles; place the bot role above the two F.L.E.A roles. You can revoke Manage Channels/Manage Roles after setup if you will not rerun it. Do not grant Administrator.
3. Leave privileged intents off. This bot connects through Discord's Gateway, so no public interactions endpoint or inbound web port is needed.
4. Run `npm run register` once. It replaces the command list for this dedicated application in the specified guild; it does not affect other bots.
5. Start the bot and run `/setup` as a server manager. Assign the member role to approved participants and commissioner role to trusted admins.
6. In Server Settings → Integrations → this bot, allow the Commissioner role to use `/setup`, `/feed`, `/status`, and `/map-team` if those commissioners do not have Manage Server. Discord's initial command visibility is restricted to Manage Server; runtime checks also enforce the commissioner role.
7. Review channel permissions and `/status`. Try `/games`, `/odds`, `/stats`, then `/analyze`. Enable each sport with `/feed` after reviewing the results.

### Team matching

The providers can use different team names. Analysis only accepts a unique exact name match, or an explicit commissioner mapping. `/map-team sport:nfl name:EXACT_ODDS_TEAM_NAME id:SPORTSDATA_TEAM_ID` validates that the ID exists in this sport's configured season. Check the provider's team directory to obtain the correct ID. Ambiguous matches produce missing stats, not guessed joins.

Set each season explicitly in `.env`; review it at season rollover. Men's college basketball generally uses the ending year. Confirm your feed's season identifier before enabling production stats. Separate per-sport SportsDataIO keys are supported.

## Deployment

Run as an always-on background process on a host with persistent storage and outbound HTTPS/WebSocket access. Do not deploy as a sleeping web service, static site, or short-lived serverless function.

With Docker installed, configure a private `.env`, then:

```sh
docker compose build
docker compose run --rm bot node src/register.js
docker compose up -d
docker compose logs --tail 50
```

The named volume holds SQLite. Restart policy restores the process after failures/host restarts. On a managed background-worker host, use `npm ci` as build command, `npm start` as start command, a persistent disk, and set `DATABASE_PATH` to a file on that disk. Set all secrets in that host's private environment settings. Use one replica and monitor process restarts and the admin alert channel.

Back up the persistent volume while the bot is stopped (SQLite WAL files must not be omitted from a live file copy). Restore it before restarting to preserve configuration and delivery markers. Restrict access to backups. Re-register commands only when command definitions change. To stop posting, pause all four feeds; to take the bot offline, stop the worker.

## Database and cost controls

SQLite tables: `settings` (channel IDs, role IDs, enabled sports, team aliases), `cache` (expiring odds/stats/analysis), `quota` (daily API request counts), `delivered` (deduplication markers), and `audit` (admin actor/action/time). There is no member betting/payment ledger. Admin audit records contain Discord user IDs and should be accessible only to the operator.

Defaults: 40 analysis requests/day, 120 odds calls/day; quota days use UTC. Each uncached analysis includes web search and model usage, billed separately by OpenAI; the request cap is not a dollar cap. An odds request count is not identical to the provider's billed credits. Odds/analysis cache lasts 2 minutes; headlines 15 minutes; optional stats 1 hour. Research can take up to 90 seconds. Odds older than 15 minutes or events started during research are rejected. Limits persist across restarts; failed calls consume a local slot conservatively. Configure provider billing controls as well. Per-user cooldowns limit repeated commands.

## Before inviting the group

- Verify `/setup` as admin and check the server as an ordinary member: admin room hidden, feed rooms read-only, discussion rooms writable.
- Verify a nonmember cannot run commands and an ordinary member cannot run admin commands.
- Check Florida quotes against the sportsbook and verify at least one stats mapping in each sport.
- Enable one sport and observe a scheduled news post and daily analysis; pause and confirm posting stops.
- Restart the worker to verify saved settings and message markers persist.

Local automated tests cover Florida isolation, stale/start-time rejection, parlay duplicates, Eastern daylight saving, quotas, caches, command permissions, trial-data gating and secret-safe errors. They do not substitute for the live Discord/provider checks above.

Community access: the main bot assigns Member to every non-bot arrival after any membership screening completes. Server Members Intent and Manage Roles are required; keep the bot role above Member. A five-minute reconciliation catches missing assignments, including arrivals while the local bot was offline. League invites use Discord native role grants (Member plus Stache or F.L.E.A); invite codes are stored in the local database.

## Analytics extension
See [ANALYTICS.md](ANALYTICS.md) for new commands, database migration, private Group A/B setup, grading/import workflows, model limitations, and deployment. Use `/flea` to begin. Rankings are market baselines; independent model probabilities and value estimates remain unavailable.

Screenshot uploads and sport routing: see SCREENSHOTS.md. Use /analyze-image, review/edit, validate, then explicitly confirm posting to the displayed sport channel.
