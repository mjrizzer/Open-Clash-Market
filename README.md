# Clash Market

A responsive Clash-inspired marketplace built with React 19, TypeScript, Vite/Vinext, and Tailwind CSS. Hosted server routes run on Cloudflare Workers with a persistent D1 SQL database.

## Features

- Username/password registration and login; unique usernames are case-insensitive.
- Salted PBKDF2 password hashes and hashed, expiring HTTP-only cookie sessions.
- Town Hall 1–16, price, seller/nickname search, and sorting filters.
- Create listings, view contact information after login, and mark your own listings sold.
- Buyer/seller conversations with live Server-Sent Events (database checked every 1.5 seconds).
- Server-side room authorization and bidirectional messaging blocks; blocked sellers disappear from the blocker's feed.
- Private per-user aliases displayed throughout the feed and conversation list.
- Device-local saved-listing preferences, separated by signed-in account.
- Clearly marked illustrative sample listings. Samples are not real accounts and cannot receive messages.

## Local development

Requires Node 22.13+.

```sh
npm ci
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_green_xavin.sql
npm run dev
```

Apply the initial migration only once to a fresh local database. Later schema changes require new migrations (`npm run db:generate`). Hosted migrations are applied by Sites publication. Local test data is not deployed.

On Windows, if the npm shell shim cannot locate its own files, invoke npm's JavaScript entry point with Node, for example `node "C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js" run dev`.

## Validation

```sh
npx tsc --noEmit
node scripts/test-market.mjs
```

The integration script requires the local server at `http://127.0.0.1:5173`; it creates isolated test accounts and listings in local D1. It tests authentication, listing ownership, aliases, room privacy, live events, blocking, and logout. It refuses remote origins.

## Structure

- `app/components/Marketplace.tsx`: navigation, feed, filters, auth and listing forms, account management, and listing details.
- `app/components/MarketProvider.tsx`: authenticated application state, shared alias resolver, API adapter, and sample data.
- `app/components/ChatInterface.tsx`: live chat, nickname editor, and block controls.
- `app/components/TownHall.tsx`: original SVG village illustration.
- `app/api/market/route.ts`: authenticated API and server-side validation.
- `app/api/events/route.ts`: authorized SSE stream with reconnection support.
- `db/schema.ts` and `drizzle/`: users, sessions, listings, rooms, messages, blocks, private aliases, and login attempt limits.

## Behavior and limits

The site is privately hosted by default. App username/password accounts are separate from the hosting platform's visitor access gate. Saved bookmarks are device-local; accounts, listings, chat, blocks, and aliases are database-backed. Messages stream live; marketplace and conversation summaries refresh every ten seconds. Chat displays the latest 300 messages and the feed fetches up to 500 recent listings. This application facilitates contact and negotiation; it does not process payments or transfer game accounts. Password recovery, attachments, and moderation tooling are not included.

For a larger launch, add IP-wide distributed abuse protection, account recovery, pagination, retention policies for sessions/login attempts, and a push-based message broker. Do not expose the database binding or session credentials to the browser.
