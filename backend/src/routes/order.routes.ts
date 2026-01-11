import { Router } from 'express';
import { OrderController } from '../controllers/order.controller';
import { UserBehaviorController } from '../controllers/userBehavior.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

// All order routes require authentication
router.use(authenticate);

// POST /api/orders - Create order from cart
router.post('/', OrderController.createOrder);

// GET /api/orders - Get orders list
router.get('/', OrderController.getOrders);

// GET /api/orders/:id - Get order detail
router.get('/:id', OrderController.getOrderDetail);

// POST /api/orders/:id/cancel - Cancel order
router.post('/:id/cancel', OrderController.cancelOrder);

// POST /api/orders/:id/confirm - Confirm receipt
router.post('/:id/confirm', OrderController.confirmReceipt);

// POST /api/orders/:id/refund - Apply for refund
router.post('/:id/refund', OrderController.applyRefund);

// POST /api/orders/:id/review - Create review for order
router.post('/:id/review', UserBehaviorController.createReview);

export default router;
