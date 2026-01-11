import { Router } from 'express';
import { AdminMaterialController } from '../controllers/adminMaterial.controller';
// import { authenticate } from '../middlewares/auth';

const router = Router();

// All admin routes require authentication (temporarily disabled for testing)
// router.use(authenticate);

// GET /api/admin/materials - Get materials list with filtering and pagination
router.get('/', AdminMaterialController.getMaterials);

// GET /api/admin/materials/categories - Get all material categories
router.get('/categories', AdminMaterialController.getCategories);

// POST /api/admin/materials - Upload material(s)
router.post('/', AdminMaterialController.uploadMaterial);

// DELETE /api/admin/materials/:id - Delete a material
router.delete('/:id', AdminMaterialController.deleteMaterial);

export default router;
