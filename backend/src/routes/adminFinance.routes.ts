import { Router } from 'express';
import { AdminFinanceController } from '../controllers/adminFinance.controller';
// import { authenticate } from '../middlewares/auth';

const router = Router();

// All admin routes require authentication (temporarily disabled for testing)
// router.use(authenticate);

// GET /api/admin/finance/overview - Get fund overview
router.get('/overview', AdminFinanceController.getOverview);

// GET /api/admin/finance/transactions - Get transaction list
router.get('/transactions', AdminFinanceController.getTransactions);

// GET /api/admin/finance/withdrawals - Get withdrawal list
router.get('/withdrawals', AdminFinanceController.getWithdrawals);

// POST /api/admin/finance/withdrawals/:id/process - Process withdrawal
router.post('/withdrawals/:id/process', AdminFinanceController.processWithdrawal);

// GET /api/admin/finance/commissions - Get commission list
router.get('/commissions', AdminFinanceController.getCommissions);

export default router;
