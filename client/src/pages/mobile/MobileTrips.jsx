import { useEffect, useState } from 'react';
import { MapPin, Navigation, ChevronRight, LogIn, ReceiptText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { listRides } from '../../services/rideService.js';
import { vehicleLabel } from '../../data/vehicles.js';
import { ScreenTitle, StatusPill, ListSkeleton, EmptyState, PrimaryButton } from '../../components/mobile/MobileUI.jsx';

const ACTIVE = ['pending', 'accepted', 'arriving', 'in_progress'];

const TONE = {
  pending: 'wait',
  accepted: 'live',
  arriving: 'live',
  in_progress: 'brand',
  completed: 'done',
  cancelled: 'wait',
};

const LABEL = {
  pending: 'Finding driver',
  accepted: 'On the way',
  arriving: 'Arriving',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const when = (d) =>
  d
    ? new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
        ' · ' +
        new Date(d).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    : '';

function RideRow({ ride }) {
  const live = ACTIVE.includes(ride.status);
  return (
    <li>
      <Link
        to={`/rides/track/${ride._id}`}
        className="r-card flex items-center gap-3 border border-accent-200 bg-surface p-3.5 shadow-[var(--m-shadow-card)] active:bg-accent-50"
      >
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <StatusPill tone={TONE[ride.status] || 'wait'} pulse={live}>
              {LABEL[ride.status] || ride.status}
            </StatusPill>
            <span className="truncate text-[11px] text-muted">{when(ride.createdAt)}</span>
          </span>

          <span className="mt-2 flex items-center gap-2 text-[13px] text-ink">
            <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-success-50 text-success-700">
              <MapPin className="h-3 w-3" />
            </span>
            <span className="truncate">{ride.pickup?.address || 'Pickup'}</span>
          </span>
          <span className="mt-1 flex items-center gap-2 text-[13px] text-muted">
            <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700">
              <Navigation className="h-3 w-3" />
            </span>
            <span className="truncate">{ride.dropoff?.address || 'Drop off'}</span>
          </span>

          <span className="mt-2 flex items-center gap-2 text-[11px] text-muted">
            <span className="capitalize">{vehicleLabel(ride.vehicleType)}</span>
            {ride.fare && (
              <>
                <span className="text-accent-300">·</span>
                <span className="t-price font-bold text-ink">
                  ${(ride.fare.final ?? ride.fare.estimated ?? 0).toFixed(2)}
                </span>
              </>
            )}
          </span>
        </span>
        <ChevronRight className="h-5 w-5 shrink-0 text-accent-300" />
      </Link>
    </li>
  );
}

export default function MobileTrips() {
  const { user } = useAuth();
  const [rides, setRides] = useState(null);

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

  if (!user) {
    return (
      <div className="px-4 pt-5">
        <ScreenTitle>Your trips</ScreenTitle>
        <EmptyState
          icon={LogIn}
          title="Sign in to see your trips"
          body="Your ride history, receipts and live tracking all live in your account."
          action={
            <Link to="/login">
              <PrimaryButton>Sign in</PrimaryButton>
            </Link>
          }
        />
      </div>
    );
  }

  if (rides === null) {
    return (
      <div className="px-4 pt-5">
        <ScreenTitle>Your trips</ScreenTitle>
        <ListSkeleton rows={4} />
      </div>
    );
  }

  const current = rides.filter((r) => ACTIVE.includes(r.status));
  const past = rides.filter((r) => !ACTIVE.includes(r.status));

  return (
    <div className="px-4 pt-5">
      <ScreenTitle>Your trips</ScreenTitle>

      {rides.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title="No trips yet"
          body="Book your first ride and it will show up here with live tracking and a receipt."
          action={
            <Link to="/reservations">
              <PrimaryButton>Book a ride</PrimaryButton>
            </Link>
          }
        />
      ) : (
        <div className="space-y-6">
          {current.length > 0 && (
            <section>
              <h2 className="t-label mb-2">Happening now</h2>
              <ul className="space-y-2">
                {current.map((r) => (
                  <RideRow key={r._id} ride={r} />
                ))}
              </ul>
            </section>
          )}

          {past.length > 0 && (
            <section>
              <h2 className="t-label mb-2">Past trips</h2>
              <ul className="space-y-2">
                {past.map((r) => (
                  <RideRow key={r._id} ride={r} />
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
