import { Router } from 'express';
import { CheckInController } from '../controllers/checkIn.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

// All routes require authentication

// GET /api/check-in/status - Get check-in status
router.get('/status', authenticate, CheckInController.getStatus);

// POST /api/check-in - Perform check-in
router.post('/', authenticate, CheckInController.checkIn);

// GET /api/check-in/calendar - Get check-in calendar
router.get('/calendar', authenticate, CheckInController.getCalendar);

export default router;
