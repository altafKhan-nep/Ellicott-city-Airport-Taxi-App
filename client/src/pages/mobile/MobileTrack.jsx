import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Polyline, AttributionControl } from 'react-leaflet';
import L from 'leaflet';
import {
  Phone,
  MessageSquare,
  Star,
  Navigation,
  ChevronUp,
  MapPin,
  X,
} from 'lucide-react';
import {
  getRide,
  driverEta,
  cancelRide,
  rateRide,
} from '../../services/rideService.js';
import {
  joinRideRoom,
  onRideUpdate,
  onDriverLocation,
  offRideUpdate,
  offDriverLocation,
} from '../../services/socketService.js';
import { MAP_VIEWS } from '../../components/maps/MapViewSelector.jsx';
import { vehicleLabel } from '../../data/vehicles.js';
import { Card, PrimaryButton, StatusPill } from '../../components/mobile/MobileUI.jsx';

const STATUS = {
  pending: { label: 'Finding you a driver', tone: 'wait', step: 0, live: false },
  accepted: { label: 'Driver on the way', tone: 'live', step: 1, live: true },
  arriving: { label: 'Driver arriving', tone: 'live', step: 2, live: true },
  in_progress: { label: 'On the way', tone: 'brand', step: 3, live: true },
  completed: { label: 'Trip completed', tone: 'done', step: 4, live: false },
  cancelled: { label: 'Trip cancelled', tone: 'wait', step: -1, live: false },
};

const STEPS = ['Requested', 'Accepted', 'Arriving', 'On the way', 'Complete'];

const driverIcon = L.divIcon({
  className: '',
  html: `<div class="map-pin map-pin-driver"><span></span></div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 30],
});

const pickupIcon = L.divIcon({
  className: '',
  html: `<div class="map-pin map-pin-start"><span></span></div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 30],
});

