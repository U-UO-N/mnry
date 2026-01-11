import { Router } from 'express';
import { CategoryController } from '../controllers/category.controller';

const router = Router();

// GET /api/categories - Get top-level categories
router.get('/', CategoryController.getCategories);

// GET /api/categories/tree - Get full category tree (must be before :id route)
router.get('/tree', CategoryController.getCategoryTree);

// GET /api/categories/:id - Get category by ID
router.get('/:id', CategoryController.getCategoryById);

// GET /api/categories/:id/children - Get child categories
router.get('/:id/children', CategoryController.getChildCategories);

export default router;
