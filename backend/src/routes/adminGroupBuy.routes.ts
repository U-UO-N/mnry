import { Router } from 'express';
import { AdminGroupBuyController } from '../controllers/adminGroupBuy.controller';
// import { authenticate } from '../middlewares/auth';

const router = Router();

// All admin routes require authentication (temporarily disabled for testing)
// router.use(authenticate);

// GET /api/admin/group-buy/activities - Get activity list with filters
router.get('/activities', AdminGroupBuyController.getActivities);

// GET /api/admin/group-buy/activities/:id - Get activity detail
router.get('/activities/:id', AdminGroupBuyController.getActivityDetail);

// POST /api/admin/group-buy/activities - Create new activity
router.post('/activities', AdminGroupBuyController.createActivity);

// PUT /api/admin/group-buy/activities/:id - Update activity
router.put('/activities/:id', AdminGroupBuyController.updateActivity);

// GET /api/admin/group-buy/activities/:id/stats - Get activity statistics
router.get('/activities/:id/stats', AdminGroupBuyController.getActivityStats);

// POST /api/admin/group-buy/activities/:id/start - Manually start activity
router.post('/activities/:id/start', AdminGroupBuyController.startActivity);

// POST /api/admin/group-buy/activities/:id/end - Manually end activity
router.post('/activities/:id/end', AdminGroupBuyController.endActivity);

export default router;
