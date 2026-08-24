# Iron Ledger

A strength-training and nutrition log in a single HTML file. No build step, no dependencies, no framework.

Hard sets, 2 × 6-8, a six-day push/pull/legs split, per-muscle volume, estimated 1RM trends, macro tracking with
photo-assisted entry, goals that read straight from the log, a coach you can pick from eight archetypes, and a
character who gets bigger only when your numbers do.

## The body on the front page

**Today** opens with a front-and-back muscle chart. The groups your split puts on the board that day are lit; the
rest stay dark, and brightness follows how many sets each one is getting. Once you start logging it switches from
the plan to what you have actually done. Because the chart reads your split, it is different every day, and Sunday
is simply dark.

## Your character

The last tab is **Character** — a bodybuilder you dress but do not inflate. Skin, hair, beard, gear, trunks and
pose are yours to set. His muscle is not: each of the eight regions is measured out of the log, from the volume
where that muscle does the work, your best estimated 1RM against your bodyweight, and every PR you have broken.
Strength only counts once the volume is there, so walking in strong does not hand you a finished physique.

Ten levels, Untrained through Monster. A week of honest training is about a level; a year gets you most of the way.
The Development list shows each region against where it stood thirty days ago, so you can see where you are actually
growing and where you are only busy.

He runs a full posing round on a loop — waves you in, front double biceps, abs and thighs,
side triceps turning into side chest, rear double biceps, most muscular, then stands back down. He does it on
the home page, in the sidebar, and on the way in.

Cosmetics: 14 hair styles and 10 colours, skin, beard, brow, gear (belt, wraps, shades, cap, chain), trunks,
nine ink options — upper-arm band, half sleeve, full sleeve, chest piece, sleeve + chest, back piece, leg
bands, or fully blacked out — and nine poses to hold when he is standing still.

## Eight coaches

**Coach** picks between eight schools of training, each credited to the lifter who made it famous:
Coleman-style volume, Cutler-style precision, Platz-style leg work, Levrone-style intuition,
Priest-style bluntness, Mentzer-style HIT, Bumstead-style classic physique, and Goggins-style
discipline. They are original coaching characters, not those men speaking — the credit is for the
method, and each prompt says so if asked. Renaming any of them is one tap.

Switching it on is one field on the Coach tab: paste an Anthropic API key, pick a model, done.
There is no separate setup screen and no key in this repository.

## Put it online (GitHub Pages)

1. Create a repository.
2. Add `index.html` and the empty `.nojekyll` file to the root.
3. **Settings → Pages → Build and deployment → Deploy from a branch → `main` / `/ (root)`** → Save.
4. Wait a minute, then open `https://YOURNAME.github.io/YOURREPO/`.

On a phone, use the browser's **Add to Home Screen** and it opens like an app.

`.nojekyll` stops GitHub trying to process the file as a Jekyll site. Without it the page still works, but adding it avoids surprises.

## Turn the coach on

Hosting is the part that matters — a normal `https://` origin can reach Claude's API, whereas the Claude Artifact preview cannot.

1. Get a key at **console.anthropic.com → API keys**.
2. Open your Pages URL → **Coach → gear icon → Option 1**.
3. Paste the key, press **Test**, then **Use this**.

The Coach tab now answers inline, using your actual numbers — this week's sets per muscle, your top estimated 1RMs, your split, and your macro targets against your 7-day averages.

### Is it safe to publish the repo?

Yes. **The key is never in the file.** It lives in the local storage of whichever browser you typed it into. Publishing the repository publishes the app, not your key and not your training data.

Anyone who finds your URL gets an empty Iron Ledger of their own. They cannot see your log — it is in your browser, not on the server. If they want the coach, they paste their own key and pay for their own usage.

The tradeoff to be aware of: anyone with access to *your* device can read the key out of that browser's storage. Use a key you are willing to rotate, and rotate it if the device is ever out of your hands.

## Your data

Everything is stored in your browser. There is no server and nothing is transmitted, except:

- the coach question, which sends only the context summary the Coach tab shows you
- meal photos, which never leave the device at all

Because it is browser storage, it is per-device and a cleared cache wipes it. **Profile → Export backup** writes a JSON file; **Restore** reads it back. That is also how you move to a new phone.

If the app ever detects that the browser will not persist (private browsing, usually) it says so in a banner at the top rather than silently losing your work.

## Optional: accounts and cross-device sync

Pages is static-only, so this needs one more service. Supabase gives you email/password accounts, sync across every device, and the option of keeping the API key on a server instead of in the browser.

See `supabase/DEPLOY.md`. Pages keeps hosting the app; Supabase supplies auth, the database, and the coach function. The same `index.html` handles both — it runs local-only until you enter the keys in Coach setup.

## Files

| | |
|---|---|
| `index.html` | the whole app |
| `.nojekyll` | tells Pages to serve the file as-is |
| `supabase/schema.sql` | table + row-level security, for the optional sync |
| `supabase/functions/ask/index.ts` | Edge Function that keeps the API key server-side |
| `supabase/DEPLOY.md` | setup for both coach routes |
