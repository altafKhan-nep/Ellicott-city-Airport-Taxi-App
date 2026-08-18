# RideTaxi Mobile App Plan

Goal: convert the existing RideTaxi web app (`client/` + `server/`) into a modern, smooth,
fully responsive native app for **iOS and Android**, replicating the web design and the
Uber-style ride experience. The backend (`server/`) is already a clean REST + Socket.io API
and is **reused with almost zero changes**.

Status of this doc: **Phase 0 (audit) complete** — see
[`docs/mobile/PHASE0_AUDIT.md`](mobile/PHASE0_AUDIT.md) for the screen-by-screen mapping.

---

## 1. Approach decision

| Option | Reuse existing code | Native feel | Maps / Push / Background location | Effort | Fit |
|---|---|---|---|---|---|
| **React Native + Expo (chosen)** | API layer + business logic (~70%); UI ported to RN | Native, Uber-like | `react-native-maps` (Apple/Google), `expo-notifications`, `expo-task-manager` background location | 6–10 weeks | Best long-term; right for the driver app |
| Capacitor (web-wrap) | ~100% (SPA in WebView) | WebView feel | Leaflet OK; background location + native push need plugins | 1–3 weeks | Fastest listing, not truly native |
| PWA only | ~100% | Good in browser | No reliable background location | Days | Weak for a driver app |
| Flutter | ~0% (full rewrite) | Native | Excellent | 12+ weeks | Only if team is Dart-first |

**Decision: React Native + Expo.** It is a UI port, not a rewrite. All auth, rides, payments,
notifications, socket and admin logic in `server/` stays untouched.

---

## 2. Architecture

```
ride-app/
├── server/                    # UNCHANGED — host on HTTPS + widen CORS
├── client/                    # Web app (kept as-is)
├── docs/
│   ├── MOBILE_APP_PLAN.md     # this doc
│   └── mobile/
│       └── PHASE0_AUDIT.md    # screen/backend/data audit (Phase 0 deliverable)
└── mobile/                    # NEW Expo app (sibling of client/)
    ├── app/                   # expo-router file-based routes (mirror web pages/)
    │   ├── (tabs)/            # Passenger bottom tabs: Home, Book, Rides, Profile
    │   ├── driver/            # Driver dashboard + earnings
    │   ├── admin/             # Admin (v2, or web-only)
    │   ├── auth/              # Login, Register, Forgot/Reset, OTP
    │   └── ride/              # Track, History, Payment
    ├── src/
    │   ├── theme/             # NativeWind config — port index.css tokens verbatim
    │   ├── api/               # PORT client/src/services/* (axios + socket.io-client)
    │   ├── data/              # COPY of client/src/data (services, vehicles) — icons swapped
    │   ├── components/        # RN equivalents of web components
    │   └── hooks/             # useSocket, useAuth, useGeolocation ports
    └── app.config.js          # EAS Build + env config
```

Porting decisions:

- **Router:** expo-router (file-based; closest to react-router v6).
- **Styling:** NativeWind v4 — reuse Tailwind class names; copy `brand-*` / `accent-*` /
  `gold-*` tokens from `client/src/index.css` into the NativeWind theme (tokens, not new
  values — "change values in the theme, never in components" applies here too).
- **Icons:** swap `lucide-react` for `@expo/vector-icons` (Ionicons) with a 1:1 mapping
  (see data reuse below).
- **3D hero taxi (`three.js`):** drop for v1; replace with a static branded hero image.
  Port `prefers-reduced-motion` handling to `AccessibilityInfo.isReduceMotionEnabled()`.
- **Maps:** replace Leaflet with `react-native-maps`; decode OSRM polylines with
  `@mapbox/polyline`; recreate the pin set (`map-pin-start` green, `map-pin-dropoff`
  brand-red, pulsing `map-pin-driver`) with animated RN markers.

---

## 3. Phases

### Phase 0 — Audit (done — see docs/mobile/PHASE0_AUDIT.md)
Screen-by-screen mapping, backend reuse check, data reuse plan, scope decisions.

