import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, Flag, ArrowRight, Plane, LogIn, Minus, Plus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { listRides } from '../../services/rideService.js';
import { SERVICES } from '../../data/services.js';
import { VEHICLES, vehicleLabel } from '../../data/vehicles.js';
import { estimateQuote, formatMoney } from '../../lib/quote.js';
import { Card, ScreenTitle, SectionTitle, StatusPill } from '../../components/mobile/MobileUI.jsx';

const ACTIVE = ['pending', 'accepted', 'arriving', 'in_progress'];

const QUICK = ['airport', 'corporate', 'shuttle', 'wedding'].filter((slug) =>
  SERVICES.some((s) => s.slug === slug)
);

const MAX_MILES = 120;

// Phones only. One dominant action per screen: the booking card. Everything
// else (quote, services, account) is secondary and sits below the fold.
export default function MobileHome() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [active, setActive] = useState(null);

  const [miles, setMiles] = useState(0);
  const [vehicleId, setVehicleId] = useState(VEHICLES[0]?.id);
  const [riders, setRiders] = useState(1);
  const quote = estimateQuote(miles);
  const seatCap = VEHICLES.find((v) => v.id === vehicleId)?.seats ?? 4;

  useEffect(() => {
    if (!user) {
      setActive(null);
      return;
    }
    let cancelled = false;
    listRides()
      .then(({ data }) => {
        if (cancelled) return;
        const rides = data.rides || data || [];
        setActive(rides.find((r) => ACTIVE.includes(r.status)) || null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <div className="px-4 pt-5">
      <ScreenTitle>
        {user ? `Hi, ${user.name.split(' ')[0]}` : 'Where to?'}
      </ScreenTitle>

      {/* An in-flight ride outranks everything else. */}
      {active && (
        <Link
          to={`/rides/track/${active._id}`}
          className="mb-3 block r-card bg-brand-gradient p-4 text-white shadow-[var(--m-shadow-brand)] transition-transform active:scale-[0.99]"
        >
          <div className="flex items-center justify-between gap-3">
            <StatusPill tone="gold">
              {active.status === 'pending' ? 'Finding a driver' : 'Ride in progress'}
            </StatusPill>
            <ArrowRight className="h-4 w-4 shrink-0 text-gold-300" />
          </div>
          <p className="mt-2.5 truncate text-sm font-semibold">
            {active.pickup?.address || 'Pickup set'}
          </p>
          <p className="mt-0.5 truncate text-xs text-white/70">Tap to track your driver</p>
        </Link>
      )}

      {/* The one primary action. */}
      <Link to="/reservations" className="block active:opacity-95">
        <Card className="p-4">
          <div className="space-y-2.5">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-success-50 text-success-700">
                <MapPin className="h-4 w-4" />
              </span>
              <span className="r-inner flex-1 border border-accent-200 bg-accent-50 px-4 py-3 text-sm text-muted">
                Pickup
              </span>
            </div>
            <div className="ml-[18px] h-3 border-l-2 border-dashed border-accent-200" />
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700">
                <Flag className="h-4 w-4" />
              </span>
              <span className="r-inner flex-1 border border-accent-200 bg-accent-50 px-4 py-3 text-sm text-muted">
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

      {!user && (
        <button
          type="button"
          onClick={() => navigate('/login')}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-surface py-3.5 text-sm font-semibold text-brand-700 ring-1 ring-accent-200 active:bg-accent-50"
        >
          <LogIn className="h-4 w-4" />
          Sign in to book and track rides
        </button>
      )}

      {/* Fare estimate — a slider beats a form for "roughly how much?" */}
      <Card tone="brand" className="mt-4 overflow-hidden">
        <div className="p-4">
          <p className="text-sm font-bold text-white">Fare estimate</p>

          <label className="mt-3 block">
            <span className="t-label !text-white/60">Vehicle</span>
            <select
              value={vehicleId}
              onChange={(e) => {
                setVehicleId(e.target.value);
                setRiders(1);
              }}
              className="mt-1.5 w-full rounded-xl border-0 bg-surface px-4 py-3 text-[15px] font-semibold text-ink outline-none"
            >
              {VEHICLES.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label} · seats {v.seats}
                </option>
              ))}
            </select>
          </label>

          <div className="mt-3 flex items-center justify-between">
            <span className="t-label !text-white/60">Riders</span>
            <span className="flex items-center gap-3">
              <button
                type="button"
                aria-label="One fewer rider"
                onClick={() => setRiders((p) => Math.max(1, p - 1))}
                disabled={riders <= 1}
                className="grid h-9 w-9 place-items-center rounded-full bg-surface text-brand-700 disabled:opacity-40"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="t-price min-w-5 text-center text-base font-bold text-white">
                {riders}
              </span>
              <button
                type="button"
                aria-label="One more rider"
                onClick={() => setRiders((p) => Math.min(seatCap, p + 1))}
                disabled={riders >= seatCap}
                className="grid h-9 w-9 place-items-center rounded-full bg-surface text-brand-700 disabled:opacity-40"
              >
                <Plus className="h-4 w-4" />
              </button>
            </span>
          </div>

          <div className="mt-3.5 flex items-center gap-3">
            <span className="t-label !text-white/60">Miles</span>
            <span
              aria-hidden="true"
              className="t-price grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white"
            >
              {miles}
            </span>
            <input
              type="range"
              min="0"
              max={MAX_MILES}
              step="1"
              value={miles}
              aria-label="Trip distance in miles"
              onChange={(e) => setMiles(Number(e.target.value))}
              className="quote-range h-2 w-full cursor-pointer appearance-none rounded-full bg-white/30"
            />
          </div>
        </div>

        {/* The total bar is the CTA into the real booking flow. */}
        <Link
          to="/reservations"
          className="flex items-stretch bg-brand-700/60 transition-colors active:bg-brand-700"
        >
          <span className="flex-1 px-4 py-3.5 text-right text-xs font-bold uppercase tracking-wider text-white/80">
            Estimate
          </span>
          <span className="t-price min-w-[6.5rem] bg-brand-800 px-4 py-3 text-center text-lg font-extrabold text-white">
            {formatMoney(quote.total)}
          </span>
        </Link>
      </Card>

      {/* Services — now that the catalog carries photos and taglines. */}
      <div className="mt-6">
        <SectionTitle>Popular services</SectionTitle>
        <div className="scroll-x -mx-4 px-4">
          {QUICK.map((slug) => {
            const s = SERVICES.find((x) => x.slug === slug);
            if (!s) return null;
            const Icon = s.icon || Plane;
            return (
              <Link
                key={slug}
                to="/reservations"
                className="w-40 r-card border border-accent-200 bg-surface p-3 shadow-[var(--m-shadow-card)] active:bg-accent-50"
              >
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-brand-700">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="mt-2 block text-sm font-bold leading-tight text-ink">{s.name}</span>
                <span className="mt-1 line-clamp-2 block text-[11px] leading-snug text-muted">
                  {s.tagline}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Trips is already a tab, so only the non-duplicated links live here. */}
      <div className="mt-6 grid grid-cols-2 gap-2">
        {[
          { to: '/fleet', label: 'Our fleet' },
          { to: '/contact', label: 'Contact us' },
        ].map((l) => (
          <Link
            key={l.to}
            to={l.to}
            className="r-card border border-accent-200 bg-surface px-4 py-3.5 text-center text-sm font-semibold text-ink shadow-[var(--m-shadow-card)] active:bg-accent-50"
          >
            {l.label}
          </Link>
        ))}
      </div>

      {user?.driverDetails?.vehicleType && (
        <p className="mt-5 text-center text-xs text-muted">
          Your vehicle: {vehicleLabel(user.driverDetails.vehicleType)}
        </p>
      )}
    </div>
  );
}
