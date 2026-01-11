import { Router } from 'express';
import { DistributionController } from '../controllers/distribution.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

// Share link generation requires authentication
router.get('/:productId', authenticate, DistributionController.generateShareLink);

export default router;
