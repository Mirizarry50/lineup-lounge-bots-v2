# Analytics expansion - operation and limits

## Start and deployment
Run `npm ci`, copy `.env.example` to `.env` only for a new installation, configure the existing Discord/OpenAI/Odds API keys, then run `npm run register` and `npm start`. Never overwrite a working `.env`. Keep the bot above Member and league group roles. Enable Server Members Intent for automatic membership. Node 24 or later is required for native SQLite. Docker/compose instructions in README remain applicable; persist the `data` volume and inject secrets at runtime. This build adds no payment or wager-execution integration.

The migration `migrations/001-analytics.sql` runs idempotently on the main bot's start. Back up `data/flea.sqlite` before upgrading. Do not package databases or `.env` files for public distribution. The provider boundary remains `providers()`; `slateService()` consumes it without depending on Discord.

## Commands and examples
- `/flea`: paginated private research menu.
- `/moneyline sport:nfl` or `/ml nfl`: seven-day available Hard Rock slate.
- `/props sport:nfl category:passing`: cross-game passing props. Other categories: rushing, receiving, touchdowns. Optional player/game substring filters.
- `/props sport:mlb`, `/props sport:nba`, `/props sport:nhl`: sport-specific prop sets.
- `/td slate`: every returned NFL anytime-TD market for a seven-day window. `from:2026-09-13` chooses its start in UTC, not an official NFL week number. Filter plus-money or longshots as desired.
- `/parlay sport:nfl legs:4`: moneyline ticket. Supports 2-12 legs. Price bands diversify selections; this is NOT a value-optimized predictive model. Style labels describe leg counts, never safety.
- `/prop-parlay sport:nfl category:touchdowns legs:4`: cross-game touchdown ticket. Supports 4/6/8/12 legs. One game per leg by default; insufficient distinct games yields a clear error, never padded picks.
- `/analyze sport:nfl quotes:ID1,ID2`: research selected legs across games. Use IDs from the boards or /odds. Same sport and sportsbook required.
- `/td player name:PLAYER season:2026`, `/td leaderboard season:2026`: imported official season history, never synthetic results.
- `/history`: your recorded board analyses. `/results period:week` and `/model`: only recorded, commissioner-graded selections.
- `/bestbets`: market moneyline snapshot across active professional sports, with commands for props/TD pools. It does not yet automatically research every prop or certify best value.
- `/disclaimer`: informational-use notice.

Boards scan all upcoming events in the date window. Props are requested per event with supported market groups. Coverage is reported separately from scheduled game count and failed requests. Hard Rock is never silently replaced with another book. No published odds means no invented quote. New NBA/NHL analysis commands are available; creation of their feed channels is a separate server setup action.

## Honest model boundary
`market-baseline-v1` converts American odds to implied probability. When opposing outcomes exist, it normalizes their probabilities to remove aggregate margin. FLEA market score is that normalized value times 100 and is explicitly labeled as a market ranking, not a prediction or value rating. When opposing outcomes are absent, score uses raw implied probability and explicitly includes bookmaker margin. Independent probabilities, projected player totals, historical/recent averages, statistical edges, elite/value stars, and rushing/receiving-specific TD rankings remain unavailable without verified feature data and an independently tested model. Sport-specific research instructions name the relevant factors, but this is not four fitted statistical engines. No 'safe TD' claim is made.

Estimated parlay odds multiply decimal standalone prices for distinct games; sportsbook acceptance and final pricing can differ. Correlated tickets have no estimated combined price. ALLOW_CORRELATED_PROPS defaults false. Combined outcome probability is not calculated from an independence assumption.

## League setup
The original app did not have Group A/B submissions or deadline logic. This extension introduces it without removing Stache/F.L.E.A private sections.
1. Commissioner `/admin set-week week:2026-W02` defaults to the next Wednesday at 6 PM America/New_York, DST-aware. Optional deadline must contain an explicit ISO timezone; optional market restricts any/h2h/props/td.
2. `/admin assign member:USER group:A` creates/assigns Group A or B and caps each at 12. Assign participants deliberately; no guessing league membership.
3. `/admin group-channel group:A channel:CHANNEL` selects the destination. Use private group channels with only the matching Group role and Commissioner (plus bot) access.
4. Members run `/pick sport:nfl quote:ID`. Picks are private, one per member/week, replaceable before deadline. Inspect analysis from a board before submitting.
5. Deadlines automatically lock in the running process and are rechecked at submission. `/admin lock-picks` locks early; to reopen an expired week, extend its deadline then `/admin unlock-picks`.
6. `/admin publish-ticket group:A` publishes locked submissions, deduplicated into a frozen snapshot. Publishing is commissioner-triggered in this build, not automatic. Missing member submissions are not filled in. A repeated publish is rejected after success. Prices are labeled submission snapshots; members must verify availability themselves.

