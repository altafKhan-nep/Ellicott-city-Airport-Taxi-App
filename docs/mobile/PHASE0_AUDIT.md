# Phase 0 — Mobile Audit (RideTaxi)

Phase 0 deliverable for the mobile conversion (see `../MOBILE_APP_PLAN.md`).
Grounded in the current web app (`client/`) and backend (`server/`).

---

## 1. Screen-by-screen mapping

Web routes come from `client/src/App.jsx`. Web `Navbar`/`Footer` become a bottom tab bar
(on `(tabs)`) or a stack header on detail screens.

| # | Web route | Web page | Mobile destination | Access | Port notes |
|---|---|---|---|---|---|
| 1 | `/` | marketing/Home.jsx | **Tab: Home** | Public | Hero → static branded image (drop three.js taxi); booking card → link to Book tab; service areas, testimonials, "why us" reuse web copy |
| 2 | `/services` | marketing/Services.jsx | **Home > Services list** (stack) | Public | Grid → vertical list cards driven by `services.js` |
| 3 | `/services/:slug` | marketing/ServiceDetail.jsx | **Service detail** (stack) | Public | Same data; CTA "Book now" → pre-fills serviceType on Book tab |
| 4 | `/about` | marketing/About.jsx | Home > About (stack) | Public | Simple content screen |
| 5 | `/fleet` | marketing/Fleet.jsx | Home > Fleet (stack) | Public | Driven by `vehicles.js`; charter CTA → Contact |
| 6 | `/contact` | marketing/Contact.jsx | Home > Contact (stack) | Public | Quote form → `mailto:chriskbonsu@gmail.com`; `tel:(410) 365-5556` via `Linking` |
| 7 | `/careers` | marketing/Careers.jsx | Home > Careers (stack) | Public | Driver application form + PDF links |
| 8 | `/reservations` | passenger/Reservations.jsx | **Tab: Book** (the Uber core) | Public (request → login) | Port `LocationSearch` + `BookingMap` + drivers strip + ETA; bottom-sheet booking card |
| 9 | `/login` | pages/Login.jsx | **Auth stack** | Public | Google/Facebook via `expo-auth-session`; re-enable phone OTP |
| 10 | `/register` | pages/Register.jsx | **Auth stack** | Public | Same |
| 11 | `/forgot-password` | pages/ForgotPassword.jsx | **Auth stack** | Public | Email reset link |
| 12 | `/reset-password` | pages/ResetPassword.jsx | **Auth stack** | Public | Token from email deep link |
| 13 | `/verify-email` | pages/VerifyEmail.jsx | **Auth stack** | Public | Deep link from email |
| 14 | `/auth/social` | pages/SocialCallback.jsx | **Auth stack** (hidden) | Public | Store tokens from query; replace with `expo-auth-session` native handler |
| 15 | `/rides/history` | passenger/RideHistory.jsx | **Tab: Rides** | passenger | FlashList; pay/edit/track actions |
| 16 | `/rides/track/:id` | passenger/RideTracking.jsx | **Ride stack: Track** | passenger | Live map + ETA + pay/refund/edit; socket events |
| 17 | `/profile` | pages/Profile.jsx | **Tab: Profile** | auth | Edit name/phone/avatar, change password, push prefs, avatar via `expo-image-picker` |
| 18 | `/driver` | driver/Dashboard.jsx | **Driver stack (own tab)** | driver | `ride:new` feed, accept/start/complete, availability toggle, background location |
| 19 | `/admin` | admin/Dashboard.jsx | **Admin: web-only for v1** (defer) | admin | Desktop CRM; port later if needed |

**Deferred to v2:** Admin dashboard, 3D taxi hero, PWA web-push (web keeps it).

---

## 2. Backend reuse audit

The `server/` API is fully reusable as-is. Requirements for mobile:

1. **HTTPS host + CORS**: deploy backend publicly (Render/Railway), set `TRUST_PROXY=true`,
   widen `CLIENT_ORIGIN` for the mobile origin(s). Native apps bypass CORS (no browser
   same-origin), but the web app still needs it.
2. **No auth changes**: Passport JWT + opaque rotating refresh tokens work unchanged.
   Token storage moves to `expo-secure-store`.
