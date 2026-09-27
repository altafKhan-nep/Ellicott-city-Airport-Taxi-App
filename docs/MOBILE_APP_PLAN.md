# Ellicott City Airport Taxi — Mobile App

The mobile app is the **web client wrapped in a native shell with Capacitor**. The React UI in
`client/` is the app; `android/` and `ios/` are thin native containers that host it and add
store packaging, permissions and platform conventions.

> **Superseded:** this file previously specified a React Native + Expo rewrite. That approach was
> **rejected and never implemented** — the repo contained no `mobile/` directory, only an older
> copy of the web client. See "Why Capacitor" below.

---

## 1. Why Capacitor, and not React Native

The requirement was to keep the **existing mobile UI exactly as it was built**. That rules out a
React Native rewrite: every screen would have to be re-created in RN, forcing Leaflet →
`react-native-maps`, dropping the 3D hero, and re-deriving the entire design system. The result
would be *similar* to the current UI, not the same UI.

| Approach | UI reused | Time to store | Verdict |
|---|---|---|---|
| **Capacitor (chosen)** | 100% — same React bundle | 1–2 weeks | Same UI by construction |
| React Native / Expo | ~0% — full rewrite | 6–10 weeks | Rejected: UI would change |
| PWA only | 100% | days | No store listing; kept as a fallback |

**The trade-off, stated plainly:** a WebView app cannot do true background location. A driver app
ideally broadcasts position with the screen off. In v1 the driver broadcasts only while the app is
open. If that proves unacceptable, the fix is a background-location plugin (or porting *only* the
driver screen to RN) — not a rewrite of the whole app.

---

## 2. How the two apps share data

**There is no sync code, and that is the point.** Both apps are clients of one API, and that API
reads one MongoDB (`ellicottaxi`). A ride booked on the phone is in the web admin immediately,
because there is only ever one copy of the data.

```
  client/ (web, Vercel)  ─┐
                          ├─→  https://ridetaxi-api.onrender.com  ─→  MongoDB "ellicottaxi"
  client/ (Capacitor app) ┘
```

The repository's own `server/` was **deleted** (recoverable at commit `fc0b284`). A second backend
writing to the same database is a split-brain waiting to happen, and the copy had already drifted
6 weeks behind the real one.

**The mobile client is configured by one variable** (`client/.env`):

```
VITE_API_URL=https://ridetaxi-api.onrender.com
```

`client/src/services/api.js` uses it for **both** REST (`axios`) and Socket.io, so a device build
reaches the shared backend with no code change. Leave it empty to develop against a local backend
through the Vite proxy.

> **Never point two apps at the same database unless they should share it.** The `ridetaxi`
> database on a dev machine belongs to a different project. The shared database here is
> `ellicottaxi`.

---

## 3. What had to change to make sharing work

Sharing is mostly configuration, but two things genuinely blocked it.

### 3.1 Socket authentication (client fix)

The server accepts **only** a JWT on the socket handshake and deliberately has no `userId`/`role`
fallback, because a client-asserted role can be forged:

```js
// server/src/config/socket.js — server
const token = socket.handshake.auth?.token || ...;
```

The mobile client was still sending the old shape, so every connection was anonymous. Verified
against a running server:

| Handshake sent | Server's verdict |
|---|---|
| `{ userId, role: 'admin' }` (old) | `Socket connected: … user:anon role:-` |
| `{ token }` (current) | `Socket connected: … user:6ab8c59… role:passenger` |

An anonymous socket means **no driver location, no `ride:update`, no notifications** — the app
would look alive while being functionally frozen. Fixed in two non-UI files:

- `client/src/services/socketService.js` — `readAccessToken()` + `connectSocket(role)`
- `client/src/context/AuthContext.jsx` — `connectSocket(user.role)`

### 3.2 CORS allowlist (server fix)

The WebView sends its own origin, not the web app's: `capacitor://localhost` on iOS,
`https://localhost` on Android. A single-origin allowlist blocks both.

`server/src/config/env.js` now exports `corsOrigins()`, and `CLIENT_ORIGIN` stays a **single**
origin because it is also the base URL for verification links in outgoing email. Extra frontends
go in the separate `CORS_ORIGINS` variable; the native origins are always admitted.

**This change must be deployed to Render** or the app is CORS-blocked in release builds.

---

## 4. Layout

```
ellicot-app/
├── client/                  # the app — React UI (unchanged from the web client)
│   ├── src/                 # pages, components, services (api.js, socketService.js)
│   ├── android/             # NEW — native Android project
│   ├── ios/                 # NEW — native iOS project
│   ├── capacitor.config.json
│   └── .env                 # VITE_API_URL → shared API (gitignored)
└── docs/
```

## 5. Workflow

```bash
cd client
npm install
npm run build          # REQUIRED before every sync — webDir is dist/
npx cap sync android   # or: npx cap sync ios
npx cap open android   # opens Android Studio
```

Rebuilding is not optional: Capacitor copies `dist/` into the native project, so a stale build
silently ships the previous version of the app.

## 6. Platform configuration that is already done

| Concern | Where | Note |
|---|---|---|
| Location permission | `android/app/src/main/AndroidManifest.xml` | The app calls `navigator.geolocation` directly, so the permission must be **declared**; Capacitor's `WebChromeClient` turns the WebView prompt into the runtime request |
| HTTPS only | `AndroidManifest.xml` → `usesCleartextTraffic="false"` | The API is HTTPS; no cleartext downgrade |
| iOS usage strings | `ios/App/App/Info.plist` | Location/camera/photo strings — **iOS terminates the app** if these are missing |
| 64-bit | `Info.plist` → `arm64` | Replaced the template's obsolete `armv7` |
| WebView origin | `capacitor.config.json` → `androidScheme: "https"` | Makes the Android origin `https://localhost` |

## 7. Known limitations (v1, all deliberate)

1. **No background location.** A driver's position is broadcast only while the app is open. Needs
   a foreground-service plugin and a Play Store justification.
2. **No push notifications.** Web push needs a service worker, which a WebView does not reliably
   provide. The Profile screen detects this and shows its fallback. Native push needs
   `@capacitor/push-notifications` + an APNs/FCM setup.
3. **Leaflet CSS loads from a CDN** (`unpkg`) with an SRI hash — fine online, broken offline.
   Vendor it into `client/public/` before relying on the app without a connection.
4. **Store assets are placeholders** — the default Capacitor icon and splash screen. Replace with
   the brand's red/gold assets before submitting.
5. **Admin CRM is cramped on a phone.** It works, but it is a desktop tool.

## 8. Before store submission

- [ ] Android SDK installed, then `npx cap open android` → build a debug APK
- [ ] Xcode installed, `pod install` in `ios/App`, then build for a device
- [ ] Deploy the CORS change to Render and confirm `access-control-allow-origin: capacitor://localhost`
- [ ] Replace the app icon and splash screen
- [ ] Set `VITE_STRIPE_PUBLISHABLE_KEY` and confirm the server has a live `STRIPE_SECRET_KEY`
- [ ] Register OAuth redirect URIs for the native app scheme, or hide those buttons
- [ ] Privacy policy covering location, camera and photo-library access
- [ ] A real `VITE_API_URL` baked into the **release** build (see §5 — a debug build can silently
      point at localhost)
