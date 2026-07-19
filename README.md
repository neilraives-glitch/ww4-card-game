# World War 4: The Card Game

A browser-based, six-nation take on War — singleplayer vs bots and real-time multiplayer via Firebase — shipped as an installable PWA.

## Files

| File | What it is |
|---|---|
| `index.html` | Singleplayer (1v1 / 2v2 vs bots) — also the site's home page |
| `ww4-multiplayer.html` | Real-time multiplayer, Firebase Realtime Database |
| `manifest.json` | Web app manifest — install/home-screen metadata |
| `sw.js` | Service worker — offline caching of the app shell |
| `icon-192.png` / `icon-512.png` / `icon-180.png` | App icons (standard, maskable, Apple touch) |
| `ww4-logo.png` | Logo asset used by the multiplayer page |
| `netlify.toml` | Deploy config — keeps the service worker from going stale on Netlify's CDN |

Both HTML files are intentionally self-contained single-page apps (styles + game logic inline) — no build step, no bundler.

## Running locally

Service workers require `http://`, not `file://`, so opening `index.html` directly won't let the PWA install/offline features work.

1. Open this folder in VS Code
2. Install the recommended **Live Server** extension (VS Code will prompt you)
3. Right-click `index.html` → **Open with Live Server**
4. It'll open at `http://127.0.0.1:5500` — singleplayer works immediately

For multiplayer, you'll need your own Firebase project — the `firebaseConfig` object is near the top of `ww4-multiplayer.html`'s script.

## Special abilities

All six nations have one. Both `index.html` and `ww4-multiplayer.html` implement
the same set — metadata lives in the `NATIONS` array near the top of each script.

| Nation | Ability | Effect |
|---|---|---|
| 🇺🇸 USA | **First Strike** | Auto-wins a lone same-rank clash if only one side holds USA |
| 🇷🇺 Russia | **Fortify** | Lays 2 antes instead of 4 in a World War 4 tie |
| 🇨🇳 China | **Mass Mobilization** | Winning a round seizes 2 cards from the enemy's stock |
| 🇮🇷 Iran | **Asymmetric** | A 6 or lower beats a J, Q, K or A outright |
| 🇮🇱 Israel | **Iron Dome** | Cancels the *opposing* side's ability for the round |
| 🇹🇼 Taiwan | **Chokepoint** | A same-rank clash re-flips instead of escalating to war |

**Resolution order matters** and is encoded explicitly in `resolveFlip`
(`resolveFlipHost` in multiplayer):

1. **Iron Dome** — evaluated first, so it can suppress any of the others.
   Both sides fielding Israel cancels out and no ability fires.
2. **Chokepoint** — de-escalates before a clash can become a war
3. **First Strike** — resolves the clash if it wasn't de-escalated
4. **Asymmetric** — decided before totals are compared
5. **Fortify** — applies once a tie sends the round to war
6. **Mass Mobilization** — applies after a win is settled

## Coalition bonus

A winning team whose flipped cards are all from one bloc (west: USA/Israel/Taiwan,
east: Russia/China/Iran) scores a multiplier — 1.25x for two aligned cards, 2x for
three or more. Jokers break alignment.

## Deploying

Drag this whole folder onto [netlify.com/drop](https://app.netlify.com/drop). No config or build step needed — `index.html` becomes the home page automatically, `ww4-multiplayer.html` is reachable at `/ww4-multiplayer.html`.

Before going live, double check:
- Firebase Realtime Database rules allow read/write on the `rooms/` path
- The multiplayer share link uses `location.origin + location.pathname`, so it resolves correctly on whatever domain you deploy to — no changes needed
