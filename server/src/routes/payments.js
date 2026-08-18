import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import * as payment from '../controllers/paymentController.js';

const router = Router();

router.use(protect);

router.get('/', payment.listPayments);
router.get('/:id', payment.getPayment);
router.post('/:id/refund', payment.refundPayment);

export default router;
