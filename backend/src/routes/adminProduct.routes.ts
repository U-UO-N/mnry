import { Router } from 'express';
import { AdminProductController } from '../controllers/adminProduct.controller';
// import { authenticate } from '../middlewares/auth';

const router = Router();

// All admin routes require authentication (temporarily disabled for testing)
// router.use(authenticate);

// GET /api/admin/products - Get product list with search, filter, pagination
router.get('/', AdminProductController.getProducts);

// GET /api/admin/products/:id - Get product detail
router.get('/:id', AdminProductController.getProductDetail);

// POST /api/admin/products - Create new product
router.post('/', AdminProductController.createProduct);

// PUT /api/admin/products/:id - Update product
router.put('/:id', AdminProductController.updateProduct);

// PUT /api/admin/products/:id/status - Update product status (on/off sale)
router.put('/:id/status', AdminProductController.updateProductStatus);

// DELETE /api/admin/products/:id - Delete product
router.delete('/:id', AdminProductController.deleteProduct);

export default router;
