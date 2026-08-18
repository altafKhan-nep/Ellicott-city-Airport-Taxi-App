import Ride from '../models/Ride.js';
import Location from '../models/Location.js';
import User from '../models/User.js';
import { getSettings } from './settingsService.js';

const RADIUS_M = 5000;

// Radius used to notify nearby drivers about a new reservation (10 km).
export const NOTIFY_RADIUS_M = 10000;

// Geocoding via Nominatim (OpenStreetMap) - free, no API key
// e.g. GET https://nominatim.openstreetmap.org/search?q=...&format=json
const GEOCODE_URL = 'https://nominatim.openstreetmap.org/search';

export const geocode = async (query) => {
  const url = new URL(GEOCODE_URL);
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '1');

  const res = await fetch(url, { headers: { 'User-Agent': 'RideTaxi/1.0' } });
  if (!res.ok) throw Object.assign(new Error('Geocoding failed'), { statusCode: 502 });
  const data = await res.json();
  if (!data.length) throw Object.assign(new Error('Location not found'), { statusCode: 404 });
  return { address: data[0].display_name, lat: +data[0].lat, lng: +data[0].lon };
};

// OSRM route calculation - returns distance, duration, and polyline
export const getRoute = async (from, to) => {
  const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
  const res = await fetch(url);
  if (!res.ok) throw Object.assign(new Error('Route calculation failed'), { statusCode: 502 });
  const data = await res.json();
  const route = data.routes?.[0];
  if (!route) throw Object.assign(new Error('No route found'), { statusCode: 404 });

  const distanceKm = Math.round(route.distance / 1000);
  const durationMin = Math.round(route.duration / 60);
  const polyline = route.geometry.coordinates.map(([lng, lat]) => ({ lat, lng }));
  return { distanceKm, durationMin, polyline };
};

// Simple fare: base + per-km (vehicle-specific, overridable from Admin Settings).
const estimateFare = (distanceKm, durationMin, vehicleType, overrides = {}) => {
  const rates = {
    'executive-sedan': { base: 6, perKm: 1.9, perMin: 0.4 },
    'economy-sedan': { base: 3, perKm: 1.4, perMin: 0.3 },
    'economy-suv': { base: 5, perKm: 1.8, perMin: 0.4 },
    'premium-suv': { base: 7, perKm: 2.2, perMin: 0.45 },
    'luxury-suv': { base: 10, perKm: 2.6, perMin: 0.5 },
    van: { base: 8, perKm: 2.0, perMin: 0.42 },
    'mini-coach': { base: 35, perKm: 3.5, perMin: 0.8 },
    'school-bus': { base: 45, perKm: 4.0, perMin: 0.9 },
    motorcoach: { base: 70, perKm: 5.0, perMin: 1.2 },
  };
  const rate = rates[vehicleType] || rates['economy-sedan'];
  // Global overrides (Admin Settings) take precedence when set.
  const base = overrides.baseFare ?? rate.base;
  const perKm = overrides.perKm ?? rate.perKm;
  const perMin = overrides.perMin ?? rate.perMin;
  const total = base + distanceKm * perKm + durationMin * perMin;
  return Math.round(total * 100) / 100;
};

export const createRide = async (passengerId, input) => {
  const pickup = input.pickup.lat ? input.pickup : await geocode(input.pickup);
  const dropoff = input.dropoff.lat ? input.dropoff : await geocode(input.dropoff);

  const route = await getRoute(pickup, dropoff);
  const settings = await getSettings();
  const estimated = estimateFare(route.distanceKm, route.durationMin, input.vehicleType, settings);

  const ride = await Ride.create({
    passenger: passengerId,
    pickup,
    dropoff,
    vehicleType: input.vehicleType || 'economy-sedan',
    serviceType: input.serviceType || '',
    passengerCount: input.passengerCount || 1,
    bags: input.bags || 0,
    fare: {
      estimated,
      distanceKm: route.distanceKm,
      durationMin: route.durationMin,
    },
    route: route.polyline,
  });

  const populated = await Ride.findById(ride._id).populate('passenger', 'name phone avatar');
  return populated;
};

