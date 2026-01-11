import { Router } from 'express';
import { BenefitsController } from '../controllers/benefits.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

// All routes require authentication

// Balance routes
router.get('/balance', authenticate, BenefitsController.getBalance);
router.get('/balance/records', authenticate, BenefitsController.getBalanceRecords);
router.post('/balance/recharge', authenticate, BenefitsController.rechargeBalance);

// Points routes
router.get('/points', authenticate, BenefitsController.getPoints);
router.get('/points/records', authenticate, BenefitsController.getPointsRecords);
router.get('/points/discount', authenticate, BenefitsController.getPointsDiscount);

// Coupon routes
router.get('/coupons', authenticate, BenefitsController.getCoupons);
router.get('/coupons/counts', authenticate, BenefitsController.getCouponCounts);

export default router;
