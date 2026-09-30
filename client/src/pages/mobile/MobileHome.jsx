import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  MapPin,
  Flag,
  ArrowRight,
  ChevronRight,
  Clock,
  Plane,
  LogIn,
  History,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { listRides } from '../../services/rideService.js';
import { SERVICES } from '../../data/services.js';
import { vehicleLabel } from '../../data/vehicles.js';
import { Card, SectionBar, StatusPill } from '../../components/mobile/MobileUI.jsx';

const ACTIVE = ['pending', 'accepted', 'arriving', 'in_progress'];

/** Services that are genuinely "pick a ride for this" rather than a page. */
const RIDES = ['airport', 'corporate', 'wedding', 'shuttle'];
const PAGES = [
  { to: '/fleet', label: 'Fleet' },
  { to: '/services', label: 'Services' },
  { to: '/contact', label: 'Contact' },
];

const greet = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

/** Field height. A field carries a label plus a value, so it is taller than the
    44px dot that sits beside it. */
const FIELD = 64;
const GAP = 12;
/** The dot's band. The two bands are deliberately SHORTER than the field column
    (48 x 2 = 96 against 64 x 2 + 12 = 140), and the rail takes the remaining
    44px. Sizing them equal left the rail with nothing and it collapsed to 0. */
const DOT_BAND = 48;

const ASSURANCES = ['Licensed & insured', 'Cash accepted', '24/7'];