export const findNearbyDrivers = async ({ lat, lng, radius = RADIUS_M, vehicleType }) => {
  const match = {
    coordinates: {
      $near: {
        $geometry: { type: 'Point', coordinates: [lng, lat] },
        $maxDistance: radius,
      },
    },
  };

  // Vehicle type filters on the populated driver (Location docs carry no
  // vehicleType); non-matching drivers are dropped by the populate match.
  const locations = await Location.find(match).populate({
    path: 'driver',
    match: vehicleType
      ? { role: 'driver', 'driverDetails.isAvailable': true, 'driverDetails.vehicleType': vehicleType }
      : { role: 'driver', 'driverDetails.isAvailable': true },
  });

  return locations
    .filter((l) => l.driver)
    .map((l) => ({
      _id: l.driver._id,
      name: l.driver.name,
      phone: l.driver.phone,
      avatar: l.driver.avatar,
      vehicleType: l.driver.driverDetails?.vehicleType,
      plateNumber: l.driver.driverDetails?.plateNumber,
      lat: l.coordinates.coordinates[1],
      lng: l.coordinates.coordinates[0],
    }));
};

export const acceptRide = async (rideId, driverId) => {
  const ride = await Ride.findOne({ _id: rideId, status: 'pending' });
  if (!ride) throw Object.assign(new Error('Ride is no longer available'), { statusCode: 409 });

  const busy = await Ride.findOne({
    driver: driverId,
    status: { $in: ['accepted', 'arriving', 'in_progress'] },
    _id: { $ne: rideId },
  }).select('_id');
  if (busy) throw Object.assign(new Error('You already have an active ride'), { statusCode: 409 });

  ride.driver = driverId;
  ride.status = 'accepted';
  ride.timestamps.accepted = new Date();
  await ride.save();

  return Ride.findById(rideId).populate('passenger driver', 'name phone avatar driverDetails');
};

// Dispatch (admin) assigns or removes a driver on a ride. `driverId: null`
// returns the ride to the pending board. Returns the populated ride plus the
// id of the driver who was unassigned (if any).
export const assignDriver = async (rideId, driverId) => {
  const ride = await Ride.findOne({ _id: rideId, status: { $nin: ['completed', 'cancelled'] } });
  if (!ride) throw Object.assign(new Error('Ride not found or no longer assignable'), { statusCode: 404 });

  const removedDriverId = ride.driver ? String(ride.driver) : null;

  if (driverId) {
    if (removedDriverId === String(driverId)) {
      const populated = await Ride.findById(rideId).populate('passenger driver', 'name phone avatar driverDetails');
      return { ride: populated, removedDriverId: null };
    }
    const driver = await User.findOne({ _id: driverId, role: 'driver' });
    if (!driver) throw Object.assign(new Error('Driver not found'), { statusCode: 400 });
    if (driver.isSuspended) throw Object.assign(new Error('Driver is suspended'), { statusCode: 400 });

    const busy = await Ride.findOne({
      driver: driverId,
      status: { $in: ['accepted', 'arriving', 'in_progress'] },
      _id: { $ne: rideId },
    }).select('_id');
    if (busy) throw Object.assign(new Error('Driver already has an active ride'), { statusCode: 409 });

    ride.driver = driverId;
    ride.status = 'accepted';
    ride.timestamps.accepted = new Date();
  } else {
    ride.driver = null;
    ride.status = 'pending';
    ride.timestamps.accepted = undefined;
  }

  await ride.save();
  const populated = await Ride.findById(rideId).populate('passenger driver', 'name phone avatar driverDetails');
  return { ride: populated, removedDriverId };
};

export const findAdmins = () =>
  User.find({ role: 'admin', isSuspended: false }).select('_id').lean();

