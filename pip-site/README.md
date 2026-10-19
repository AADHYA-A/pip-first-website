# Pip's First Website

Track 1 entry for haX.baby "Baby's First Website": a portfolio for Pip, Junior Dream Engineer at the Midnight Nursery.

Plain HTML, CSS and JavaScript. No build step, no libraries, no external fonts, images or audio files. Optional Supabase backend for a shared guestbook and counter.

## Files

    index.html            the page (all illustrations are inline SVG)
    style.css             styling, day/night, Chaos Mode, responsive rules
    script.js             all interactions, sound, backend client
    config.js             your Supabase keys + optional official-art file names
    supabase-schema.sql   database tables, security rules, throttles
    assets/               drop the official Pip images here (optional, see below)

## Run it

Open `index.html`, or serve the folder: `python3 -m http.server 8000`

## Deploy (before the 19 Oct 17:17 IST freeze)

- **Netlify:** drag the whole folder onto app.netlify.com/drop.
- **GitHub Pages:** push to a public repo, then Settings > Pages > deploy from `main` / root.
- **Vercel / Cloudflare Pages:** import the repo, no build command, output directory `.`

## Commit history (required)

The brief needs a public repo with commits dated 17-19 Oct 2026:

    git init && git add . && git commit -m "Pip's first website"

## Backend setup (live guestbook + shared counter, about 5 minutes)

Optional: without it the guestbook saves per-browser and the page says so.

1. Create a free project at supabase.com.
2. **SQL Editor > New query**, paste all of `supabase-schema.sql`, click **Run**.
3. **Project Settings > API**: copy the **Project URL** and the **anon public** key.
4. Paste them into `config.js` (`SUPABASE_URL`, `SUPABASE_ANON_KEY`). Never use the `service_role` key.
5. Redeploy. The wall's status line changes to "Live wall: everyone who visits sees these wishes."

What the schema enforces in the database itself: visitors can read visible wishes and add a wish (name max 24, message max 120, and only those two columns are writable). They cannot edit or delete anything, cannot set `hidden`, and cannot edit the counter directly; it only goes up by one through a function, at most once per second. More than 5 new wishes in 10 seconds are rejected. To hide a bad entry, tick `hidden` on its row in **Table Editor > guestbook**.

Client side: hidden honeypot field for bots, 15 second cooldown per visitor, small profanity mask, plain-text rendering (no HTML injection), refresh every 20 seconds while the tab is open, and a graceful fallback if the backend is unreachable.

## Using the official Pip art (optional)

The built-in Pip and all scenes are original SVG illustrations. To use the official asset pack as well: download it from the brief, put the images in `assets/`, and set their file names in `config.js` under `ASSETS` (`musicBox`, `lantern`, `portrait`, `wave`). They appear in the Lullaby Lab, Nightlight Collection, beside the Growth Chart, and as a small Pip that follows the cursor on desktop. A footer credit is added automatically. Nothing is requested until a file name is set, so an empty folder causes no console errors.

## What is in it

| Brief requirement | Where |
|---|---|
| What they are | Hero: illustrated Pip (waves, blinks, leans toward your pointer), facts list, chat |
| What they do | Six projects: Lullaby Lab, Nightlight Collection, Rattle & Block Toys, Dream Delivery Routes, Dream Maker, Bedtime Storybook, plus the Growth Chart |
| Their story | Four illustrated scroll-revealed scenes, parallax moon, progress bar |
| Immersion | Eyes follow cursor/touch, head tilt, blinking, giggles, sound with mute, chat |
| Mobile-friendly | Tested from 320px to 2560px, portrait and landscape, touch swipe, 40px+ tap targets |
| Easter eggs | Three (see below) |

**Tier 1:** cursor-following eyes, scroll-driven story, day/night mood toggle, responsive layout, Easter egg.

**Tier 2:** Web Audio music box with tempo and mute, flashlight Dream Attic, scroll-synced SVG delivery route, interactive storybook (buttons, swipe, arrow keys), balance-the-tower mini-game.

**Tier 3:** live guestbook with a real backend (Supabase), Pip remembers returning visitors and their name, Pip chats back in character (rule-based), Lighthouse 99 / 100 / 100 / 100.

**Side quests:** live guestbook, sparkle cursor trail, hit-counter odometer (shared across visitors once the backend is on), click sounds with mute, Responsive Chaos Mode.

**Dream Maker (the standout):** pick a place, a creature and a feeling, add your name, and get a unique illustrated dream card with a story and a lullaby generated from your choices. The same choices always give the same dream; a different name gives a different one. Download the card as a PNG, or "deliver" it to raise the dream counter.

### Secrets (spoilers)

1. Tickle the nightcap pompom three times: secret lullaby and falling stars.
2. Tap Pip's floating "z" three times: Pip falls asleep and snores. Tap or press Esc to wake him.
3. Tell Pip about pancakes in the chat.

### Responsive Chaos Mode

The Chaos button turns on a scrapbook personality that reads the screen's size and shape. Tall, wide and square screens each get a different layout. Accent hue, card tilt and the number and position of floating nursery stickers all change as you resize or rotate.

## Testing done

All in headless Chromium (Playwright), against the final code:

- 54 interaction checks in local mode (eyes, moods, mute, all secrets, music box, lamps, blocks, storybook, chat, guestbook escaping, Chaos Mode, returning-visitor memory): all pass, zero console errors.
- 18 backend checks against a mock server, including failure cases: all pass.
- 13 backend checks against a real Postgres 16 + PostgREST (the stack Supabase uses) running the shipped `supabase-schema.sql`: all pass. Abuse attempts (fake hidden/created_at, oversized text, update, delete, direct counter edit, flooding, script-run counter) are all refused. This found and fixed two real bugs.
- 17 Dream Maker checks (determinism, hostile names, PNG download, mute, deliver): all pass.
- 31 mobile checks: 9 screen sizes with and without Chaos Mode (no horizontal overflow), touch-only taps, a real touch swipe on the storybook, vertical scrolling still works, every control at least 40px.
- axe-core accessibility audit: 0 violations in all 8 combinations of desktop/phone, day/night, Chaos on/off.
- Lighthouse (mobile): Performance 99, Accessibility 100, Best Practices 100, SEO 100.

## Honest limits

- **Not tested in real Safari, Firefox or on a physical phone.** Only Chromium was available. Code that Safari might not support is guarded or has a fallback, but please open the live site on an iPhone and an Android phone before submitting.
- On iPhones the hardware silent switch also mutes web audio; the page's mute button is separate. Sound starts after the first tap, as browsers require.
- The backend was verified against a local Postgres + PostgREST, not a live Supabase project. After you add your keys, post one test wish on the deployed site and confirm it appears.
- The chat is rule-based keyword matching, not an AI model.
- Without `config.js` filled in, the guestbook and counter are local to each visitor's browser.

## Credits

All art is hand-built inline SVG and CSS; emoji are drawn by the visitor's own device font. Sound is synthesized with the Web Audio API. The storybook, dream text, jokes and chat lines were written for this project. Code was written with AI assistance (Claude by Anthropic) and edited by the builder. Pip's canon comes from the haX.baby brief. Official asset pack images, if you add them, are credited automatically in the footer.

## Before you submit

1. Fill in `config.js`, redeploy, post one test wish.
2. Put your name or team in the footer credits.
3. Write the short "story behind your build" for the submission form.
4. Make the repo public (with commits dated 17-19 Oct) and check the live URL on a phone.
