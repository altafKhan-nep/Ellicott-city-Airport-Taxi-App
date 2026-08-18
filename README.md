# Ellicott City Airport Taxi App (RideTaxi)

A full-stack ride-booking application (passenger, driver, admin) with real-time ride tracking, maps, payments, and an editorial design system (RED-led). Built with React (Vite) frontend, Express + Socket.io backend, MongoDB, and Leaflet/OpenStreetMap.

---

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Design system (overview)](#design-system-overview)
- [Project structure](#project-structure)
- [Quick start (development)](#quick-start-development)
- [Environment variables](#environment-variables)
- [Running tests & linting](#running-tests--linting)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [Troubleshooting & gotchas](#troubleshooting--gotchas)
- [License](#license)
- [Contact / Credits](#contact--credits)

---

## Features

- Passenger booking flow with pickup & dropoff selection
- Real-time driver location and ride tracking via Socket.io
- Interactive maps using Leaflet + OpenStreetMap
- Stripe Payment Intents + cash option
- Authentication (local, OAuth2) + JWT
- SMS/OTP sign-in (Twilio) with console fallback in dev
- Admin dashboard for rides, drivers, users, and payments
- Responsive UI with Tailwind CSS and a brand-first design system

---

## Tech stack

- Frontend: React 18 + Vite, React Router v6
- Styling: Tailwind CSS
- Maps: Leaflet + OpenStreetMap
- Backend: Node.js, Express, Socket.io
- Database: MongoDB + Mongoose (geospatial queries)
- Payments: Stripe (Payment Intents)
- Auth: Passport.js (local + OAuth2 + JWT)
- Email: Nodemailer (SMTP, console fallback)
- SMS/OTP: Twilio (console/dev fallback)
- Security: Helmet, express-rate-limit

---

## Design system (overview)

This project uses a RED-led design system. Key points:

- Design tokens live in `client/src/index.css` inside the Tailwind `@theme` block. Keep token names stable (`brand-*`, `accent-*`, `gold-*`, `ink`, `muted`, `paper`).
- Red is the primary brand (nav/hero/footer/CTA). Gold is used as an accent on red surfaces. Blacks/grays are contrast only.
- Pills everywhere: rounded-full inputs, buttons, chips.
- Map-specific colors are exceptions: pickup green `#10b981`, dropoff red (brand-700), driver pulsing red (brand-600), idle vehicles white with black border.
- Route polyline color is brand red `#c62828` (white casing) — implemented in `BookingMap.jsx` and `RideTracking.jsx`.
- Use layered shadows for depth (`.card-lift`), avoid heavy borders.

---

## Project structure

Top-level layout (trimmed):

ride-booking/
├── client/                  # React frontend (Vite)
│   ├── src/
│   │   ├── components/      # Reusable UI (auth/, maps/, rides/, ui/, layout/, three/)
│   │   ├── pages/           # Route pages (marketing/, passenger/, driver/, admin/)
│   │   ├── data/            # shared services.js (nav + marketing)
│   │   ├── hooks/           # useSocket, useGeolocation, useAuth
│   │   ├── context/         # AuthContext
│   │   └── services/        # api.js, authService.js, socketService.js, rideService.js, paymentService.js, etc.
│   └── public/              # sw.js (web-push service worker)
├── server/                  # Express backend
│   ├── src/
│   │   ├── controllers/
│   │   ├── models/          # Mongoose schemas (including geospatial)
│   │   ├── routes/
│   │   ├── services/        # payments, notifications, email, twilio adapters, etc.
│   │   └── sockets/         # socket.io event handlers
├── .env.example
└── README.md (this file)

---

## Quick start (development)

Prerequisites:
- Node.js 18+ / npm
- MongoDB (local or Atlas)
- Optional: Stripe test keys, Twilio test credentials

Install & run:

```bash
# Install dependencies
cd client && npm install
cd ../server && npm install

# Environment setup
cp .env.example .env   # Add MongoDB URI, JWT secrets, Stripe keys

# Run dev servers (separate terminals)
cd client && npm run dev    # http://localhost:5173
cd server && npm run dev    # http://localhost:5001
```

macOS gotcha: Port 5000 is frequently taken by system services (ControlCenter/AirPlay). Backend defaults to port 5001—if you change it, update `client/vite.config.js` proxy targets.

---

## Environment variables

Populate `.env` from `.env.example`. Typical keys used by the app:

- MONGODB_URI=your-mongo-uri
- JWT_SECRET=your-jwt-secret
- JWT_EXPIRES_IN=1d
- STRIPE_SECRET_KEY=sk_test_...
- STRIPE_PUBLISHABLE_KEY=pk_test_...
- TWILIO_ACCOUNT_SID=...
- TWILIO_AUTH_TOKEN=...
- TWILIO_PHONE_NUMBER=...
- SMTP_HOST=...
- SMTP_PORT=...
- SMTP_USER=...
- SMTP_PASS=...
- NODE_ENV=development
- PORT=5001

Note: In development, email and SMS services fall back to console outputs if not configured.

---

## Running tests & linting

- Frontend: `cd client && npm run test` (if tests present)
- Backend: `cd server && npm run test`
- Linting: `npm run lint` in each workspace (if configured)

(If the repo has no test scripts configured yet, consider adding Jest/React Testing Library for the client and Jest/Supertest for API tests.)

---

## Deployment

- Recommended: Host frontend (Vite) on Netlify / Vercel, backend on Heroku / Render / Railway, MongoDB on Atlas.
- Set environment variables in the hosting platform.
- Configure CORS and allowed origins, ensure Socket.io transport works behind any proxy.
- In production, set NODE_ENV=production and ensure HTTPS endpoints for Stripe & OAuth callbacks.

---

## Contributing

- Fork the repo and open a branch for your feature/fix: `git checkout -b feat/your-feature`
- Keep commit messages clear and atomic.
- Submit PRs against the default branch with a description of the change and testing steps.
- Follow the existing design tokens — change color values only, not token names.

---

## Troubleshooting & tips

- Map tiles not loading? Check network and Leaflet/OpenStreetMap usage limits. Make sure client can reach tile endpoints.
- Socket.io issues behind proxies: allow `websocket` and `polling` transports and ensure server proxy forwards upgrade headers.
- Geospatial queries: ensure 2dsphere index is present on location fields in MongoDB.
- Payment issues: use Stripe test cards and review webhook signing secret if using webhooks.

---

## Acknowledgements

- Leaflet / OpenStreetMap
- Stripe
- Passport.js
- Tailwind CSS

---

## License

MIT License — see LICENSE file for details.

---

## Contact

Maintainer: altafKhan-nep

For questions, issues, or feature requests, please open an issue on the repository.
