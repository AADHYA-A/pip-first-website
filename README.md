# Pip's First Website: The Midnight Nursery

A playful, illustrated portfolio for **Pip**, Junior Dream Engineer at the Midnight Nursery.
Built for the haX.baby **Baby's First Website** hackathon (Track 1, 17-19 October 2026).

> "I build the dreams you fall asleep inside."

**Live site:** https://pip-first-website.vercel.app/
**Source:** https://github.com/AADHYA-A/pip-first-website (the site lives in [`pip-site/`](pip-site/))

Plain HTML, CSS and JavaScript. No build step, no libraries, no external fonts, images or audio files.
Every illustration is inline SVG, and all sound is synthesized with the Web Audio API.
An optional Supabase backend powers a shared guestbook and visit counter.

---

## What to try

| Try this | Where |
|---|---|
| Move your mouse or finger and watch Pip's eyes and head follow | Hero |
| Scroll through four illustrated story scenes under a parallax moon | Story |
| **Dream Maker**: pick a place, a creature and a feeling, add your name, get a unique dream card (story and lullaby), and download it as a PNG | Work |
| Wind up the **Lullaby Lab** music box (tempo and mute) | Work |
| Shine the flashlight in the **Dream Attic** | Work |
| Follow the scroll-synced **Dream Delivery Route** | Work |
| Flip the **Bedtime Storybook** with buttons, swipes or arrow keys | Work |
| Stack the blocks in the balance-the-tower game | Work |
| Check Pip's **Growth Chart** | Growth |
| Leave a wish on the **Guestbook** wall and watch the shared counter | Guestbook |
| Chat with Pip (rule-based, in character) | Chat |
| Toggle **day/night** and **Responsive Chaos Mode**, then resize or rotate | Header |

### Secrets (spoilers)

1. Tickle the nightcap pompom three times for a secret lullaby and falling stars.
2. Tap Pip's floating "z" three times and Pip falls asleep and snores. Tap or press Esc to wake him.
3. Tell Pip about pancakes in the chat.

---

## Brief checklist

| Requirement | Where |
|---|---|
| What they are | Hero: illustrated Pip (waves, blinks, leans toward your pointer), facts list, chat |
| What they do | Six projects plus the Growth Chart |
| Their story | Four illustrated, scroll-revealed scenes with a progress bar |
| Immersion | Eyes follow cursor/touch, head tilt, blinking, giggles, sound with a visible mute button |
| Mobile-friendly | Responsive layout from 320px to 2560px, touch swipe, large tap targets |
| Hidden Easter egg | Three (see above) |

**Tier 1:** cursor-following eyes, scroll-driven story, day/night toggle, responsive layout, Easter egg.
**Tier 2:** Web Audio music box, flashlight Dream Attic, scroll-synced SVG delivery route, interactive storybook, block-stacking mini-game.
**Tier 3:** live guestbook with a real backend, Pip remembers returning visitors, Pip chats back, Lighthouse 90+.
**Side quests:** live guestbook, sparkle cursor trail, hit-counter odometer, click sounds with mute, Responsive Chaos Mode.

---

## Run it locally

```bash
cd pip-site
python3 -m http.server 8000
# open http://localhost:8000
```

Or just open `pip-site/index.html` in a browser.

## Project structure

```
pip-site/
├── index.html            the page (all illustrations are inline SVG)
├── style.css             styling, day/night, Chaos Mode, responsive rules
├── script.js             interactions, sound, backend client
├── config.js             Supabase settings and optional official-art file names
├── supabase-schema.sql   database tables, security rules, throttles
└── assets/               optional official Pip images (not used)
```

## Deploy

No build command is needed.

- **Vercel / Cloudflare Pages:** import the repo and set the **Root Directory** to `pip-site`. Leave the framework as "Other" and the build command empty.
- **Netlify:** drag the `pip-site` folder onto app.netlify.com/drop.
- **GitHub Pages:** serve from a root or `/docs` folder (GitHub Pages cannot serve from `pip-site/` directly).

## Backend setup (shared guestbook and counter)

Optional. Without it, the guestbook saves per browser and the page says so.

1. Create a free project at supabase.com.
2. Open **SQL Editor > New query**, paste all of `supabase-schema.sql`, and run it.
3. Open **Project Settings > API** and copy the **Project URL** (no `/rest/v1/` at the end) and the **anon / publishable** key.
4. Paste them into `config.js` as `SUPABASE_URL` and `SUPABASE_ANON_KEY`. Never use the `service_role` key.
5. Redeploy. The wall's status line changes to "Live wall".

What the schema enforces in the database itself:

- Visitors can read visible wishes and add one (name max 24, message max 120, only those two columns writable).
- They cannot edit or delete anything, set `hidden`, or edit the counter directly. The counter only goes up by one through a function, at most once per second.
- More than 5 new wishes in 10 seconds are rejected.
- To hide a bad entry, tick `hidden` on its row in **Table Editor > guestbook**.

Client side: a hidden honeypot field for bots, a 15-second cooldown per visitor, a small profanity mask, plain-text rendering (no HTML injection), a 20-second refresh while the tab is open, and a graceful fallback if the backend is unreachable.

## Using the official Pip art (optional)

The built-in Pip and all scenes are original SVG illustrations. To use the official asset pack as well, put the images in `pip-site/assets/` and set their file names in `config.js` under `ASSETS` (`musicBox`, `lantern`, `portrait`, `wave`). Nothing is requested until a file name is set, and a footer credit is added automatically. **This submission does not use the official pack.**

---

## Testing

Run in headless Chromium (Playwright) against the final code:

- 54 interaction checks in local mode (eyes, moods, mute, all secrets, music box, lamps, blocks, storybook, chat, guestbook escaping, Chaos Mode, returning-visitor memory), with zero console errors.
- 18 backend checks against a mock server, including failure cases.
- 13 backend checks against a real Postgres 16 + PostgREST (the stack Supabase uses) running the shipped `supabase-schema.sql`, including abuse attempts (fake `hidden`, oversized text, update, delete, direct counter edit, flooding).
- 17 Dream Maker checks (determinism, hostile names, PNG download, mute, deliver).
- 31 mobile checks across 9 screen sizes, with and without Chaos Mode (no horizontal overflow), touch-only taps and a real touch swipe on the storybook.
- axe-core accessibility audit across desktop/phone, day/night and Chaos on/off.
- Lighthouse (mobile): Performance 99, Accessibility 100, Best Practices 100, SEO 100.

## Known limits

- Tested in Chromium only, not in real Safari, Firefox or on a physical phone. Code Safari might not support is guarded or has a fallback.
- On iPhones the hardware silent switch also mutes web audio. The page's mute button is separate. Sound starts after the first tap, as browsers require.
- The backend rules were verified against a local Postgres + PostgREST, then used with a live Supabase project.
- The chat is rule-based keyword matching, not an AI model.

## Credits and AI disclosure

- **Code:** written with AI assistance (Claude by Anthropic), then reviewed, edited, tested and deployed by the builder. This includes the HTML, CSS, JavaScript and the Supabase schema.
- **Art:** all illustrations are original inline SVG and CSS, created with that AI assistance. Emoji are drawn by the visitor's own device font.
- **Sound:** synthesized live with the Web Audio API. There are no audio files.
- **Writing:** the storybook, dream text, jokes and chat lines were written for this project.
- **Libraries, fonts, templates:** none.
- **Character canon:** Pip and the Midnight Nursery come from the haX.baby "Baby's First Website" brief.

Built by AADHYA A for haX.baby 2026.
