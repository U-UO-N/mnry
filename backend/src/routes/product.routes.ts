import { Router } from 'express';
import { ProductController } from '../controllers/product.controller';

const router = Router();

// GET /api/products/search - Search products (must be before :id route)
router.get('/search', ProductController.searchProducts);

// GET /api/products/category/:categoryId - Get products by category
router.get('/category/:categoryId', ProductController.getProductsByCategory);

// GET /api/products - Get product list
router.get('/', ProductController.getProducts);

// GET /api/products/:id - Get product detail
router.get('/:id', ProductController.getProductDetail);

export default router;
