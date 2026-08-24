# Getting answers inside Iron Ledger

Everything is configured from **Coach → gear icon** inside the app. You never edit this file.

One hard requirement first: **the Claude Artifact link cannot do this.** That copy runs in a sandbox that blocks every outbound request, so no key or setting will make it answer. Host the file yourself — drag it onto Netlify, or `npx vercel deploy --prod`. Any static host works; there's no build step.

Then pick one of two routes.

## Route A — straight to Claude (5 minutes, no server)

1. Get an API key at **console.anthropic.com → API keys**.
2. Host `iron-ledger.html` anywhere.
3. Open it → **Coach → gear → Option 1**, paste the key, press **Test**, then **Use this**.

Done. The Coach tab answers inline.

Your key is stored in that browser's local storage. It is never written into the file, your backup, or your synced ledger — so hosting the file publicly does **not** expose it. Anyone with access to that device can read it, so use a key you're willing to rotate. Roughly a cent per question.

## Route B — through your own server

Worth it if you want the key off the device, plus accounts and cross-device sync. Steps 1–6 below, then **Coach → gear → Option 2** and paste your project URL and anon key.

---

## 1. Create the project

1. supabase.com → **New project**. Note the region and database password.
2. **Project Settings → API** and copy:
   - Project URL — `https://xxxxxxxx.supabase.co`
   - `anon` / `public` key

The anon key is *meant* to be public. Row-level security in `schema.sql` is what keeps accounts apart — not key secrecy. Never put the `service_role` key in the HTML.

## 2. Create the table

**SQL Editor → New query** → paste all of `schema.sql` → **Run**.

That creates `public.ledgers` (one row per account, ledger stored as `jsonb`), turns on row-level security, and adds four policies so a signed-in user can only ever touch `auth.uid() = user_id`.

## 3. Point the app at it

Open `iron-ledger.html`, find the `SUPA` block near the top of the last script, and fill it in:

```js
const SUPA = {
  url:  'https://xxxxxxxx.supabase.co',
  anon: 'eyJhbGciOi...'
};
```

## 4. Host the file

Any static host works — there is no build step and no dependencies.

```bash
npx vercel deploy --prod
```

Netlify (drag the file onto the dashboard), Cloudflare Pages, or GitHub Pages are all equally fine. Then add your domain under **Authentication → URL Configuration → Site URL** so confirmation and reset emails link back to it.

## 5. Email settings

**Authentication → Providers → Email**:

- Leave **Confirm email** on for real security. Sign-up then asks the user to click a link before the first sign-in — the app tells them so.
- Turn it off if you want sign-up to log you straight in. Fine for a single-user log.

Supabase's built-in mailer is rate-limited to a handful of messages an hour. For anything beyond personal use, add SMTP under **Project Settings → Auth**.

## 6. The coach (optional)

Without this the Coach tab still works — it packages your numbers for you to paste into Claude. With it, the tab becomes a live chat.

```bash
npm i -g supabase
supabase login
supabase link --project-ref xxxxxxxx
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase functions deploy ask
```

Your API key stays in Supabase's secret store. The function refuses any caller without a valid JWT, so nobody can spend your tokens by finding the URL. It forwards only the context summary the Coach tab shows you — never photos, never your backup.

Get a key at console.anthropic.com. Each question runs a few thousand tokens, so a month of daily use costs cents.

---

## How sync behaves

- Every change queues a push, debounced by 1.5s, so a whole logged set is one write.
- On sign-in the app pulls your account copy. If the account has data it wins; if it's empty the current device seeds it.
- On launch it pulls again and adopts the remote copy only when it is newer than this device.
- The sync chip in the top bar reads **Saving… / Synced / Sync failed** and shows the error on tap.
- Offline still works — writes land in local storage and push when you're back.

**Last write wins.** Two phones logging different sessions at the same moment means the slower one overwrites. For one person that's a non-issue; if you ever want per-set merging, that's when the fifteen-table schema starts to earn its keep.

## What is stored where

| | |
|---|---|
| Ledger JSON (sessions, food, goals, measurements, split) | `ledgers.data` in your Postgres |
| Profile photo, meal photos | inside that JSON as small compressed thumbnails |
| Email + password | Supabase Auth — the app never sees the password |
| Anthropic API key | Supabase secret store, server-side only |

`profile.passHash` and `lockOnOpen` are stripped before upload — the local-only prompt stays local.