### Phase 1 — Foundation
1. `npx create-expo-app` (TypeScript + expo-router template) + NativeWind + Tailwind v4.
2. Port all service files from `client/src/services/` (axios + socket.io-client are
   isomorphic). Replace the Vite proxy (`client/vite.config.js`) with
   `process.env.EXPO_PUBLIC_API_URL`.
3. Swap `localStorage` token store (`api.js:25-56`) for `expo-secure-store`; keep the
   queued-refresh + per-role token pattern intact.
4. Copy `services.js` + `vehicles.js` into `mobile/src/data/` with icons replaced.

### Phase 2 — Auth
1. Login/Register/Forgot/Reset screens mirroring `Login.jsx` / `Register.jsx` (red
   `btn-brand-gradient` CTAs, pill inputs).
2. Google/Facebook login → `expo-auth-session` (ASWebAuthenticationSession / Custom Tabs);
   same redirect flow, backend untouched.
3. Re-enable phone OTP — backend endpoints already exist (`POST /api/auth/otp/send|verify`).
4. Optional: biometric unlock via `expo-local-authentication`.

### Phase 3 — Maps + Booking (the Uber core)
1. `react-native-maps` (Apple Maps iOS, Google Maps Android) + `@mapbox/polyline` for OSRM
   routes; two-layer polyline for the white-cased brand-red (#c62828) route.
2. Port `Reservations.jsx` flow: `LocationSearch` → `GET /api/places/search`,
   `GET /api/drivers/nearby`, `GET /api/drivers/:id/eta` + dashed route; bottom-sheet
   booking card (`@gorhom/bottom-sheet`).
3. Port `RideTracking.jsx` onto existing socket events (`ride:update`, `driver:location`,
   `passenger:location`); keep ~2s position throttling.

### Phase 4 — Driver app + background location
1. `expo-location` + `expo-task-manager` for background location broadcast to the existing
   `driver:location` socket flow (Android foreground-service permission required).
2. Driver dashboard (`driver/Dashboard.jsx`) → RN feed consuming `ride:new` per-driver
   `user:{id}` rooms; accept/start/complete actions.

### Phase 5 — Payments
1. `@stripe/stripe-react-native`: reuse the exact PaymentIntent flow
   (`POST /rides/:id/payment-intent` → `clientSecret` → confirm). No backend changes.
2. Cash + sandbox fallback already built in — free for dev/test builds.
3. Preserve the `idempotencyKey` / sparse-unique double-charge protection.

### Phase 6 — Push notifications
1. Replace web-push with `expo-notifications` (APNs + FCM via Expo Push Service).
2. Add `POST /api/notifications/expo-token` (register device token) and an Expo branch in
   `notificationService.notify()`. Keep web-push for the web app.

### Phase 7 — Performance + polish
1. Reanimated v4 for the pulse/parallax/bob animations replacing GSAP.
2. `expo-image` for cached avatars, `FlashList` for long lists, `react-native-svg` markers.
3. Splash, app icon (red + gold), haptics, skeleton loaders, offline empty-states.

### Phase 8 — Build + stores
1. EAS Build → `.ipa` + `.aab`; TestFlight + Play Internal Testing.
2. EAS Update for OTA patches.
3. Store submission: privacy policy, permission strings, review sandbox account,
   real `STRIPE_SECRET_KEY`, HTTPS API host.

---

## 4. Best practices

- **Design consistency:** reuse token values from `index.css`; never hardcode new hexes in
  components (route #c62828 is the only allowed raw hex, matching the web).
- **Auth security:** SecureStore-only tokens, HTTPS everywhere, refresh-queue pattern ported
  verbatim (`api.js` already solves the race).
- **Realtime discipline:** only targeted rooms (`ride:{id}`, `user:{id}`); throttle positions.
- **Performance:** map-marker memoization, polyline decode off the JS thread, socket
  debounce/batching.
- **Reduced motion + accessibility** from day one.

---

## 5. Open questions for the team

1. Target: consumer app, driver app, admin app — all three, or passenger first?
2. `mobile/` app versioning: same build or split passenger/driver apps?
3. Do we need OTP re-enabled on web too, or mobile only?
4. Monetization is outside scope (no in-app purchases needed for rides).