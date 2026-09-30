import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, Flag, ArrowRight, Clock, Plane, LogIn, History } from 'lucide-react';
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

// Phones only. The whole screen is built around ONE idea: get a ride. Everything
// else is deliberately quiet — the brand blue is reserved for the live-ride alert
// and the single booking button, so "blue" keeps meaning "act here".
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

  // Recent places come from the passenger's own history, so they are real
  // addresses they have actually used — not invented suggestions.
  const recents = useMemo(() => {
    const seen = new Set();
    const out = [];
    for (const r of rides) {
      if (ACTIVE.includes(r.status)) continue;
      const a = r.pickup?.address;
      if (!a || seen.has(a)) continue;
      seen.add(a);
      out.push({ address: a, lat: r.pickup?.lat, lng: r.pickup?.lng });
      if (out.length === 6) break;
    }
    return out;
  }, [rides]);

  const quickServices = RIDES.filter((slug) => SERVICES.some((s) => s.slug === slug));

  return (
    <div className="px-[var(--m-gutter)] pt-4">
      {/* Greeting — quiet by design; it is not the headline of the screen. */}
      <header className="mb-3 flex items-baseline justify-between gap-3">
        <h1 className="text-[19px] font-bold leading-tight text-ink">
          {greet()}
          {user ? `, ${user.name.split(' ')[0]}` : ''}
        </h1>
        {!user && (
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="text-[13px] font-bold text-brand-700"
          >
            Sign in
          </button>
        )}
      </header>

      <div className="stack">
        {/* A live ride outranks everything — it is the only other blue surface. */}
        {activeRide && (
          <Link
            to={`/rides/track/${activeRide._id}`}
            className="block rounded-[var(--m-radius-card)] bg-brand-gradient p-4 text-white shadow-[var(--m-shadow-brand)] transition-transform active:scale-[0.99]"
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

        {/* The one primary action on the screen. */}
        <Link to="/reservations" className="block active:opacity-95">
          <Card className="p-[var(--m-card-pad)]">
            <div className="relative space-y-2">
              {/* The route spine: one dot per end, joined by a dashed rail that
                  is pinned to the icons' centre line so it reads as one path. */}
              <span
                aria-hidden="true"
                className="absolute left-[19px] top-9 h-[calc(100%-4.5rem)] w-px -translate-y-1/2 border-l-2 border-dashed border-accent-200"
              />
              <div className="relative flex items-center gap-3">
                <span className="z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-success-50 text-success-700">
                  <MapPin className="h-[18px] w-[18px]" />
                </span>
                <span className="r-inner flex-1 bg-accent-50 px-4 py-3 text-[15px] text-muted">
                  Pickup
                </span>
              </div>
              <div className="relative flex items-center gap-3">
                <span className="z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700">
                  <Flag className="h-[18px] w-[18px]" />
                </span>
                <span className="r-inner flex-1 bg-accent-50 px-4 py-3 text-[15px] text-muted">
                  Drop off
                </span>
              </div>
            </div>

            <span className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-brand-gradient py-4 text-[15px] font-bold text-white shadow-[var(--m-shadow-brand)]">
              Book a ride
              <ArrowRight className="h-4 w-4" />
            </span>
          </Card>
        </Link>

        {/* Real places from this passenger's own history. */}
        {recents.length > 0 && (
          <section className="pt-1">
            <SectionBar
              action={
                <span className="flex items-center gap-1 text-[11px] font-semibold text-muted">
                  <History className="h-3 w-3" />
                  Recent
                </span>
              }
            >
              Where to again
            </SectionBar>
            <div className="scroll-x mt-2 -mx-[var(--m-gutter)] px-[var(--m-gutter)]">
              {recents.map((r) => (
                <button
                  key={r.address}
                  type="button"
                  onClick={() => navigate('/reservations')}
                  className="flex w-48 items-center gap-2 rounded-full bg-surface py-2 pl-2.5 pr-4 text-left shadow-[var(--m-shadow-card)] active:bg-accent-50"
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent-100 text-ink">
                    <Clock className="h-3.5 w-3.5" />
                  </span>
                  <span className="truncate text-[13px] font-semibold text-ink">{r.address}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Services: a compact icon rail, not tall cards competing for attention. */}
        <section className="pt-1">
          <SectionBar>Popular services</SectionBar>
          <div className="mt-2 grid grid-cols-4 gap-2">
            {quickServices.map((slug) => {
              const s = SERVICES.find((x) => x.slug === slug);
              if (!s) return null;
              const Icon = s.icon || Plane;
              return (
                <Link
                  key={slug}
                  to="/reservations"
                  className="flex flex-col items-center gap-1.5 rounded-[var(--m-radius-inner)] bg-surface px-1 py-3 text-center shadow-[var(--m-shadow-card)] active:bg-accent-50"
                >
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-50 text-brand-700">
                    <Icon className="h-[18px] w-[18px]" />
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
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="flex items-center justify-center gap-2 rounded-full bg-surface py-3.5 text-sm font-bold text-brand-700 shadow-[var(--m-shadow-card)] active:bg-accent-50"
          >
            <LogIn className="h-4 w-4" />
            Sign in to book and track rides
          </button>
        )}

        {/* Secondary navigation stays text-only: it is not a peer of "Book". */}
        <nav className="flex items-center justify-center gap-5 pt-1">
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
          <p className="pt-1 text-center text-xs text-muted">
            Your vehicle: {vehicleLabel(user.driverDetails.vehicleType)}
          </p>
        )}
      </div>
    </div>
  );
}
