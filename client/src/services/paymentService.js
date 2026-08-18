import api from './api.js';

// Payments
export const payRide = (rideId, payload) => api.post(`/rides/${rideId}/pay`, payload);
export const createPaymentIntent = (rideId) => api.post(`/rides/${rideId}/payment-intent`);
export const listPayments = () => api.get('/payments');
export const getPayment = (id) => api.get(`/payments/${id}`);
export const refundPayment = (id) => api.post(`/payments/${id}/refund`);

export default { payRide, createPaymentIntent, listPayments, getPayment, refundPayment };