export const updateStatus = async (rideId, status, driverId) => {
  const allowed = ['arriving', 'in_progress', 'completed'];
  if (!allowed.includes(status)) {
    throw Object.assign(new Error('Invalid status transition'), { statusCode: 400 });
  }

  const ride = await Ride.findOne({ _id: rideId, driver: driverId, status: { $ne: 'completed' } });
  if (!ride) throw Object.assign(new Error('Ride not found or not assigned to you'), { statusCode: 404 });

  ride.status = status;
  ride.timestamps[status] = new Date();
  if (status === 'completed') {
    ride.timestamps.completed = new Date();
    // Final fare: use the estimate at completion (no metering in sandbox).
    ride.fare.final = ride.fare.estimated;
  }

  await ride.save();
  return Ride.findById(rideId).populate('passenger driver', 'name phone avatar');
};

// Edit a ride while it's still pending (passenger only). Re-geocodes changed
// locations and recomputes route + fare. If a driver already accepted, editing
// is blocked (they'd be expecting the original job).
export const editRide = async (rideId, passengerId, input) => {
  const ride = await Ride.findOne({ _id: rideId, passenger: passengerId, status: 'pending' });
  if (!ride) {
    throw Object.assign(new Error('Ride can only be edited while pending'), { statusCode: 409 });
  }

  let pickup = ride.pickup;
  let dropoff = ride.dropoff;

  if (input.pickup !== undefined) {
    pickup = input.pickup.lat ? input.pickup : await geocode(input.pickup);
  }
  if (input.dropoff !== undefined) {
    dropoff = input.dropoff.lat ? input.dropoff : await geocode(input.dropoff);
  }

  const changedRoute =
    pickup.lat !== ride.pickup.lat ||
    pickup.lng !== ride.pickup.lng ||
    dropoff.lat !== ride.dropoff.lat ||
    dropoff.lng !== ride.dropoff.lng;

  let route = ride.route;
  let distanceKm = ride.fare.distanceKm;
  let durationMin = ride.fare.durationMin;

  if (changedRoute) {
    const fresh = await getRoute(pickup, dropoff);
    route = fresh.polyline;
    distanceKm = fresh.distanceKm;
    durationMin = fresh.durationMin;
  }

  const settings = await getSettings();
  const vehicleType = input.vehicleType || ride.vehicleType;
  const estimated = estimateFare(distanceKm, durationMin, vehicleType, settings);

  ride.pickup = pickup;
  ride.dropoff = dropoff;
  ride.vehicleType = vehicleType;
  ride.serviceType = input.serviceType ?? ride.serviceType;
  ride.passengerCount = input.passengerCount ?? ride.passengerCount;
  ride.bags = input.bags ?? ride.bags;
  ride.route = route;
  ride.fare = { estimated, distanceKm, durationMin };

  await ride.save();
  return Ride.findById(rideId).populate('passenger', 'name phone avatar');
};

export const cancelRide = async (rideId, userId, reason = '') => {
  const ride = await Ride.findOne({
    _id: rideId,
    status: { $nin: ['completed', 'cancelled'] },
    $or: [{ passenger: userId }, { driver: userId }],
  });
  if (!ride) throw Object.assign(new Error('Ride not found or cannot be cancelled'), { statusCode: 404 });

  ride.status = 'cancelled';
  ride.cancelReason = reason;
  ride.timestamps.cancelled = new Date();
  await ride.save();
  return ride;
};

export const rateRide = async (rideId, userId, { score, comment }) => {
  const ride = await Ride.findOne({ _id: rideId, status: 'completed', passenger: userId });
  if (!ride) throw Object.assign(new Error('Completed ride not found'), { statusCode: 404 });

  ride.rating = { score, comment, createdAt: new Date() };
  await ride.save();
  return ride;
};

export const getRideById = async (id) => {
  const ride = await Ride.findById(id).populate('passenger driver', 'name phone avatar');
  if (!ride) throw Object.assign(new Error('Ride not found'), { statusCode: 404 });
  return ride;
};

export const listRides = async (user, filters = {}) => {
  const query = {};
  if (user.role === 'passenger') query.passenger = user._id;
  if (user.role === 'driver') query.driver = user._id;
  if (user.role === 'admin') {
    if (filters.status) query.status = filters.status;
  }

  const rides = await Ride.find(query)
    .sort({ createdAt: -1 })
    .limit(50)
    .populate('passenger driver', 'name phone avatar');
  return rides;
};

export const listDrivers = async () => {
  return User.find({ role: 'driver' }).select('-password');
};