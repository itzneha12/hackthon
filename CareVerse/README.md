# CareVerse — SilverGuard AI

A no-build elderly-care coordination demo. The existing CareVerse screens and modules are preserved, with a unified sea-glass theme, an explicit Gemini connection test, a safer optional server proxy, and local browser reminders.

## Files

- `index.html` — app shell and assistant panel
- `styles.css` — design system and responsive theme
- `app.js` — app state, screens, actions and local assistant
- `features.js` — wellness, vitals, family wall, tasks, journal, expenses and backup
- `analytics.js` — dashboard analytics and charts
- `voice.js` — multilingual voice, speech input and translation
- `config.js` — optional API endpoints and model selection
- `server.js` — optional Node.js Gemini proxy (keeps the API key server-side)
- `manifest.webmanifest`, `sw.js`, `icon.svg` — installable/offline shell

## Run the app without Gemini

1. Keep all files in the same folder.
2. Open that folder in VS Code.
3. Start Live Server on `index.html` (or any local static server).
4. Choose a demo profile. The local assistant, care records and offline shell work without a Gemini key.

## Enable real Gemini responses (recommended: server proxy)

Requirements: Node.js 18 or newer and a Gemini API key created in Google AI Studio.

1. Open a second terminal in this folder.
2. Set the key in that terminal only. Do not paste it into chat, source code, GitHub or screenshots.

   **Windows PowerShell**

   ```powershell
   $env:GEMINI_API_KEY="YOUR_KEY_HERE"
   node server.js
   ```

   **macOS / Linux**

   ```bash
   GEMINI_API_KEY="YOUR_KEY_HERE" node server.js
   ```

3. In `config.js`, set:

   ```js
   window.CAREVERSE_AI_URL = 'http://localhost:3000/api/ai';
   ```

4. Refresh CareVerse, sign in, open Settings and choose **Test AI connection**.
5. A successful test displays “Connected successfully”. If it fails, the exact connection error is shown and local answers remain available.

The proxy uses `gemini-3.8-flash` by default. You can override it with the `CAREVERSE_AI_MODEL` environment variable.

### Direct browser-key mode (demo only)

If you cannot run the proxy, you can enter a Gemini key in Settings. It is held only in page memory and cleared when the page is refreshed; it is not written to localStorage. However, browser-based keys can still be inspected by someone with access to the browser, so do not use this for a public deployment.

## Voice and language

- Browser speech output depends on voices installed in the current browser/OS.
- Speech recognition requires browser support and microphone permission; it is not available in every browser.
- Translation to languages beyond the built-in UI languages requires internet access and explicit consent.
- Cloud TTS requires a working voice endpoint or a compatible Gemini TTS setup. The text assistant can work even when speech is unavailable.

## Browser reminders

Enable browser notifications in Settings, then switch the app to **Use real time**. Reminders are generated locally while the app is open and the browser grants notification permission. They are not emails and are not delivered while the app is closed.

## Important demo limitations

- CareVerse is a coordination/reminder prototype, not a medical device. It does not diagnose, prescribe or recommend dosage changes.
- Demo records are stored in this browser's localStorage. This is not encrypted multi-user cloud storage.
- Demo profile switching is not production authentication. The responder PIN and share-link display are demo-only, not secure remote access.
- SOS, family feed, refill requests and caregiver notifications update the local demo feed; they do not send SMS, email or push messages to other people.
- Real email reminders, multi-device sync, secure accounts, server-side access control and production audit logs need a proper backend and email/notification provider.

## Updating the app

The service worker cache name is versioned in `sw.js`. If you change core files again, increment the `CACHE` value so installed copies fetch the new files.


## Latest hackathon update — family chat and SOS
- The Family Wall now has quick messages (Good morning, Good night, medicine reminder, water reminder and How are you?) plus a normal message box.
- Pressing SOS from Elder Mode creates a priority message in the shared Family Wall for Ravi Kumar and Sunita Rao. Family Mode shows an SOS banner with an Open message action and a Call 112 link.
- Important demo limitation: this is still browser-local/shared-browser behaviour. It does **not** send SMS, WhatsApp or push messages to another person's phone. Real remote delivery needs a deployed backend and a messaging provider.
- Theme refreshed to a premium lilac/indigo and warm ivory palette.
