import { Router } from 'express';
import { AdminHomeController } from '../controllers/adminHome.controller';
// import { authenticate } from '../middlewares/auth';

const router = Router();

// All admin routes require authentication (temporarily disabled for testing)
// router.use(authenticate);

// GET /api/admin/home/config - Get all home page configuration
router.get('/config', AdminHomeController.getHomeConfig);

// PUT /api/admin/home/banners - Configure banners
router.put('/banners', AdminHomeController.updateBanners);

// PUT /api/admin/home/hot-products - Configure hot products
router.put('/hot-products', AdminHomeController.updateHotProducts);

// PUT /api/admin/home/category-shortcuts - Configure category shortcuts
router.put('/category-shortcuts', AdminHomeController.updateCategoryShortcuts);

export default router;
