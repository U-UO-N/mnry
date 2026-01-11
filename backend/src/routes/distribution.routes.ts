import { Router } from 'express';
import { DistributionController } from '../controllers/distribution.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Income routes
router.get('/income', DistributionController.getIncome);
router.get('/income/records', DistributionController.getIncomeRecords);

// Withdrawal routes
router.post('/withdraw', DistributionController.requestWithdraw);
router.get('/withdrawals', DistributionController.getWithdrawals);

export default router;
