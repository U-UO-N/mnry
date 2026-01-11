import { Router } from 'express';
import { HomeController } from '../controllers/home.controller';

const router = Router();

// GET /api/home/banners - Get active banners
router.get('/banners', HomeController.getBanners);

// GET /api/home/hot-products - Get hot products
router.get('/hot-products', HomeController.getHotProducts);

// GET /api/home/category-shortcuts - Get category shortcuts
router.get('/category-shortcuts', HomeController.getCategoryShortcuts);

// GET /api/home/group-buy - Get active group buy activities for home page
router.get('/group-buy', HomeController.getGroupBuyActivities);

export default router;
