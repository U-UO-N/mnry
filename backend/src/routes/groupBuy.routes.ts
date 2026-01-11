import { Router } from 'express';
import { GroupBuyController } from '../controllers/groupBuy.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

// Public routes
router.get('/activities', GroupBuyController.getActivities);
router.get('/activities/:id', GroupBuyController.getActivityDetail);
router.get('/activities/:id/groups', GroupBuyController.getAvailableGroups);

// Protected routes (require authentication)
router.post('/initiate', authenticate, GroupBuyController.initiateGroupBuy);
router.post('/join/:groupId', authenticate, GroupBuyController.joinGroupBuy);
router.get('/my', authenticate, GroupBuyController.getMyGroupBuys);
router.get('/groups/:groupId', GroupBuyController.getGroupDetail);

export default router;
