import { Router } from 'express';
import { UserBehaviorController } from '../controllers/userBehavior.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

// All routes require authentication

// Favorites routes
router.get('/favorites', authenticate, UserBehaviorController.getFavorites);
router.post('/favorites', authenticate, UserBehaviorController.addFavorite);
router.delete('/favorites/:productId', authenticate, UserBehaviorController.removeFavorite);

// Browse history routes
router.get('/browse-history', authenticate, UserBehaviorController.getBrowseHistory);
router.post('/browse-history', authenticate, UserBehaviorController.recordBrowse);

// Reviews routes
router.get('/reviews', authenticate, UserBehaviorController.getUserReviews);

export default router;
