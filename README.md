# World War 4: The Card Game

A browser-based, six-nation take on War — singleplayer vs bots and real-time multiplayer via Firebase — shipped as an installable PWA.

**iPhone is the primary target** (delivered as a PWA rather than a native app, which would need a Mac and an Apple Developer account). Android is supported too — maskable icons and haptics are in place for it.

### Installing on iPhone

iOS has no install prompt, so it's manual: open the site in **Safari** (not Chrome — only Safari can add to the home screen), tap **Share → Add to Home Screen**. The `apple-mobile-web-app-*` tags and `apple-touch-icon` make it launch standalone with a proper icon and no browser chrome.

Two iOS limitations worth knowing:

- **No haptics.** iOS Safari does not implement the Vibration API, so the feedback layer is sound-only on iPhone. The code is already there for Android.
- **Sound and the silent switch.** iOS routes Web Audio through the "ambient" session, which the ring/silent switch mutes. `fx.js` sets `navigator.audioSession.type = 'playback'` to opt out — that works on **Safari 16.4+**. On older iOS, flip the ring switch on to hear anything.

## Files

| File | What it is |
|---|---|
| `index.html` | Singleplayer (1v1 / 2v2 / 3v3 vs bots) — also the site's home page |
| `ww4-multiplayer.html` | Real-time multiplayer (1v1 / 2v2 / 3v3), Firebase Realtime Database |
| `how-to-play.html` | Rules, the six nation abilities, and the ability resolution order |
| `fx.js` | Shared feedback layer — Web Audio tones + haptics, with a persisted mute toggle |
| `fonts.css` + `fonts/` | Self-hosted Bebas Neue / Barlow Condensed (latin + latin-ext) |
| `manifest.json` | Web app manifest — install/home-screen metadata |
| `sw.js` | Service worker — offline caching of the app shell |
| `icon-192.png` / `icon-512.png` | App icons, `purpose: any` (full-bleed artwork) |
| `icon-maskable-192.png` / `icon-maskable-512.png` | App icons, `purpose: maskable` (artwork inset into the 80% safe zone) |
| `ww4-logo.png` | Logo asset used by the multiplayer page |
| `devserver.py` | Local dev server that sends `no-store`, so edits are never masked by cache |
| `netlify.toml` | Deploy config — keeps the service worker from going stale on Netlify's CDN |

Both game pages are intentionally self-contained single-page apps (styles + game logic inline) — no build step, no bundler. Fonts are self-hosted rather than loaded from the Google Fonts CDN, so the typography survives offline.

## Running locally

Service workers require `http://`, not `file://`, so opening `index.html` directly won't let the PWA install/offline features work.

```bash
python devserver.py 5500
```

Then open `http://localhost:5500`. The service worker deliberately unregisters itself on localhost (see `IS_DEV` in `index.html`) so a reload always shows current code.

To test on a phone on the same Wi-Fi, use the machine's LAN IP instead of `localhost` — e.g. `http://192.168.1.x:5500`. Windows Firewall must allow inbound Python on the **Private** profile.

### Multiplayer setup

Multiplayer needs a Firebase project — the `firebaseConfig` object is near the top of `ww4-multiplayer.html`'s script.

The game uses **no authentication**, so the Realtime Database rules must allow unauthenticated access to `/rooms`:

```json
{
  "rules": {
    "rooms": {
      ".read": true,
      ".write": true
    }
  }
}
```

Do not use Firebase's default *test mode* rules — they carry a `now < <timestamp>` expiry and silently start returning `Permission denied` about 30 days later. The multiplayer page runs a health check on load and reports the failure on the setup screen if this happens.

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
