# FootCard Core

Create the core foundation for "FootCard": A mobile-first, dark-themed Football Scout, Player Cards, and Comparison Platform.

INTERNATIONALIZATION (i18n / 35 POPULAR LANGUAGES SUPPORT):

- Configure react-i18next with a flexible translation system supporting the top 35 football nations/languages (including Turkish, English, Spanish, German, French, Italian, Portuguese, Dutch, Arabic, Japanese, Korean, Chinese, Russian, Greek, Polish, Croatian, Serbian, Scandinavian languages, Indonesian, Hindi, etc.).

- Add a sleek Language Selector dropdown in the top header with a searchable/scrollable list showing country flags and language names.

- Ensure text elements throughout the app (navigation, card attributes, filters, titles) pull dynamically from translation keys.

DESIGN SYSTEM & THEME:

- Dark Football Theme: Background (#0B0F17, #111827), Emerald Green (#10B981) for primary highlights, Amber/Gold (#F59E0B) for accents, and dark gray card container backgrounds (#1F2937).

- Layout: Mobile-first responsive UI. Bottom Navigation Bar for mobile devices, collapsible Sidebar for desktop screens. Use Lucide icons.

BOTTOM NAVIGATION ITEMS:

1. 🏠 Home (Ana Sayfa)

2. 🕵️ Scout (Scout)

3. ⚔️ Compare (Karşılaştır)

4. ⚽ Squad Builder (Kadro Kur)

5. 🏆 Competitions (Yarışmalar)

6. 👤 Profile (Profil)

HOME PAGE INITIAL LAYOUT:

- Top Header: "FootCard" branding, search bar placeholder, 35-Language Flag Selector, and profile/notification icons.

- Hero Banner: "Günün Oyuncusu / Player of the Day" widget.

- Quick Access Grids: Horizontal scrolling sections for "Popüler Oyuncular / Popular Players", "Popüler Takımlar / Popular Teams", "Geleceğin Yıldızları / Future Stars", and "Aktif Yarışmalar / Active Competitions".

Please generate this initial project layout with full 35-language dropdown support, responsive bottom nav, and placeholder routes for all 6 menu sections.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://footie-globe-card.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/8faa98a4-fbb7-4bb1-9563-4752276c56e9).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## API quota empty state & UTC-midnight auto refresh

API-Football free keys have a **daily request quota**. When it is exhausted the
provider returns an error body / `X-RateLimit-Remaining: 0` and every upstream
call is silently useless.

- **Detection** — `src/lib/api-football.server.ts` parses the
  `X-RateLimit-Remaining` header and the `errors.requests` / `errors.rateLimit`
  body fields and reports the state via `src/lib/system-status.server.ts`
  (`reportQuotaExhausted` / `reportUpstreamOk`).
- **UI** — `getSystemStatus` (server function, `system-status.functions.ts`) is
  read by Home and Live through the `useSystemStatus` hook. When the quota is
  exhausted these pages render `QuotaStateCard` — an honest, elegant
  "System updating / quota reached" empty state. **No mock/fabricated data is
  ever shown**; empty feeds stay empty and a clear card explains why.
- **UTC-midnight auto refresh** — `src/lib/midnight-refresh.server.ts` arms an
  in-process, self-rescheduling timer aligned to the next UTC 00:00 (when the
  quota resets). On firing it `bustCache`s the live/player prefixes so the next
  read re-fetches fresh data (rewritten to Supabase via the existing
  `api_cache` writer), then warms `getLiveFeed` + `getHomeWeeklyBest`. The
  timer is re-armed on every live-feed/status request.

**Honest limits**: this environment is Nitro SSR under a single long-running
Bun process, with **no guaranteed platform CRON daemon**. The mechanism is an
in-process timer, not a managed scheduler. It stays live for as long as the
process is running and receives traffic (every Home/Live request re-arms it),
but if the process is restarted and gets no requests before midnight, no timer
is armed until the next visit. On the deployed environment the Supabase
`SUPABASE_SERVICE_ROLE_KEY` may be absent, which makes `api_cache` writes /
`bustCache` no-ops there (already-documented infra constraint) — the code path
is correct wherever that key is present.
