import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

// Public routes
router.post('/login', UserController.login);
router.post('/dev-login', UserController.devLogin);

// Protected routes (require authentication)
router.get('/info', authenticate, UserController.getInfo);
router.put('/info', authenticate, UserController.updateInfo);

export default router;
