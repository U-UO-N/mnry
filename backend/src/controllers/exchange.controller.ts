import { Response, NextFunction } from 'express';
import { ExchangeService } from '../services/exchange.service';
import { AuthenticatedRequest, BusinessErrorCode } from '../types';
import { BadRequestError, NotFoundError, BusinessError } from '../middlewares/errorHandler';

export class ExchangeController {
  // GET /api/exchange/items - Get exchange items list
  static async getItems(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const items = await ExchangeService.getExchangeItems();

      res.json({
        success: true,
        data: items,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/exchange/items/:id - Get exchange item detail
  static async getItemDetail(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const item = await ExchangeService.getExchangeItemById(id);
      if (!item) {
        throw new NotFoundError('Exchange item not found');
      }

      res.json({
        success: true,
        data: item,
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/exchange - Perform exchange
  static async exchange(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new BadRequestError('User ID not found');
      }

      const { itemId } = req.body;
      if (!itemId) {
        throw new BadRequestError('Item ID is required');
      }

      const result = await ExchangeService.exchange(userId, itemId);

      if (!result.success) {
        if (result.message === 'User not found') {
          throw new NotFoundError('User not found', BusinessErrorCode.USER_NOT_FOUND);
        }
        if (result.message === 'Exchange item not found') {
          throw new NotFoundError('Exchange item not found');
        }
        if (result.message === 'Insufficient points') {
          throw new BusinessError('Insufficient points', BusinessErrorCode.POINTS_INSUFFICIENT);
        }
        throw new BadRequestError(result.message);
      }

      res.json({
        success: true,
        data: result.order,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/exchange/orders - Get user's exchange orders
  static async getOrders(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new BadRequestError('User ID not found');
      }

      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 20;

      const result = await ExchangeService.getUserExchangeOrders(userId, page, pageSize);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
