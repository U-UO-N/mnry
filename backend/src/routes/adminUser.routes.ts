import { Router } from 'express';
import { AdminUserController } from '../controllers/adminUser.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

// All admin routes require authentication
// router.use(authenticate);

// GET /api/admin/users - Get user list
router.get('/', AdminUserController.getUsers);

// GET /api/admin/users/:id - Get user detail
router.get('/:id', AdminUserController.getUserDetail);

// PUT /api/admin/users/:id/points - Adjust user points
router.put('/:id/points', AdminUserController.adjustPoints);

// PUT /api/admin/users/:id/balance - Adjust user balance
router.put('/:id/balance', AdminUserController.adjustBalance);

// PUT /api/admin/users/:id/member-level - Adjust user member level
router.put('/:id/member-level', AdminUserController.adjustMemberLevel);

export default router;
