# Ellicott City Airport Taxi — Mobile App

The iOS/Android app for Ellicott City Airport Taxi, built with **Capacitor** — the existing React UI
in a native shell — sharing **one backend and one database** with the web app.

Book a ride on your phone and it appears in the web admin instantly, because both apps are clients
of the same API reading the same MongoDB (`ellicottaxi`). There is no sync layer, and none is needed.

```
  Web app (Vercel) ─┐
                    ├─→  https://ridetaxi-api.onrender.com  ─→  MongoDB "ellicottaxi"
  This app (native) ┘
```

> The backend lives in the **web** repo. This repository contains no server.

---

## What's here

```
client/          # the app — React UI (Vite), hosted by Capacitor
  src/           # pages, components, services (api.js, socketService.js, …)
  android/       # native Android project
  ios/           # native iOS project
  capacitor.config.json
docs/            # architecture, deployment, product docs
```

## Quick start

```bash
cd client
npm install
cp .env.example .env      # then set VITE_API_URL (see below)
npm run build             # REQUIRED before every cap sync
npx cap sync android      # or: npx cap sync ios
npx cap open android      # build/run from Android Studio
```

`cap sync` copies `client/dist/` into the native project, so **you must build first** — a stale
build ships the previous version of the app.

To iterate quickly in a browser, `npm run dev` serves the same UI with the Vite proxy. Leave
`VITE_API_URL` empty for that to use a local backend. To run the web app and this app at the same
time, give them different ports and add the extra one to `CORS_ORIGINS` in the web repo's
`server/.env` — see [`docs/LOCAL_TESTING.md`](docs/LOCAL_TESTING.md).

## Configuration

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Backend origin for **both** REST and Socket.io. Set to `https://ridetaxi-api.onrender.com` to share the live data. Leave empty to use the local Vite proxy. |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key. Blank = the server's sandbox card simulator. |
| `VITE_GOOGLE_CLIENT_ID` / `VITE_FACEBOOK_APP_ID` | Enables the social login buttons. |

`.env` is gitignored. The API URL is **baked in at build time** — a release build made with
`VITE_API_URL` empty will point at localhost and silently fail on a device.

## Tech

| Layer | Choice |
|---|---|
| UI | React 18 + Vite + React Router v7, Tailwind CSS v4 |
| Shell | Capacitor 7 (Android + iOS) |
| Maps | Leaflet + OpenStreetMap |
| Realtime | Socket.io (`ride:update`, `driver:location`, `notification:new`, …) |
| Backend | The web repo's Express + Socket.io API (not in this repo) |
| Database | MongoDB `ellicottaxi` (shared with the web app) |

## Two things that silently break the app

1. **Socket auth.** The server accepts only a JWT on the socket handshake
   (`socket.handshake.auth.token`) and has no `userId`/`role` fallback, because a client-asserted
   role can be forged. `socketService.js` must send `{ token }`. Sending the old `{ userId, role }`
   connects as `user:anon` — the app looks alive but has **no driver location, no ride updates, no
   notifications**.
2. **CORS.** The WebView sends `capacitor://localhost` (iOS) or `https://localhost` (Android), not
   the web origin. These are allowed natively by the backend's `corsOrigins()`. If the app cannot
   reach the API, verify the backend's CORS allowlist has been deployed.

## Known limitations (v1)

- **No background location** — a driver broadcasts position only while the app is open.
- **No push notifications** — web push needs a service worker, which a WebView does not reliably
  provide. The Profile screen detects this and shows its fallback.
- **Leaflet CSS loads from a CDN** — works online, breaks offline.
- **Store assets are placeholders** — the default Capacitor icon and splash screen.
- **Admin CRM is cramped on a phone** — it works, but it is a desktop tool.

## Build requirements

- **Android:** Android Studio + Android SDK (SDK 35). Gradle 8.11.1 / AGP 8.7.2, JDK 17+.
- **iOS:** full Xcode (not just the Command Line Tools) + CocoaPods, then `pod install` in `ios/App`.

## Documentation

- [`docs/LOCAL_TESTING.md`](docs/LOCAL_TESTING.md) — run the web app and this app side by side
  locally, plus a manual test checklist
- [`docs/MOBILE_APP_PLAN.md`](docs/MOBILE_APP_PLAN.md) — architecture, why Capacitor, and the
  pre-store checklist
- [`AGENTS.md`](AGENTS.md) — full developer guide (design system, routes, data models, API contract)

## Acknowledgements

Leaflet / OpenStreetMap · Stripe · Passport.js · Tailwind CSS · Capacitor

## Contact

Maintainer: `altafKhan-nep` — (410) 365-5556 · chriskbonsu@gmail.com
