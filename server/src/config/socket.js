import Ride from '../models/Ride.js';

export const initSocket = (io) => {
  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Associate socket with a user id and join user-scoped room. The client
    // passes { userId, role } via socket.auth on connect (handshake.auth).
    const associate = ({ userId, role } = {}) => {
      if (!userId) return;
      if (socket.userId) socket.leave(`user:${socket.userId}`);
      socket.userId = userId;
      socket.role = role;
      socket.join(`user:${userId}`);
      if (role === 'driver') socket.join('drivers');
      if (role === 'admin') socket.join('admins');
    };

    associate(socket.handshake.auth);
    socket.on('authenticate', associate);

    // Join a ride-scoped room so passenger + driver share live events. Only the
    // ride's passenger, its assigned driver, or an admin may join (location data
    // flows through these rooms, so unauthenticated joins are rejected).
    socket.on('ride:join', async ({ rideId } = {}) => {
      if (!rideId || !socket.userId) return;
      const ride = await Ride.findOne({ _id: rideId }).select('passenger driver').lean();
      if (!ride) return;
      const isAdmin = socket.role === 'admin';
      const isParticipant =
        String(ride.passenger) === String(socket.userId) ||
        (ride.driver && String(ride.driver) === String(socket.userId));
      if (isAdmin || isParticipant) socket.join(`ride:${rideId}`);
    });

    // Driver publishes position -> forward to the ride room the driver is serving
    socket.on('driver:location', async ({ lat, lng, heading = 0, speed = 0 } = {}) => {
      const driverId = socket.userId;
      if (!driverId || lat == null || lng == null) return;

      const activeRide = await Ride.findOne({
        driver: driverId,
        status: { $in: ['accepted', 'arriving', 'in_progress'] },
      }).select('_id').lean();

      const payload = { driverId, lat, lng, heading, speed };
      if (activeRide) {
        io.to(`ride:${activeRide._id}`).emit('driver:location', payload);
      }
    });

    // Passenger publishes position -> forward to the ride room so the assigned
    // driver can find them live (mirror of driver:location).
    socket.on('passenger:location', async ({ lat, lng, heading = 0, speed = 0 } = {}) => {
      const passengerId = socket.userId;
      if (!passengerId || lat == null || lng == null) return;

      const activeRide = await Ride.findOne({
        passenger: passengerId,
        status: { $in: ['accepted', 'arriving', 'in_progress'] },
      }).select('_id').lean();

      const payload = { passengerId, lat, lng, heading, speed };
      if (activeRide) {
        io.to(`ride:${activeRide._id}`).emit('passenger:location', payload);
      }
    });

    // Client-triggered ride status publish (validation happens in services)
    socket.on('ride:cancel', ({ rideId } = {}) => {
      if (!rideId) return;
      io.to(`ride:${rideId}`).emit('ride:update', {
        rideId,
        status: 'cancelled',
        by: socket.userId,
      });
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};