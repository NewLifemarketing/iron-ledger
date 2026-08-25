# Coach on your own server

By default the coach calls Anthropic straight from the page, which means pasting
an API key into every browser you use. This puts the key on a server instead:
set it **once**, and after that any device just signs in and the coach works —
no key entry, ever.

You also get accounts and cross-device sync, so your log follows you between
phone and desktop instead of living in one browser.

The free tier covers all of this comfortably.

---

## 1. Make a project

**supabase.com** → sign in → **New project**. Any name and region; free plan is
fine. Note the database password. Wait for provisioning (a minute or two).

From **Project Settings → API**, copy two values — keep the tab open, you need
them in step 5:

| Value | Looks like |
|---|---|
| **Project URL** | `https://abcdefgh.supabase.co` |
| **anon public** key | `eyJhbGciOi...` (a long JWT) |

The anon key is *meant* to be public — it identifies your project, it does not
grant access. The row-level security in step 2 is what keeps accounts apart.
Never put the `service_role` key anywhere near the HTML.

## 2. Create the table

**SQL Editor → New query** → paste all of [`schema.sql`](schema.sql) → **Run**.

That creates `public.ledgers` (one row per account, the whole ledger as `jsonb`),
turns on row-level security, and adds policies so a signed-in user can only ever
touch `auth.uid() = user_id`.

## 3. Put your Anthropic key on the server

**Edge Functions → Secrets** (or Project Settings → Edge Functions), add:

| Name | Value |
|---|---|
| `ANTHROPIC_API_KEY` | your key from console.anthropic.com |

This is the whole point: the key lives here and never reaches a browser.

## 4. Deploy the function

Easiest route, no tooling — **Edge Functions → Deploy a new function**, name it
exactly `ask`, and paste the contents of
[`functions/ask/index.ts`](functions/ask/index.ts).

Or with the CLI:

```bash
winget install --id Supabase.CLI
```

```bash
cd /c/Users/jules/claude && supabase login
```

```bash
cd /c/Users/jules/claude && supabase link --project-ref YOUR_PROJECT_REF && supabase functions deploy ask
```

The project ref is the `abcdefgh` part of your project URL. If you add the
secret *after* deploying, redeploy so the function picks it up.

## 5. Point the app at it

Open the app → **Coach** → the panel at the top → **Or run it through your own
Supabase project** → paste the Project URL and the anon key → **Use my own
server**. Nothing to edit in the HTML.

Then add your site under **Authentication → URL Configuration → Site URL**
(`https://newlifemarketing.github.io/iron-ledger/`) so confirmation and reset
emails link back to it.

## 6. Make an account

The function only answers signed-in callers, so nobody who finds your URL can
spend your tokens. The app will ask you to create an account with an email and
password — **once per device**. The session is kept with a refresh token, so it
stays signed in after that. It is not a login every time you open the app.

Ask the coach something. If it answers, you are done.

---

## Email confirmation

Supabase emails a confirmation link before a new account works. For a personal
log that is usually just friction: **Authentication → Providers → Email** → turn
off **Confirm email**, and sign-up logs you straight in.

The built-in mailer is rate-limited to a handful of messages an hour. Beyond
personal use, add SMTP under **Project Settings → Auth**.

## If it does not work

| Symptom | Cause |
|---|---|
| "ANTHROPIC_API_KEY is not set on this project" | Step 3 skipped, or the secret was added after deploying — redeploy |
| "Not signed in" | Configured for the server route but no account yet — sign up in the app |
| "Anthropic returned 401" | The key in the secret is wrong or revoked |
| Answers work but nothing syncs | Step 2 skipped, so the `ledgers` table is missing |

## How sync behaves

- Every change queues a push, debounced by 1.5s, so a whole logged set is one write.
- On sign-in the app pulls your account copy. If the account has data it wins; if it is empty this device seeds it.
- On launch it pulls again and adopts the remote copy only when it is newer than this device.
- The sync chip in the top bar reads **Saving… / Synced / Sync failed**, and shows the error on tap.
- Offline still works — writes land in local storage and push when you are back.

**Last write wins.** Two phones logging different sessions at the same moment
means the slower one overwrites. For one person that is a non-issue.

## What is stored where

| | |
|---|---|
| Ledger JSON (sessions, food, goals, measurements, split) | `ledgers.data` in your Postgres |
| Profile photo, meal photos | inside that JSON as small compressed thumbnails |
| Email + password | Supabase Auth — the app never sees the password |
| Anthropic API key | Supabase secret store, server-side only |

`profile.passHash` and `lockOnOpen` are stripped before upload — the local-only
prompt stays local. Only the context summary the Coach tab shows you is ever
sent to the model, plus your question and the last few turns. Never photos,
never your backup.