const dropoffIcon = L.divIcon({
  className: '',
  html: `<div class="map-pin map-pin-dropoff"><span></span></div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 30],
});

export default function MobileTrack() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ride, setRide] = useState(null);
  const [driverPos, setDriverPos] = useState(null);
  const [driverRoute, setDriverRoute] = useState([]);
  const [eta, setEta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sheetError, setSheetError] = useState('');
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [stars, setStars] = useState(0);
  const [rated, setRated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getRide(id)
      .then(({ data }) => {
        if (cancelled) return;
        const r = data.ride || data;
        setRide(r);
        // `rating` exists as `{ compliments: [] }` on an UNRATED ride, so test
        // the score — `rating != null` would mark every ride as already rated.
        if (r?.rating?.score) {
          setStars(r.rating.score);
          setRated(true);
        }
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.response?.data?.message || 'Could not load this ride.');
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!ride?._id) return;
    joinRideRoom(ride._id);
    onRideUpdate((p) => setRide(p.ride || p));
    onDriverLocation((p) => setDriverPos({ lat: p.lat, lng: p.lng }));
    return () => {
      offRideUpdate();
      offDriverLocation();
    };
  }, [ride?._id]);

  // Driver route + ETA, refreshed whenever the driver moves.
  const driverId = ride?.driver?._id;
  const pickupLat = ride?.pickup?.lat;
  const pickupLng = ride?.pickup?.lng;
  const live = STATUS[ride?.status]?.live;

  useEffect(() => {
    if (!driverId || pickupLat == null) return;
    let cancelled = false;
    const load = () =>
      driverEta(driverId, { lat: pickupLat, lng: pickupLng })
        .then(({ data }) => {
          if (cancelled) return;
          setDriverRoute(data.route || []);
          setEta(data.durationMin ?? null);
        })
        .catch(() => !cancelled && setDriverRoute([]));
    load();
    const t = live ? setInterval(load, 15000) : null;
    return () => {
      cancelled = true;
      if (t) clearInterval(t);
    };
  }, [driverId, pickupLat, pickupLng, live, driverPos?.lat, driverPos?.lng]);

  const doCancel = async () => {
    setBusy(true);
    setSheetError('');
    try {
      const { data } = await cancelRide(id, 'Cancelled by passenger');
      setRide(data.ride || data);
      setConfirmCancel(false);
    } catch (err) {
      setSheetError(err.response?.data?.message || 'Could not cancel this ride.');
    } finally {
      setBusy(false);
    }
  };

  const doRate = async (value) => {
    setStars(value);
    setBusy(true);
    setSheetError('');
    try {
      // The API takes `score` (1-5); `rating` is the field it writes back.
      await rateRide(id, { score: value });
      setRide((prev) => (prev ? { ...prev, rating: { score: value } } : prev));
      setRated(true);
    } catch (err) {
      if (err.response?.status === 409) {
        setRated(true);
        setSheetError('You have already rated this trip.');
      } else {
        setSheetError(err.response?.data?.message || 'Could not save your rating.');
      }
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
      </div>
    );
  }

  if (error || !ride) {
    return (
      <div className="px-4 py-16 text-center">
        <p className="text-sm text-muted">{error || 'Ride not found.'}</p>
        <button
          type="button"
          onClick={() => navigate('/rides/history')}
          className="mt-5 rounded-full bg-brand-gradient px-6 py-3 text-sm font-semibold text-white"
        >
          Back to trips
        </button>
      </div>
    );
  }

  const s = STATUS[ride.status] || STATUS.pending;
  const driver = ride.driver;
  const fare = ride.fare?.final ?? ride.fare?.estimated ?? null;
  const center = driverPos
    ? [driverPos.lat, driverPos.lng]
    : ride.pickup?.lat
      ? [ride.pickup.lat, ride.pickup.lng]
      : [39.267, -76.799];
  const tiles = MAP_VIEWS[0];

  return (
    <div className="relative">
      {/* Map */}
      <div className="h-[46vh] w-full overflow-hidden">
        <MapContainer center={center} zoom={14} className="h-full w-full" attributionControl={false}>
          <AttributionControl position="bottomleft" />
          <TileLayer url={tiles.url} attribution={tiles.attribution} />
          {ride.pickup?.lat != null && (
            <Marker position={[ride.pickup.lat, ride.pickup.lng]} icon={pickupIcon} />
          )}
          {ride.dropoff?.lat != null && (
            <Marker position={[ride.dropoff.lat, ride.dropoff.lng]} icon={dropoffIcon} />
          )}
          {driverPos && <Marker position={[driverPos.lat, driverPos.lng]} icon={driverIcon} />}
          {driverRoute.length > 0 && (
            <>
              <Polyline
                positions={driverRoute.map((p) => [p.lat, p.lng])}
                pathOptions={{ color: '#ffffff', weight: 9, opacity: 0.7, lineCap: 'round', dashArray: '8 10' }}
              />
              <Polyline
                positions={driverRoute.map((p) => [p.lat, p.lng])}
                pathOptions={{ color: '#c22020', weight: 5, opacity: 0.9, lineCap: 'round', dashArray: '8 10' }}
              />
            </>
          )}
        </MapContainer>
      </div>

      {/* Status + ETA float over the map */}
      <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center px-4">
        <StatusPill tone={s.tone} pulse={s.live}>
          {s.label}
          {eta != null && s.live ? ` · ${eta} min away` : ''}
        </StatusPill>
      </div>

      {/* Bottom sheet */}
      <div
        className={`relative z-[1040] -mt-7 rounded-t-3xl border-t border-accent-200 bg-surface shadow-[var(--m-shadow-float)] transition-all ${
          expanded ? 'min-h-[74vh]' : ''
        }`}
      >
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-label={expanded ? 'Collapse trip details' : 'Expand trip details'}
          aria-expanded={expanded}
          className="flex w-full flex-col items-center pt-2.5 pb-1"
        >
          <span className="h-1.5 w-11 rounded-full bg-accent-300" />
          <ChevronUp className={`mt-1.5 h-4 w-4 text-muted transition-transform ${expanded ? '' : 'rotate-180'}`} />
        </button>

        <div className="space-y-4 px-[var(--m-gutter)] pt-1 pb-8">
          {/* Driver */}
          {driver ? (
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-brand-gradient text-base font-bold text-white">
                {driver.name?.[0] || 'D'}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-bold text-ink">{driver.name}</span>
                <span className="block truncate text-xs text-muted">
                  {vehicleLabel(ride.vehicleType)}
                  {ride.driver?.plateNumber ? ` · ${ride.driver.plateNumber}` : ''}
                </span>
              </span>
              <a
                href={`tel:${driver.phone || '4103655556'}`}
                aria-label="Call driver"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700"
              >
                <Phone className="h-[18px] w-[18px]" />
              </a>
              <button
                type="button"
                aria-label="Message driver"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700"
              >
                <MessageSquare className="h-[18px] w-[18px]" />
              </button>
            </div>
          ) : (
            <Card tone="quiet" className="flex items-center gap-3 p-[var(--m-card-pad)]">
              <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-signal-500" />
              <span className="text-sm text-ink">Matching you with a nearby driver…</span>
            </Card>
          )}

          {/* Progress */}
          {s.step >= 0 && (
            <div className="flex items-end gap-1">
              {STEPS.map((label, i) => (
                <div key={label} className="flex-1">
                  <div
                    className={`h-1.5 rounded-full ${i <= s.step ? 'bg-brand-500' : 'bg-accent-200'}`}
                  />
                  <span
                    className={`mt-1.5 block text-center text-[9px] font-semibold ${
                      i <= s.step ? 'text-brand-700' : 'text-accent-400'
                    }`}
                  >
                    {label}
                  </span>
                </div>
              ))}
            </div>
          )}

          {expanded && (
            <Card className="divide-y divide-accent-100">
              <div className="flex gap-3 p-[var(--m-card-pad)]">
                <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-success-50 text-success-700">
                  <MapPin className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0">
                  <span className="t-label">Pickup</span>
                  <span className="mt-0.5 block text-sm leading-snug text-ink">
                    {ride.pickup?.address || '—'}
                  </span>
                </span>
              </div>
              <div className="flex gap-3 p-[var(--m-card-pad)]">
                <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700">
                  <Navigation className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0">
                  <span className="t-label">Drop off</span>
                  <span className="mt-0.5 block text-sm leading-snug text-ink">
                    {ride.dropoff?.address || '—'}
                  </span>
                </span>
              </div>
            </Card>
          )}

          {/* The fare is always visible — it should never need a tap. */}
          {ride.fare && (
            <Card className="flex items-center justify-between p-[var(--m-card-pad)]">
              <span className="text-sm text-muted">
                {ride.fare.distanceKm ? `${ride.fare.distanceKm.toFixed(1)} km` : ''}
                {ride.fare.durationMin ? ` · ${ride.fare.durationMin} min` : ''}
              </span>
              <span className="t-price text-lg font-bold text-ink">
                ${(fare ?? 0).toFixed(2)}
              </span>
            </Card>
          )}

          {sheetError && (
            <p className="rounded-xl bg-signal-50 px-4 py-2.5 text-sm text-signal-700">{sheetError}</p>
          )}

          {/* Rating */}
          {ride.status === 'completed' && (
            <Card className="p-[var(--m-card-pad)]">
              <p className="t-label">Rate your trip</p>
              <div className="mt-2.5 flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => !rated && doRate(n)}
                    disabled={rated || busy}
                    aria-label={`${n} star${n === 1 ? '' : 's'}`}
                    className="p-1 transition-transform active:scale-90"
                  >
                    <Star
                      className={`h-8 w-8 ${
                        n <= stars ? 'fill-gold-400 text-gold-500' : 'text-accent-300'
                      }`}
                    />
                  </button>
                ))}
                {rated && <span className="ml-2 text-sm font-semibold text-success-700">Thanks!</span>}
              </div>
            </Card>
          )}

          {/* Cancel — confirm before firing, and actually calls the API */}
          {['pending', 'accepted', 'arriving'].includes(ride.status) &&
            (confirmCancel ? (
              <Card className="space-y-3 p-[var(--m-card-pad)]">
                <p className="text-sm font-semibold text-ink">Cancel this ride?</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmCancel(false)}
                    className="flex-1 rounded-full bg-accent-100 py-3 text-sm font-semibold text-ink"
                  >
                    Keep ride
                  </button>
                  <button
                    type="button"
                    onClick={doCancel}
                    disabled={busy}
                    className="flex-1 rounded-full bg-signal-600 py-3 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {busy ? 'Cancelling…' : 'Cancel ride'}
                  </button>
                </div>
              </Card>
            ) : (
              <PrimaryButton variant="quiet" onClick={() => setConfirmCancel(true)}>
                <X className="mr-1.5 inline h-4 w-4" />
                Cancel ride
              </PrimaryButton>
            ))}

          {['completed', 'cancelled'].includes(ride.status) && (
            <PrimaryButton variant="quiet" onClick={() => navigate('/rides/history')}>
              See all trips
            </PrimaryButton>
          )}
        </div>
      </div>
    </div>
  );
}
