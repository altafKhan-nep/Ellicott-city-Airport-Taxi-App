import { asyncHandler } from '../middleware/error.js';
import { findNearbyDrivers } from '../services/rideService.js';
import * as driverService from '../services/driverService.js';

// GET /api/drivers/nearby?lat=&lng=&radius=&vehicleType=
export const nearbyDrivers = asyncHandler(async (req, res) => {
  const { lat, lng, radius, vehicleType } = req.query;
  if (!lat || !lng) return res.status(400).json({ message: 'lat and lng are required' });

  const drivers = await findNearbyDrivers({ lat: +lat, lng: +lng, radius: +radius, vehicleType });
  res.json({ drivers });
});

// GET /api/drivers/:id/eta?toLat=&toLng=  - route + ETA from driver to a point
export const driverEta = asyncHandler(async (req, res) => {
  const { toLat, toLng } = req.query;
  if (!toLat || !toLng) return res.status(400).json({ message: 'toLat and toLng are required' });

  const result = await driverService.getDriverEta(req.params.id, { lat: +toLat, lng: +toLng });
  res.json(result);
});

// PATCH /api/drivers/availability { isAvailable: boolean }
export const setAvailability = asyncHandler(async (req, res) => {
  const driver = await driverService.updateAvailability(req.user._id, req.body.isAvailable);
  res.json({ driver });
});

// POST /api/drivers/location { lat, lng, heading, speed }
export const location = asyncHandler(async (req, res) => {
  await driverService.updateLocation(req.user._id, req.body);
  res.json({ ok: true });
});

// GET /api/drivers/stats
export const stats = asyncHandler(async (req, res) => {
  const stats = await driverService.getDriverStats(req.user._id);
  res.json({ stats });
});