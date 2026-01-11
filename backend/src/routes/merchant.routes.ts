import { Router } from 'express';
import { MerchantController } from '../controllers/merchant.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// User routes for merchant applications
router.post('/apply/store', MerchantController.applyForStore);
router.post('/apply/supplier', MerchantController.applyForSupplier);
router.get('/application/status', MerchantController.getApplicationStatus);
router.get('/applications', MerchantController.getUserApplications);

export default router;
