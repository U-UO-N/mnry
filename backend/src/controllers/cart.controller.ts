import { Response, NextFunction } from 'express';
import { CartService } from '../services/cart.service';
import { AuthenticatedRequest } from '../types';
import { BadRequestError, UnauthorizedError } from '../middlewares/errorHandler';

export class CartController {
  // GET /api/cart - Get cart items with summary
  static async getCart(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new UnauthorizedError('User not authenticated');
      }

      const cart = await CartService.getCart(userId);

      res.json({
        success: true,
        data: cart,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/cart/count - Get cart item count
  static async getCartCount(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new UnauthorizedError('User not authenticated');
      }

      const count = await CartService.getCartCount(userId);

      res.json({
        success: true,
        data: { count },
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/cart - Add item to cart
  static async addToCart(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new UnauthorizedError('User not authenticated');
      }

      const { productId, skuId, quantity } = req.body;

      if (!productId) {
        throw new BadRequestError('Product ID is required');
      }
      if (!quantity || quantity < 1) {
        throw new BadRequestError('Quantity must be at least 1');
      }

      const cartItem = await CartService.addToCart(userId, {
        productId,
        skuId,
        quantity: parseInt(quantity, 10),
      });

      res.status(201).json({
        success: true,
        data: cartItem,
      });
    } catch (error) {
      next(error);
    }
  }


  // PUT /api/cart/:id - Update cart item
  static async updateCartItem(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new UnauthorizedError('User not authenticated');
      }

      const { id } = req.params;
      const { quantity, selected } = req.body;

      if (quantity !== undefined && quantity < 1) {
        throw new BadRequestError('Quantity must be at least 1');
      }

      const cartItem = await CartService.updateCartItem(userId, id, {
        quantity: quantity !== undefined ? parseInt(quantity, 10) : undefined,
        selected,
      });

      res.json({
        success: true,
        data: cartItem,
      });
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/cart/:id - Remove item from cart
  static async removeCartItem(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new UnauthorizedError('User not authenticated');
      }

      const { id } = req.params;

      await CartService.removeCartItem(userId, id);

      res.json({
        success: true,
        message: 'Cart item removed',
      });
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/cart - Clear cart
  static async clearCart(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new UnauthorizedError('User not authenticated');
      }

      await CartService.clearCart(userId);

      res.json({
        success: true,
        message: 'Cart cleared',
      });
    } catch (error) {
      next(error);
    }
  }

  // PUT /api/cart/select-all - Select/deselect all items
  static async selectAll(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new UnauthorizedError('User not authenticated');
      }

      const { selected } = req.body;

      if (selected === undefined) {
        throw new BadRequestError('Selected status is required');
      }

      await CartService.selectAll(userId, selected);

      res.json({
        success: true,
        message: selected ? 'All items selected' : 'All items deselected',
      });
    } catch (error) {
      next(error);
    }
  }
}
