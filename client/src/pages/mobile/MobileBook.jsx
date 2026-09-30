import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin,
  Flag,
  Crosshair,
  ChevronDown,
  Car,
  ArrowUpDown,
} from 'lucide-react';
import { BookingMap } from '../../components/maps/BookingMap.jsx';
import LocationSearch from '../../components/rides/LocationSearch.jsx';
import useGeolocation from '../../hooks/useGeolocation.js';
import {
  createRide,
  nearbyDrivers,
  reverseGeocode,
} from '../../services/rideService.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { VEHICLES } from '../../data/vehicles.js';
import { SERVICES } from '../../data/services.js';
import { estimateQuote, formatMoney } from '../../lib/quote.js';
import { Card, SectionBar, Stepper, PrimaryButton, StatusPill } from '../../components/mobile/MobileUI.jsx';

const DEFAULT_CENTER = [39.267, -76.799];

// Roads are longer than the straight line between two points; ~1.3 is the usual
// urban detour factor. Applied so the preview is not systematically low.
const DETOUR_FACTOR = 1.3;
const EARTH_RADIUS_MI = 3958.8;

function straightLineMiles(a, b) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_MI * Math.asin(Math.min(1, Math.sqrt(h))) * DETOUR_FACTOR;
}

// Phones only. One scrolling column with a single sticky CTA. The fare the
// passenger is quoted comes from the same server rate the booking is priced at.
export default function MobileBook() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { position, error: geoError, locate } = useGeolocation();

  const [pickup, setPickup] = useState(null);
  const [dropoff, setDropoff] = useState(null);
  const [locateRequested, setLocateRequested] = useState(false);
  const [vehicleType, setVehicleType] = useState('');
  const [serviceType, setServiceType] = useState('airport');
  const [passengerCount, setPassengerCount] = useState(1);
  const [bags, setBags] = useState(0);
  const [extra, setExtra] = useState('');
  const [mapOpen, setMapOpen] = useState(false);
  const [drivers, setDrivers] = useState([]);
  const [driverCount, setDriverCount] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const vehicle = VEHICLES.find((v) => v.id === vehicleType);
  const seatCap = vehicle?.seats ?? 8;

  // Auto-fill pickup from GPS, reverse-geocoded to a real address.
  useEffect(() => {
    if (!position) return;
    if (pickup && !locateRequested) return;
    let cancelled = false;
    (async () => {
      let address = 'Current location';
      try {
        const { data } = await reverseGeocode(position.lat, position.lng);
        if (!cancelled && data?.place?.address) address = data.place.address;
      } catch {
        /* keep the generic fallback */
      }
      if (!cancelled) {
        setPickup({ lat: position.lat, lng: position.lng, address });
        setLocateRequested(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [position, pickup, locateRequested]);

  const useMyLocation = () => {
    setLocateRequested(true);
    locate();
  };

  useEffect(() => {
    if (pickup?.lat == null) {
      setDriverCount(null);
      return;
    }
    let cancelled = false;
    nearbyDrivers({ lat: pickup.lat, lng: pickup.lng })
      .then(({ data }) => {
        if (cancelled) return;
        setDrivers(data.drivers || []);
        setDriverCount((data.drivers || []).length);
      })
      .catch(() => !cancelled && setDriverCount(null));
    return () => {
      cancelled = true;
    };
  }, [pickup?.lat, pickup?.lng]);

  // Straight-line distance with a detour factor. The server recomputes the real
  // fare from the routed trip when the ride is created, so this is only a
  // preview — but it must be derived from the two points, not from the driver's
  // position (that is a different question and a different endpoint).
  const hasBoth = pickup?.lat != null && dropoff?.lat != null;
  const preview = hasBoth ? estimateQuote(straightLineMiles(pickup, dropoff)) : null;

  const handlePick = (p) => {
    const point = { ...p, address: `Lat ${p.lat.toFixed(4)}, Lng ${p.lng.toFixed(4)}` };
    if (!pickup) setPickup(point);
    else if (!dropoff) setDropoff(point);
    setMapOpen(false);
  };

  const ready = hasBoth && !!vehicleType;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!hasBoth) {
      setError('Choose a pickup and a drop off location.');
      return;
    }
    if (!vehicleType) {
      setError('Choose a vehicle.');
      return;
    }
    if (!user) {
      navigate('/login', { state: { from: '/reservations' } });
      return;
    }

    setLoading(true);
    try {
      const { data } = await createRide({
        pickup,
        dropoff,
        vehicleType,
        serviceType,
        passengerCount,
        bags,
        when: 'now',
        extra,
      });
      navigate(`/rides/track/${data.ride._id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not book your ride. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit}>
      {mapOpen && (
        <div className="relative h-[42vh] w-full overflow-hidden">
          <BookingMap
            center={position || DEFAULT_CENTER}
            pickup={pickup}
            dropoff={dropoff}
            drivers={drivers}
            userPosition={position}
            onLocate={useMyLocation}
            onPick={handlePick}
          />
        </div>
      )}

      {/* Two rhythms, not one flat gap: --m-gap-section between independent
          steps of the form, --m-gap between things that belong together. A
          uniform 12px everywhere gave every element equal weight, so nothing
          read as more important than anything else. */}
      <div className="space-y-[var(--m-gap-section)] px-[var(--m-gutter)] py-4">
        {/* Locations — swap lives here, not on the home shortcut, because this
            is where both ends actually hold values. */}
        <Card className="p-[var(--m-card-pad)]">
          <div className="relative">
            <LocationSearch
              label="Pickup"
              icon={MapPin}
              placeholder="Search pickup address"
              value={pickup}
              onSelect={setPickup}
            />
            <button
              type="button"
              onClick={() => {
                setPickup(dropoff);
                setDropoff(pickup);
              }}
              disabled={!pickup || !dropoff}
              aria-label="Swap pickup and drop off"
              className="absolute right-3 top-[2.15rem] z-[1200] grid h-8 w-8 place-items-center rounded-full bg-surface text-brand-700 shadow-sm ring-1 ring-accent-200 transition-transform active:scale-90 disabled:opacity-40"
            >
              <ArrowUpDown className="h-4 w-4" />
            </button>
          </div>

          <div className="ml-5 h-2.5 border-l-2 border-dashed border-accent-200" />
          <LocationSearch
            label="Drop off"
            icon={Flag}
            placeholder="Search drop off address"
            value={dropoff}
            onSelect={setDropoff}
          />

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={useMyLocation}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-accent-100 py-2.5 text-xs font-semibold text-ink active:bg-accent-200"
            >
              <Crosshair className="h-3.5 w-3.5" />
              Use my location
            </button>
            <button
              type="button"
              onClick={() => setMapOpen((v) => !v)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-accent-100 py-2.5 text-xs font-semibold text-ink active:bg-accent-200"
            >
              <MapPin className="h-3.5 w-3.5" />
              {mapOpen ? 'Hide map' : 'Pick on map'}
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${mapOpen ? 'rotate-180' : ''}`}
              />
            </button>
          </div>

          {geoError && <p className="text-xs text-gold-700">{geoError}</p>}
        </Card>

        {driverCount !== null && (
          <div className="-mt-1 flex justify-center">
            <StatusPill tone={driverCount > 0 ? 'brand' : 'wait'} pulse={driverCount > 0}>
              {driverCount > 0
                ? `${driverCount} driver${driverCount === 1 ? '' : 's'} nearby`
                : 'No drivers online nearby'}
            </StatusPill>
          </div>
        )}

        {/* Vehicle — a photo carousel beats a 9-item grid */}
        <div>
          <SectionBar>Vehicle</SectionBar>
          <div className="scroll-x -mx-[var(--m-gutter)] px-[var(--m-gutter)]">
            {VEHICLES.map((v) => {
              const on = vehicleType === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => {
                    setVehicleType(v.id);
                    if (passengerCount > v.seats) setPassengerCount(1);
                  }}
                  className={`w-36 overflow-hidden rounded-[var(--m-radius-card)] border text-left transition-all ${
                    on
                      ? 'border-brand-500 ring-2 ring-brand-200'
                      : 'border-accent-200 bg-surface'
                  }`}
                >
                  {v.thumb || v.image ? (
                    /* The full fleet photos are 250KB-1.6MB each and ship in the
                       APK; at 80px tall in this carousel that is 6.5MB of
                       waste, so the carousel loads 25KB thumbnails. The Fleet
                       page still uses the full image. */
                    <img
                      src={v.thumb || v.image}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      width={480}
                      height={270}
                      className={`h-20 w-full bg-accent-100 object-cover ${on ? '' : 'opacity-90'}`}
                    />
                  ) : (
                    <span className="grid h-20 w-full place-items-center bg-accent-100 text-muted">
                      <Car className="h-6 w-6" />
                    </span>
                  )}
                  <span className="block p-2.5">
                    <span className="block text-[13px] font-bold leading-tight text-ink">
                      {v.label}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-muted">
                      Seats {v.seats} · {v.bags} bags
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Service: equal-width columns in one scrolling row. A 2-up grid
            aligned cleanly but stacked 10 services into 5 rows and pushed the
            page past 1000px; a free-width scroller was ragged because the
            labels run 132-223px wide. Fixed columns solve both. */}
        <section>
          <SectionBar>Service</SectionBar>
          <div className="scroll-x mt-2 -mx-[var(--m-gutter)] px-[var(--m-gutter)]">
            {SERVICES.map((s) => {
              const on = serviceType === s.slug;
              const Icon = s.icon;
              return (
                <button
                  key={s.slug}
                  type="button"
                  onClick={() => setServiceType(s.slug)}
                  className={`flex h-[4.5rem] w-36 flex-col items-start gap-1.5 rounded-[var(--m-radius-inner)] px-3 py-2.5 text-left transition-colors ${
                    on
                      ? 'bg-brand-50 ring-2 ring-brand-200'
                      : 'bg-surface shadow-[var(--m-shadow-card)] active:bg-accent-50'
                  }`}
                >
                  {Icon && (
                    <Icon className={`h-4 w-4 shrink-0 ${on ? 'text-brand-700' : 'text-muted'}`} />
                  )}
                  <span className="line-clamp-2 text-[12px] font-semibold leading-tight text-ink">
                    {s.name}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Extras — the things a rider adjusts last, so they read as one group
            rather than three competing blocks. */}
        <section>
          <SectionBar>Trip details</SectionBar>
          <Card className="mt-2 divide-y divide-accent-100">
            {/* Single-line controls get horizontal padding only; padding both
                ways pushed this block from 137px to 248px. */}
            <div className="px-[var(--m-card-pad)] py-3">
              <Stepper
                label="Riders"
                value={passengerCount}
                min={1}
                max={seatCap}
                onChange={setPassengerCount}
              />
            </div>
            <div className="px-[var(--m-card-pad)] py-3">
              <Stepper label="Bags" value={bags} min={0} max={6} onChange={setBags} />
            </div>
            <div className="px-[var(--m-card-pad)] py-3">
              <label className="t-label" htmlFor="ride-notes">
                Note for the driver
              </label>
              <input
                id="ride-notes"
                value={extra}
                onChange={(e) => setExtra(e.target.value)}
                placeholder="Child seat, luggage, wheelchair…"
                className="mt-1 w-full bg-transparent text-[15px] text-ink outline-none placeholder:text-accent-400"
              />
            </div>
          </Card>
        </section>

        {error && (
          <p className="rounded-xl bg-signal-50 px-4 py-3 text-sm text-signal-700">{error}</p>
        )}
      </div>

      {/* Sticky CTA — price on the button so the decision is informed. */}
      <div
        className="safe-bottom fixed inset-x-0 z-[1040] border-t border-accent-200 bg-surface/95 px-4 py-3 backdrop-blur-md"
        style={{ bottom: 'var(--tabbar-h, 68px)' }}
      >
        <PrimaryButton type="submit" disabled={loading}>
          {loading
            ? 'Requesting…'
            : !user
              ? 'Sign in to book'
              : preview
                ? `Request · ${formatMoney(preview.total)}`
                : ready
                  ? 'Request ride'
                  : 'Add pickup & drop off'}
        </PrimaryButton>
      </div>
    </form>
  );
}
