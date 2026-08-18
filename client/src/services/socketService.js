import { io } from 'socket.io-client';

// In dev, connects to same-origin (Vite proxies /socket.io). In production,
// point to the deployed backend origin via VITE_API_URL.
const SOCKET_URL = import.meta.env.VITE_API_URL || '/';

const socket = io(SOCKET_URL, { autoConnect: false });

export const connectSocket = (userId, role) => {
  socket.auth = { userId, role };
  socket.connect();
};

export const joinRideRoom = (rideId) => socket.emit('ride:join', { rideId });

export const onRideUpdate = (cb) => socket.on('ride:update', cb);
export const onRideNew = (cb) => socket.on('ride:new', cb);
export const onDriverFound = (cb) => socket.on('ride:driverFound', cb);
export const onDriverLocation = (cb) => socket.on('driver:location', cb);
export const onPassengerLocation = (cb) => socket.on('passenger:location', cb);
export const onRideCompleted = (cb) => socket.on('ride:completed', cb);
export const onNotification = (cb) => socket.on('notification:new', cb);

export const offNotification = () => socket.off('notification:new');

export const emitDriverLocation = (lat, lng, heading = 0, speed = 0) =>
  socket.emit('driver:location', { lat, lng, heading, speed });

export const emitPassengerLocation = (lat, lng, heading = 0, speed = 0) =>
  socket.emit('passenger:location', { lat, lng, heading, speed });

export const emitCancel = (rideId) => socket.emit('ride:cancel', { rideId });

export const offRideUpdate = () => socket.off('ride:update');
export const offRideNew = () => socket.off('ride:new');
export const offPassengerLocation = () => socket.off('passenger:location');
export const offDriverLocation = () => socket.off('driver:location');
export const disconnectSocket = () => socket.disconnect();

export default socket;