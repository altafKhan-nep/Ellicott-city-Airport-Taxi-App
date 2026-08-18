import { asyncHandler } from '../middleware/error.js';
import * as paymentService from '../services/paymentService.js';
import { notify } from '../services/notificationService.js';

// POST /api/rides/:rideId/payment-intent
export const createIntent = asyncHandler(async (req, res) => {
  const { rideId } = req.params;
  const { clientSecret, amount } = await paymentService.createPaymentIntent(
    req.user._id,
    rideId
  );
  res.json({ clientSecret, amount });
});

// POST /api/rides/:rideId/pay
export const payRide = asyncHandler(async (req, res) => {
  const { rideId } = req.params;
  const payment = await paymentService.processPayment(req.user._id, rideId, req.body);
  const io = req.app.get('io');

  if (payment.status === 'cash') {
    await notify({
      user: req.user._id,
      type: 'payment',
      title: 'Cash payment',
      message: `Pay $${payment.amount.toFixed(2)} in cash to your driver.`,
      data: { rideId, paymentId: payment._id },
      io,
    });
  } else if (payment.status === 'succeeded') {
    await notify({
      user: req.user._id,
      type: 'payment',
      title: 'Payment received',
      message: `Your payment of $${payment.amount.toFixed(2)} for ride ${rideId} succeeded.`,
      data: { rideId, paymentId: payment._id },
      io,
    });
  } else if (payment.status === 'failed') {
    await notify({
      user: req.user._id,
      type: 'payment',
      title: 'Payment failed',
      message: `We couldn't charge your card: ${payment.failureReason}`,
      data: { rideId, paymentId: payment._id },
      io,
    });
  }
  res.json({ payment });
});

export const listPayments = asyncHandler(async (req, res) => {
  res.json({ payments: await paymentService.listPayments(req.user._id) });
});

export const getPayment = asyncHandler(async (req, res) => {
  res.json({ payment: await paymentService.getPayment(req.user._id, req.params.id) });
});

export const refundPayment = asyncHandler(async (req, res) => {
  const payment = await paymentService.refundPayment(req.user._id, req.params.id);
  const io = req.app.get('io');
  await notify({
    user: req.user._id,
    type: 'payment',
    title: 'Refund issued',
    message: `Your refund of $${payment.amount.toFixed(2)} was issued.`,
    data: { rideId: payment.ride, paymentId: payment._id },
    io,
  });
  res.json({ payment });
});
