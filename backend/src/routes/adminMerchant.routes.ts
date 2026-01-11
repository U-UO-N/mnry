import { Router } from 'express';
import { AdminUserController } from '../controllers/adminUser.controller';
// import { authenticate } from '../middlewares/auth';

const router = Router();

// All admin routes require authentication (temporarily disabled for testing)
// router.use(authenticate);

// GET /api/admin/merchant/applications - Get merchant applications list
router.get('/applications', AdminUserController.getMerchantApplications);

// POST /api/admin/merchant/applications/:id/review - Review merchant application
router.post('/applications/:id/review', AdminUserController.reviewApplication);

export default router;
