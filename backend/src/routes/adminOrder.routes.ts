import { Router } from 'express';
import { AdminOrderController } from '../controllers/adminOrder.controller';
// import { authenticate } from '../middlewares/auth';

const router = Router();

// All admin routes require authentication (temporarily disabled for testing)
// router.use(authenticate);

// GET /api/admin/orders - Get order list with filters
router.get('/', AdminOrderController.getOrders);

// GET /api/admin/orders/:id - Get order detail
router.get('/:id', AdminOrderController.getOrderDetail);

// POST /api/admin/orders/:id/ship - Ship order
router.post('/:id/ship', AdminOrderController.shipOrder);

// POST /api/admin/orders/:id/refund - Process refund
router.post('/:id/refund', AdminOrderController.processRefund);

export default router;
