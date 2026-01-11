import { Router } from 'express';
import { AdminDashboardController } from '../controllers/adminDashboard.controller';

const router = Router();

// GET /api/admin/dashboard/stats - Get dashboard statistics
router.get('/stats', AdminDashboardController.getStats);

// GET /api/admin/dashboard/pending - Get pending tasks
router.get('/pending', AdminDashboardController.getPendingTasks);

// GET /api/admin/dashboard/recent-orders - Get recent orders
router.get('/recent-orders', AdminDashboardController.getRecentOrders);

export default router;
