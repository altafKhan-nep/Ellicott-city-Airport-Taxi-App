import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Flag, Crosshair, ChevronDown, Car } from 'lucide-react';
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
import { Card, SectionTitle, Stepper, PrimaryButton, StatusPill } from '../../components/mobile/MobileUI.jsx';

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

      <div className="space-y-4 px-4 py-4">
        {/* Locations */}
        <Card className="space-y-3 p-4">
          <LocationSearch
            label="Pickup"
            icon={MapPin}
            placeholder="Search pickup address"
            value={pickup}
            onSelect={setPickup}
          />
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
          <div className="flex justify-center">
            <StatusPill tone={driverCount > 0 ? 'brand' : 'wait'} pulse={driverCount > 0}>
              {driverCount > 0
                ? `${driverCount} driver${driverCount === 1 ? '' : 's'} nearby`
                : 'No drivers online nearby'}
            </StatusPill>
          </div>
        )}

        {/* Vehicle — a photo carousel beats a 9-item grid */}
        <div>
          <SectionTitle>Vehicle</SectionTitle>
          <div className="scroll-x -mx-4 px-4">
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
                  {v.image ? (
                    <img
                      src={v.image}
                      alt=""
                      loading="lazy"
                      className={`h-20 w-full object-cover ${on ? '' : 'opacity-90'}`}
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

        {/* Service — compact chips, not 128px cards */}
        <div>
          <SectionTitle>Service</SectionTitle>
          <div className="scroll-x -mx-4 px-4">
            {SERVICES.map((s) => {
              const on = serviceType === s.slug;
              return (
                <button
                  key={s.slug}
                  type="button"
                  onClick={() => setServiceType(s.slug)}
                  className={`rounded-full border px-3.5 py-2 text-[13px] font-semibold transition-colors ${
                    on
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-accent-200 bg-surface text-ink active:bg-accent-50'
                  }`}
                >
                  {s.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Counts */}
        <Card className="space-y-4 p-4">
          <Stepper
            label="Riders"
            value={passengerCount}
            min={1}
            max={seatCap}
            onChange={setPassengerCount}
          />
          <div className="h-px bg-accent-100" />
          <Stepper label="Bags" value={bags} min={0} max={6} onChange={setBags} />
        </Card>

        <input
          value={extra}
          onChange={(e) => setExtra(e.target.value)}
          placeholder="Notes for the driver (optional)"
          aria-label="Notes for the driver"
          className="input-pill w-full border border-accent-200 bg-surface px-4 py-3.5 text-[15px] outline-none placeholder:text-accent-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
        />

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
