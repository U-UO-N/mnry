import { Request, Response, NextFunction } from 'express';
import { HomeService } from '../services/home.service';
import { GroupBuyService } from '../services/groupBuy.service';

export class HomeController {
  // GET /api/home/banners - Get active banners
  static async getBanners(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const banners = await HomeService.getBanners();

      res.json({
        success: true,
        data: banners,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/home/hot-products - Get hot products
  static async getHotProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const products = await HomeService.getHotProducts();

      res.json({
        success: true,
        data: products,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/home/category-shortcuts - Get category shortcuts
  static async getCategoryShortcuts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const shortcuts = await HomeService.getCategoryShortcuts();

      res.json({
        success: true,
        data: shortcuts,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/home/group-buy - Get active group buy activities for home page
  static async getGroupBuyActivities(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 4;
      const result = await GroupBuyService.getActivities(1, limit);

      res.json({
        success: true,
        data: result.items,
      });
    } catch (error) {
      next(error);
    }
  }
}