3. **Socket.io**: `socket.io-client` works in React Native; same events
   (`authenticate`, `ride:join`, `driver:location`, `passenger:location`, `ride:new`,
   `ride:update`, `driver:location`, `notification:new`).
4. **Payments**: Stripe PaymentIntent flow reused (`payment-intent` → confirm → `pay`).
5. **One addition needed (Phase 6):** `POST /api/notifications/expo-token` to register
   Expo push tokens, plus an Expo branch in `notificationService.notify()`.

---

## 3. Data reuse plan (existing web data)

### a. `client/src/data/services.js` → `mobile/src/data/services.js`
- Copy `SERVICES` (10 services) verbatim — slugs are stored on `Ride.serviceType` and used
  for matching; keep slugs stable.
- Replace the `lucide-react` icon references with Ionicons equivalents:

| Service slug | lucide icon | Ionicons |
|---|---|---|
| airport | `Plane` | `airplane` |
| corporate | `Briefcase` | `briefcase` |
| wedding | `Gem` | `diamond` |
| prom | `PartyPopper` | `champagne` |
| shuttle / charter | `Bus` | `bus` |
| night-out | `MoonStar` | `moon` |
| funeral | `Heart` | `heart` |
| school | `School` | `school` |
| valet | `Car` | `car` |

### b. `client/src/data/vehicles.js` → `mobile/src/data/vehicles.js`
- Copy `VEHICLES` (9 ids) verbatim — ids are stored on `Ride.vehicleType` /
  `User.driverDetails.vehicleType` and used for driver matching. Keep ids stable.
- Replace `Car` / `CarFront` / `Bus` icons with `car` / `car-sport` / `bus`.

### c. Design tokens (`client/src/index.css` → NativeWind theme)
Copy the values verbatim into the NativeWind theme (class names stay the same):

- `brand-50..950` (red scale; `brand-700 #c62828`, `brand-500 #e53935`)
- `accent-50..900` (neutrals; `accent-900 #0b0d0f`)
- `gold-50..700` (`gold-400 #f4b942`)
- `surface #ffffff`, `ink #0b0d0f`, `muted #667085`, `paper #f8f9fa`
- Fonts: `--font-sans` Inter → system font stack; `--font-display` Fraunces → a serif
  fallback (or bundle the font in v2).

### d. Map pin styles (`index.css` § Map pins)
Recreate as RN marker components:
- `map-pin-start` green circle (#10b981, white ring) — pickup
- `map-pin-dropoff` brand-700 — dropoff
- `map-pin-driver` brand-600 + `pin-pulse` (Reanimated loop) — live driver
- `map-pin-vehicle` white circle + brand-600 border — idle vehicles
- `map-pin-user` blue dot + `user-pulse` — "you are here"

### e. Business info (used by Contact/Footer/Careers)
`(410) 365-5556`, `chriskbonsu@gmail.com`, 9019 Early April Way, Ellicott City, MD →
constants file used with `Linking.openURL` (`tel:`, `mailto:`, Apple/Google Maps directions).

### f. Motion tokens
`.rise-in`, `.card-lift`, `.reveal` → Reanimated timing curves
`cubic-bezier(0.22, 1, 0.36, 1)`; `prefers-reduced-motion` → `AccessibilityInfo`.

---

## 4. Decisions (Phase 0)

1. **Stack:** React Native + Expo (TypeScript), expo-router, NativeWind, react-native-maps,
   @stripe/stripe-react-native, socket.io-client, Reanimated.
2. **`mobile/` as a sibling of `client/`** inside `ride-app/` (no monorepo tooling in v1).
3. **Admin stays web-only for v1.**
4. **3D hero dropped** for v1 (static branded hero image).
5. **Web data reused** by copying `services.js` / `vehicles.js` into `mobile/src/data/`
   with a 1:1 icon swap.
6. **Phone OTP re-enabled** on mobile (backend already supports it).

## 5. Tooling check

- Node v25.8.1, npm 11.18.0 available — meets Expo SDK requirements.
- Not a git repo yet; recommend `git init` before scaffolding `mobile/`.

## 6. Proposed next step (Phase 1)

Spike: scaffold the Expo app (`create-expo-app`), add NativeWind, copy the theme tokens,
port `api.js` (SecureStore token store), and prove the loop — `Reservations` booking +
map + socket tracking against the existing server.