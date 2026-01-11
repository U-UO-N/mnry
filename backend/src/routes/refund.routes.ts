import { Router } from 'express';
import { RefundController } from '../controllers/refund.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

// All refund routes require authentication
router.use(authenticate);

// POST /api/refunds - Create refund request
router.post('/', RefundController.createRefund);

// GET /api/refunds/order/:orderId - Get refunds by order ID
router.get('/order/:orderId', RefundController.getRefundsByOrderId);

// GET /api/refunds/:id - Get refund by ID
router.get('/:id', RefundController.getRefundById);

export default router;