// Phones only.
//
// The page has one job, so it is built as one hero and everything else is
// deliberately quiet. The booking card is the only elevated surface, the only
// vivid control, and the only thing above the fold that asks for anything.
export default function MobileHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rides, setRides] = useState([]);

  useEffect(() => {
    if (!user) {
      setRides([]);
      return;
    }
    let cancelled = false;
    listRides()
      .then(({ data }) => !cancelled && setRides(data.rides || data || []))
      .catch(() => !cancelled && setRides([]));
    return () => {
      cancelled = true;
    };
  }, [user]);

  const activeRide = useMemo(() => rides.find((r) => ACTIVE.includes(r.status)), [rides]);

  // Recent places come from this passenger's own history, so they are addresses
  // they have actually used rather than invented suggestions.
  const recents = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const r of rides) {
      if (ACTIVE.includes(r.status)) continue;
      const a = r.pickup?.address;
      if (!a || seen.has(a)) continue;
      seen.add(a);
      out.push(a);
      if (out.length === 6) break;
    }
    return out;
  }, [rides]);

  const quickServices = RIDES.filter((slug) => SERVICES.some((s) => s.slug === slug));

  return (
    <div className="px-[var(--m-gutter)] pb-2 pt-4">
      {/* ---- Greeting: context, not a headline. It stays out of the hero's way. */}
      <header className="mb-4 flex items-baseline justify-between gap-3">
        <p className="text-[15px] font-semibold text-muted">
          {greet()}
          {user && <span className="text-ink">, {user.name.split(' ')[0]}</span>}
        </p>
        {!user && (
          <Link to="/login" className="text-[13px] font-bold text-brand-700">
            Sign in
          </Link>
        )}
      </header>

      {/* ---- A live ride outranks the hero: it is time-sensitive. */}
      {activeRide && (
        <Link
          to={`/rides/track/${activeRide._id}`}
          className="mb-[var(--m-section)] block rounded-[var(--m-radius-card)] bg-brand-gradient p-4 text-white shadow-[var(--m-shadow-brand)] transition-transform active:scale-[0.99]"
        >
          <div className="flex items-center justify-between gap-3">
            <StatusPill tone="gold" pulse={activeRide.status !== 'pending'}>
              {activeRide.status === 'pending' ? 'Finding a driver' : 'Ride in progress'}
            </StatusPill>
            <ArrowRight className="h-4 w-4 shrink-0 text-gold-300" />
          </div>
          <p className="mt-2.5 line-clamp-1 text-sm font-bold">{activeRide.pickup?.address}</p>
          <p className="mt-0.5 text-xs text-white/70">Tap to track your driver</p>
        </Link>
      )}

      {/* ================= THE HERO =================
          The only elevated surface on the screen and the only vivid control.
          Three bands — heading, the two location fields, the button — with a
          quiet reassurance strip inside the card so it never floats loose. */}
      <Card className="p-0 shadow-[var(--m-shadow-hero)]">
        <div className="px-[var(--m-card-pad)] pb-3 pt-4">
          <h1 className="text-[19px] font-bold leading-tight text-ink">Where to?</h1>
        </div>

        <div className="flex gap-3 px-[var(--m-card-pad)] pb-4">
          {/* The route rail is a flex child between the dots, so it is always
              exactly the gap and shares their centre line. `items-center` is
              load-bearing: without it the zero-width rail's border renders at
              the column edge instead of under the dots. */}
          <span aria-hidden="true" className="flex w-11 shrink-0 flex-col items-center">
            <span className="flex items-center" style={{ height: DOT_BAND }}>
              <span className="grid h-11 w-11 place-items-center rounded-full bg-success-50 text-success-700">
                <MapPin className="h-5 w-5" />
              </span>
            </span>
            <span className="w-0 flex-1 border-l-2 border-dashed border-accent-300" />
            <span className="flex items-center" style={{ height: DOT_BAND }}>
              <span className="grid h-11 w-11 place-items-center rounded-full bg-brand-50 text-brand-700">
                <Flag className="h-5 w-5" />
              </span>
            </span>
          </span>

          <span className="flex flex-1 flex-col" style={{ gap: GAP }}>
            {[
              { label: 'Pickup', hint: 'Where are you now?' },
              { label: 'Drop off', hint: 'Where to?' },
            ].map((f) => (
              <span
                key={f.label}
                className="flex items-center justify-between gap-2 rounded-[var(--m-radius-inner)] bg-accent-50 px-4"
                style={{ height: FIELD }}
              >
                <span className="min-w-0">
                  <span className="block text-[10px] font-bold uppercase tracking-[0.08em] text-muted">
                    {f.label}
                  </span>
                  <span className="mt-0.5 block truncate text-[15px] font-semibold text-ink">
                    {f.hint}
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-accent-400" />
              </span>
            ))}
          </span>
        </div>

        {/* btn-brand-gradient, not bg-brand-gradient: the band gradient runs
            #084274 -> #04203a, nearly black, and reads as a heavy slab.

            It is a pill inset into the card, not a full-bleed bar. Full-bleed
            gave it border-radius 0px, so it read as part of the card's
            furniture rather than a button you can press. */}
        <div className="px-[var(--m-card-pad)]">
          <Link
            to="/reservations"
            className="btn-brand-gradient flex w-full items-center justify-center gap-2 rounded-full py-[1.05rem] text-base font-bold text-white transition-transform active:scale-[0.98]"
          >
            Book a ride
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>

        {/* Reassurance is part of the offer, on the card's own surface. */}
        <div className="safe-bottom flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-[var(--m-card-pad)] pb-[var(--m-card-pad)] pt-3.5">
          {ASSURANCES.map((a, i) => (
            <span key={a} className="flex items-center gap-1 text-[11px] font-semibold text-muted">
              {i > 0 && <span className="text-accent-300">·</span>}
              <ShieldCheck className="h-3.5 w-3.5 text-success-600" />
              {a}
            </span>
          ))}
        </div>
      </Card>

      {/* ---- Everything below is quiet by contract: flat surfaces, smaller type,
              and never a second vivid control competing with the hero. ---- */}

      {recents.length > 0 && (
        <section className="mt-[var(--m-section)]">
          <SectionBar
            action={
              <span className="flex items-center gap-1 text-[11px] font-semibold text-muted">
                <History className="h-3 w-3" />
                sets pickup
              </span>
            }
          >
            Recent
          </SectionBar>
          <div className="scroll-x mt-2.5 -mx-[var(--m-gutter)] px-[var(--m-gutter)]">
            {recents.map((address) => (
              <button
                key={address}
                type="button"
                onClick={() => navigate('/reservations')}
                className="flex w-52 items-center gap-2.5 rounded-full bg-surface py-2 pl-2 pr-3.5 text-left shadow-[var(--m-shadow-card)] active:bg-accent-50"
              >
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[var(--m-icon-bg)] text-[var(--m-icon-fg)]">
                  <Clock className="h-3.5 w-3.5" />
                </span>
                <span className="truncate text-[13px] font-semibold text-ink">{address}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="mt-[var(--m-section)]">
        <SectionBar>Services</SectionBar>
        <div className="mt-2.5 grid grid-cols-4 gap-2">
          {quickServices.map((slug) => {
            const s = SERVICES.find((x) => x.slug === slug);
            if (!s) return null;
            const Icon = s.icon || Plane;
            return (
              <Link
                key={slug}
                to="/reservations"
                className="flex flex-col items-center gap-2 rounded-[var(--m-radius-inner)] bg-surface px-[var(--m-tile-pad-x)] py-[var(--m-tile-pad-y)] text-center shadow-[var(--m-shadow-card)] active:bg-accent-50"
              >
                <span className="grid h-10 w-10 place-items-center rounded-full bg-[var(--m-icon-bg)] text-[var(--m-icon-fg)]">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="line-clamp-2 text-[11px] font-bold leading-tight text-ink">
                  {s.short || s.name}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {!user && (
        <Link
          to="/login"
          className="mt-[var(--m-section)] flex items-center justify-center gap-2 rounded-[var(--m-radius-card)] bg-surface py-4 text-sm font-bold text-brand-700 shadow-[var(--m-shadow-card)] active:bg-accent-50"
        >
          <LogIn className="h-4 w-4" />
          Sign in to book and track rides
        </Link>
      )}

      <nav className="mt-5 flex items-center justify-center gap-6">
        {PAGES.map((p) => (
          <Link
            key={p.to}
            to={p.to}
            className="text-[13px] font-semibold text-muted active:text-brand-700"
          >
            {p.label}
          </Link>
        ))}
      </nav>

      {user?.driverDetails?.vehicleType && (
        <p className="mt-4 text-center text-xs text-muted">
          Your vehicle: {vehicleLabel(user.driverDetails.vehicleType)}
        </p>
      )}
    </div>
  );
}
