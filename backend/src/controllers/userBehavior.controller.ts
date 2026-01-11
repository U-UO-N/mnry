import { Response, NextFunction } from 'express';
import { UserBehaviorService } from '../services/userBehavior.service';
import { AuthenticatedRequest, BusinessErrorCode } from '../types';
import { BadRequestError, NotFoundError } from '../middlewares/errorHandler';

export class UserBehaviorController {
  // ==================== Favorites ====================

  // GET /api/user/favorites - Get user's favorites
  static async getFavorites(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new BadRequestError('User ID not found');
      }

      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 20;

      const result = await UserBehaviorService.getFavorites(userId, page, pageSize);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/user/favorites - Add product to favorites
  static async addFavorite(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new BadRequestError('User ID not found');
      }

      const { productId } = req.body;
      if (!productId) {
        throw new BadRequestError('Product ID is required');
      }

      const favorite = await UserBehaviorService.addFavorite(userId, productId);

      res.json({
        success: true,
        data: favorite,
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Product not found') {
        next(new NotFoundError('Product not found', BusinessErrorCode.PRODUCT_NOT_FOUND));
      } else {
        next(error);
      }
    }
  }

  // DELETE /api/user/favorites/:productId - Remove product from favorites
  static async removeFavorite(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new BadRequestError('User ID not found');
      }

      const { productId } = req.params;
      if (!productId) {
        throw new BadRequestError('Product ID is required');
      }

      await UserBehaviorService.removeFavorite(userId, productId);

      res.json({
        success: true,
        message: 'Favorite removed successfully',
      });
    } catch (error) {
      next(error);
    }
  }


  // ==================== Browse History ====================

  // GET /api/user/browse-history - Get user's browse history
  static async getBrowseHistory(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new BadRequestError('User ID not found');
      }

      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 20;

      const result = await UserBehaviorService.getBrowseHistory(userId, page, pageSize);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/user/browse-history - Record product view
  static async recordBrowse(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new BadRequestError('User ID not found');
      }

      const { productId } = req.body;
      if (!productId) {
        throw new BadRequestError('Product ID is required');
      }

      const history = await UserBehaviorService.recordBrowse(userId, productId);

      res.json({
        success: true,
        data: history,
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Product not found') {
        next(new NotFoundError('Product not found', BusinessErrorCode.PRODUCT_NOT_FOUND));
      } else {
        next(error);
      }
    }
  }

  // ==================== Reviews ====================

  // GET /api/user/reviews - Get user's reviews
  static async getUserReviews(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new BadRequestError('User ID not found');
      }

      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 20;

      const result = await UserBehaviorService.getUserReviews(userId, page, pageSize);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/orders/:id/review - Create review for order
  static async createReview(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new BadRequestError('User ID not found');
      }

      const orderId = req.params.id;
      if (!orderId) {
        throw new BadRequestError('Order ID is required');
      }

      const { rating, content, images } = req.body;

      if (!rating || rating < 1 || rating > 5) {
        throw new BadRequestError('Rating must be between 1 and 5');
      }

      if (!content || content.trim().length === 0) {
        throw new BadRequestError('Review content is required');
      }

      const review = await UserBehaviorService.createReview(userId, orderId, {
        rating,
        content: content.trim(),
        images,
      });

      res.json({
        success: true,
        data: review,
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Order not found') {
          next(new NotFoundError('Order not found', BusinessErrorCode.ORDER_NOT_FOUND));
        } else if (error.message === 'Order does not belong to user') {
          next(new BadRequestError('Order does not belong to user'));
        } else if (error.message === 'Can only review completed orders') {
          next(new BadRequestError('Can only review completed orders'));
        } else if (error.message === 'Order has already been reviewed') {
          next(new BadRequestError('Order has already been reviewed'));
        } else {
          next(error);
        }
      } else {
        next(error);
      }
    }
  }
}
