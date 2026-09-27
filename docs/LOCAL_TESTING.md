# Local Testing

Run the **web app** and the **Capacitor app** against one local backend, on your machine, with no
production data involved.

```
web app    http://localhost:5173  ─┐
                                   ├─→  API  http://127.0.0.1:5001  ─→  MongoDB "ellicottaxi"
app UI     http://localhost:5174  ─┘
```

Both clients read and write the **same** database, so a ride you book in one is immediately visible
in the other. That is the point of the setup — it is what you are testing.

> Assumes the two repos sit side by side:
> - web app → `../ellicot-web`
> - mobile app → `.` (this repo)

---

## Contents

1. [Before you start](#1-before-you-start)
2. [Start the backend](#2-start-the-backend)
3. [Start the web app](#3-start-the-web-app)
4. [Start the mobile app](#4-start-the-mobile-app)
5. [Log in](#5-log-in)
6. [Test checklist](#6-test-checklist)
7. [Native builds (Android/iOS)](#7-native-builds-androidios)
8. [Reset local data](#8-reset-local-data)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Before you start

You need **Node 20.19+ or 22.12+** (Vite 7 requires it) and a running MongoDB.

```bash
node -v          # must print v20.19+ or v22.12+
```

Start MongoDB if it is not already running:

```bash
brew services start mongodb-community
```

> You do **not** need `mongosh` — the MongoDB shell. Everything here works without it.

---

## 2. Start the backend

Do this **first**. Both clients depend on it.

```bash
cd ../ellicot-web/server
npm install
cp .env.example .env
npm run seed
npm run dev
```

`cp .env.example .env` and `npm run seed` only need doing once.

You should see:

```
MongoDB connected: 127.0.0.1
Server running on http://localhost:5001
```

### Confirm it is alive

```bash
curl -s http://127.0.0.1:5001/api/settings
```

Expect JSON. If this fails, **stop here** — nothing else will work until it passes.

> **Why port 5001?** macOS ControlCenter/AirPlay usually occupies `5000`, so the API defaults to
> `5001`.

---

## 3. Start the web app

```bash
cd ../ellicot-web/client
npm install
npm run dev
```

Open **http://localhost:5173**.

---

## 4. Start the mobile app

The Capacitor app is a React app, so you can exercise **every screen** in a browser — no Android
Studio or Xcode required.

```bash
cd client
npm install
npm run dev -- --port 5174 --strictPort
```

Open **http://localhost:5174**.

### Important: blank out `VITE_API_URL`

Check what it is currently set to:

```bash
grep VITE_API_URL .env
```

You want it **empty**:

```
VITE_API_URL=
```

If it instead shows the production URL, blank it before continuing:

```bash
# macOS
sed -i '' 's|^VITE_API_URL=.*|VITE_API_URL=|' .env

# Linux
sed -i 's|^VITE_API_URL=.*|VITE_API_URL=|' .env
```

Leaving it set to `https://ridetaxi-api.onrender.com` means you are testing against **live
production data**, and anything you book, pay or dispatch will really happen on the live site.

When it is empty, each client calls same-origin `/api` and Vite forwards it to
`http://127.0.0.1:5001`. That is the local path you want.

> Remember to set it back to `https://ridetaxi-api.onrender.com` before building a release — the
> value is baked in at build time, and a release built with it empty will point at localhost and
> fail on a device.

### You now have two tabs

| Tab | URL | What it is |
|---|---|---|
| 1 | http://localhost:5173 | Web app |
| 2 | http://localhost:5174 | Mobile app UI |

### Use `localhost`, never `127.0.0.1`

They are **different origins** to a browser. Vite also binds only the IPv6 loopback, so
`http://127.0.0.1:5173` often does not connect at all. Always use `localhost`.

---

## 5. Log in

`npm run seed` creates these accounts:

| Role | Email | Password |
|---|---|---|
| Passenger | `passenger@ridetaxi.com` | `pass123` |
| Driver — sedan | `alex@ridetaxi.com` | `driver123` |
| Driver — SUV | `sam@ridetaxi.com` | `driver123` |
| Admin | `admin@ridetaxi.com` | `admin123` |

The seed also creates each account on the legacy `@ellicot.com` domain with the same password, so
either domain logs in. That is why a fresh seed has **8 users, not 4** — it is not stale data.

### Use two separate browser profiles

The apps store sessions per role, but a shared profile is the fastest way to get confused about who
is logged in. For the driver steps, open a **private/incognito window** (or a second browser
profile) and log in as the driver there, keeping the passenger logged in on the first.

---

## 6. Test checklist

Work through this **twice** — once on `5173`, once on `5174`.

### Public pages — no login

- [ ] `/` loads with the hero and booking card
- [ ] `/about`, `/services`, `/fleet`, `/contact`, `/careers` all load
- [ ] A service detail page loads, e.g. `/services/wedding`
- [ ] Phone and email links in the footer work

### Passenger

- [ ] `/login` works and lands you on the right home page
- [ ] `/reservations` — typing a pickup address shows suggestions
- [ ] Clicking a suggestion **closes the list** and fills the input
- [ ] The suggestion list draws **on top of** the header and map controls
- [ ] Dropoff works the same way, and a fare estimate appears
- [ ] Changing vehicle type updates the estimate
- [ ] Submitting takes you to `/rides/track/:id` showing "Finding you a driver…"

### Driver — second, private window

- [ ] `/driver` shows the pending ride that matches the driver's vehicle type
- [ ] Accepting it updates the passenger's tracking page to show the driver
- [ ] Advancing `arriving` → `in_progress` → `completed` works
- [ ] The driver marker moves live on the passenger's map
- [ ] The completed ride shows a final fare

### Payment — on the completed ride

- [ ] **Cash** settles without charging; status shows `cash`
- [ ] **Card** in sandbox mode (no `STRIPE_SECRET_KEY` set):
  - card ending **0000** → succeeds
  - card ending **0002** → declines
  - any other card → succeeds about 95% of the time
- [ ] Paying an already-settled ride returns the **same** payment, not a second charge
- [ ] Reusing a failed attempt's key is rejected with `409`

### Notifications

- [ ] A notification appears in the bell after booking and after accepting
- [ ] Clicking it deep-links to the ride
- [ ] The unread count clears once opened

### Admin — `admin@ridetaxi.com` / `admin123`

- [ ] `/admin` overview shows the ride and revenue
- [ ] Rides tab lists the ride; dispatch can assign and remove a driver
- [ ] Users tab search works; suspend / unsuspend works
- [ ] Payments tab shows the settled payment
- [ ] Settings tab edits fares and the payments toggle

---

## 7. Native builds (Android/iOS)

Browser testing covers all UI and API behaviour. It does **not** cover the native shell.

```bash
cd client
npm run build          # REQUIRED — cap sync copies client/dist into the native project
npx cap sync android
npx cap open android   # Android Studio
```

```bash
npx cap sync ios
npx cap open ios       # Xcode
```

Requires the Android SDK (`ANDROID_HOME`) and a full Xcode install.

**Skipped by browser testing:**

- native location permission prompts
- the real WebView origin (`capacitor://localhost` on iOS, `https://localhost` on Android) and its
  CORS behaviour
- push notification permission prompts
- APK/IPA packaging

**A phone cannot reach your laptop's `127.0.0.1`.** To test a device build against a local API you
need your machine's LAN IP and that origin allowlisted. The simpler route is to build against the
deployed `https://ridetaxi-api.onrender.com` once the CORS change is live.

---

## 8. Reset local data

Booking and testing create rides, payments and notifications. To go back to a clean seeded state,
**drop the database first**, then re-seed:

```bash
cd ../ellicot-web/server

node -e "import('mongoose').then(async m => { await m.default.connect('mongodb://127.0.0.1:27017/ellicottaxi'); await m.default.connection.db.dropDatabase(); await m.default.disconnect(); console.log('database dropped'); })"

npm run seed
```

> `npm run seed` on its own only resets users, locations and app settings — it does **not** clear
> rides, payments or notifications. The `dropDatabase` step above is what removes those, so do not
> skip it.

> **A driver can only hold one active ride.** A leftover `accepted` or `in_progress` ride makes
> `/driver` show an empty board, which looks like a bug but is not. Cancel the ride or reset.

---

## 9. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `blocked by CORS policy` | Origin not allowlisted | Add it to `CORS_ORIGINS` in `../ellicot-web/server/.env` |
| `127.0.0.1:5173` will not load | Vite binds the IPv6 loopback only | Use `localhost:5173` |
| Page loads but shows no data | `VITE_API_URL` points at production | Blank it so the Vite proxy is used |
| Driver board is empty | Driver already has an active ride, or has no location row | Cancel the ride, or re-run `npm run seed` |
| Changes to live production data | `VITE_API_URL` not blanked | Blank it and restart the dev server |
| Socket connects as `user:anon` | Handshake sent `{userId, role}` instead of `{token}` | See "Two things that silently break the app" in the README |
| Autocomplete returns nothing | Nominatim rate limit (1 req/s) | Wait a second and retry |
| App shows an old version | `cap sync` ran without a fresh build | `npm run build`, **then** `npx cap sync` |
| API will not start | Port `5001` already in use | Stop the other process, or set `PORT` and `VITE_PROXY_TARGET` together |
