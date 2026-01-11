import { Router } from 'express';
import { CartController } from '../controllers/cart.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

// All cart routes require authentication
router.use(authenticate);

// GET /api/cart - Get cart items with summary
router.get('/', CartController.getCart);

// GET /api/cart/count - Get cart item count
router.get('/count', CartController.getCartCount);

// POST /api/cart - Add item to cart
router.post('/', CartController.addToCart);

// PUT /api/cart/select-all - Select/deselect all items
router.put('/select-all', CartController.selectAll);

// PUT /api/cart/:id - Update cart item
router.put('/:id', CartController.updateCartItem);

// DELETE /api/cart/:id - Remove item from cart
router.delete('/:id', CartController.removeCartItem);

// DELETE /api/cart - Clear cart (must be after /:id to avoid conflict)
router.delete('/', CartController.clearCart);

export default router;
