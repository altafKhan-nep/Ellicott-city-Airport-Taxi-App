import api from './api.js';

// User profile
export const getProfile = () => api.get('/users/me');
export const updateProfile = (payload) => api.patch('/users/me', payload);
export const setAvatar = (dataUrl) => api.post('/users/me/avatar', { dataUrl });
export const removeAvatar = () => api.delete('/users/me/avatar');
export const changePassword = (payload) => api.patch('/users/me/password', payload);

// Driver onboarding + passenger profile
export const getDriverDetails = () => api.get('/users/me/driver-details');
export const updateDriverDetails = (payload) => api.post('/users/me/driver-details', payload);
export const updatePassengerProfile = (payload) => api.patch('/users/me/passenger-profile', payload);

export default {
  getProfile, updateProfile, setAvatar, removeAvatar, changePassword,
  getDriverDetails, updateDriverDetails, updatePassengerProfile,
};
