import { Router } from 'express';
import { AdminCategoryController } from '../controllers/adminCategory.controller';
// import { authenticate } from '../middlewares/auth';

const router = Router();

// TODO: Re-enable authentication in production
// router.use(authenticate);

// GET /api/admin/categories - Get category tree
router.get('/', AdminCategoryController.getCategoryTree);

// GET /api/admin/categories/list - Get category list (flat)
router.get('/list', AdminCategoryController.getCategoryList);

// GET /api/admin/categories/:id - Get category by ID
router.get('/:id', AdminCategoryController.getCategoryById);

// POST /api/admin/categories - Create new category
router.post('/', AdminCategoryController.createCategory);

// PUT /api/admin/categories/:id - Update category
router.put('/:id', AdminCategoryController.updateCategory);

// DELETE /api/admin/categories/:id - Delete category
router.delete('/:id', AdminCategoryController.deleteCategory);

export default router;