## History and grading
Odds snapshots and board selections are persisted with timestamps and model version. Existing /analyze and onboarding replies are not automatically added to the new recommendation ledger; use the board's research selector to record an analysis ID. `/admin grade id:ID outcome:win source:OFFICIAL_HTTPS_URL` records a commissioner-verified settlement after kickoff. Supported result source hosts include NFL/NBA/MLB/NHL, ESPN and Yahoo Sports. The bot checks URL structure/host but does not verify page content or determine that the game is final; the commissioner must do that. It never auto-grades on an LLM answer. Corrections, sportsbook-specific settlement rules, closing-line automation, score-band calibration and sport/market breakdowns need further development. ROI is hypothetical one-unit net return per win/loss; push/void entries are excluded from its denominator.

## TD history import
After official games complete, a commissioner can prepare a JSON array of complete season snapshots and run:
`node --env-file=.env src/analytics/import-td.js PATH_TO_VERIFIED_JSON`
Each player object needs player_id, player_name, team, season, source_url, and games. Each game needs event_id, game_date (ISO), rush_tds, receiving_tds. Include zero-TD games to produce the correct game rate. Passing touchdowns are excluded. The import derives season totals and last-five history transactionally; repeated snapshots replace that player's season game history. Source URL must be HTTPS on nfl.com, espn.com, sports.yahoo.com or sportsdata.io. Importer validates shape and arithmetic, not factual accuracy. No automatic feed is configured yet. Advanced usage columns remain NULL, not zero. No credential/cookie extraction is used.

## Remaining data-dependent work
A licensed structured statistics feed, reproducible feature assembly, separate trained/calibrated sport models, proper out-of-sample validation, automatic official stat ingestion and settlement, closing-price capture, advanced TD/value classifications, and weekly calibrated reports are NOT implemented. These cannot be honestly replaced with arbitrary AI scores. This is a working market/research and recordkeeping foundation, not completion of every phase in the expansion specification.

## Verification
Run `npm test`. Tests cover odds normalization, unknown model edges, distinct-game tickets, partial prop coverage, Eastern deadlines, immutable ticket snapshots, and existing security/research flows. API request caps apply across the server. Multi-market calls debit local quota per market; actual provider billing uses its own rules. Existing 2-minute odds caches and 5-minute event caches limit repeat calls.

### Multiple prop categories
Run `/prop-parlay sport:nfl legs:4`, then choose multiple categories in the private menu. NFL offers passing, rushing, receiving, and anytime touchdowns. NBA/college basketball offers points, rebounds, and assists; MLB offers hits, home runs, and pitcher strikeouts; NHL offers shots on goal, points, and assists. College football offers the football categories when the provider supplies them.
Every selected category must appear in the ticket. Different games are required by default; missing markets or insufficient games produce an explanation instead of substitute picks. This uses market-price ranking; it is not an independent prediction model. Use the supplied `/analyze` command to research the resulting legs.

Sportsbook selection: `/prop-parlay sport:nfl book:DraftKings legs:4` or choose FanDuel or Hard Rock Bet Florida in Discord's book option. The same option is available for /parlay, /props, /moneyline, /ml, and /td slate. Each ticket uses one selected sportsbook; availability depends on the provider's returned markets. Omitting book defaults to Hard Rock Bet Florida.

Copying picks: /parlay and /prop-parlay now include a private Copy picks into chat text block. Copy its comma-separated full player names, exact lines and ATTD shorthand into a discussion channel. The bot does not post it publicly automatically.

/analyze-slip: Select sport and book, paste 1-12 comma-separated picks into picks. Supports ATTD, JSN, exact over/under lines (receps, rush yds, rec yds, pass yds, passing TDs and sport-specific points/rebounds/assists/hits/home runs/strikeouts/shots on goal), and Team ML. Review the exact matches and click Confirm and analyze. Unmatched names, ambiguous surnames and unavailable lines require correction and resubmission; no fuzzy substitution. The same sportsbook and sport apply to all legs. Ordinary chat messages are not automatically read.

Same-game prop tickets: set same_game:true on /prop-parlay to allow compatible categories from the same matchup. Default remains distinct games unless the operator enables ALLOW_CORRELATED_PROPS. No combined price or probability is calculated for same-game tickets. Missing category coverage is reported separately.

Prop-parlay date correction: from now means ONLY that calendar day in America/New_York; default today. Accepts YYYY-MM-DD, MM-DD-YY, or today. No fallback to later days. Use same_game:true for several legs from one matchup. Other slate commands retain their documented seven-day windows.
