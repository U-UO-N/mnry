import { Request, Response, NextFunction } from 'express';
import { HomeService } from '../services/home.service';
import { ValidationError } from '../middlewares/errorHandler';
import { LinkType, BannerDTO, CategoryShortcutDTO } from '../models/home.model';

export class AdminHomeController {
  // GET /api/admin/home/config - Get all home page configuration
  static async getHomeConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const [banners, hotProductIds, categoryShortcuts] = await Promise.all([
        HomeService.getAllBanners(),
        HomeService.getHotProductIds(),
        HomeService.getCategoryShortcuts(),
      ]);

      res.json({
        success: true,
        data: {
          banners,
          hotProductIds,
          categoryShortcuts,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // PUT /api/admin/home/banners - Configure banners
  static async updateBanners(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { banners } = req.body;

      // Validate banners array
      if (!Array.isArray(banners)) {
        throw new ValidationError('Banners must be an array');
      }

      // Validate each banner
      for (let i = 0; i < banners.length; i++) {
        const banner = banners[i];
        if (!banner.image || typeof banner.image !== 'string') {
          throw new ValidationError(`Banner at index ${i}: image is required`);
        }
        if (!banner.linkType || !Object.values(LinkType).includes(banner.linkType)) {
          throw new ValidationError(`Banner at index ${i}: invalid linkType`);
        }
      }

      // Replace all banners
      const result = await HomeService.replaceBanners(banners as BannerDTO[]);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // PUT /api/admin/home/hot-products - Configure hot products
  static async updateHotProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { productIds } = req.body;

      // Validate productIds array
      if (!Array.isArray(productIds)) {
        throw new ValidationError('productIds must be an array');
      }

      // Validate each productId is a string
      for (let i = 0; i < productIds.length; i++) {
        if (typeof productIds[i] !== 'string') {
          throw new ValidationError(`productId at index ${i} must be a string`);
        }
      }

      await HomeService.updateHotProducts(productIds);

      res.json({
        success: true,
        data: { productIds },
      });
    } catch (error) {
      next(error);
    }
  }

  // PUT /api/admin/home/category-shortcuts - Configure category shortcuts
  static async updateCategoryShortcuts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { shortcuts } = req.body;

      // Validate shortcuts array
      if (!Array.isArray(shortcuts)) {
        throw new ValidationError('shortcuts must be an array');
      }

      // Validate each shortcut
      for (let i = 0; i < shortcuts.length; i++) {
        const shortcut = shortcuts[i];
        if (!shortcut.categoryId || typeof shortcut.categoryId !== 'string') {
          throw new ValidationError(`Shortcut at index ${i}: categoryId is required`);
        }
        if (!shortcut.name || typeof shortcut.name !== 'string') {
          throw new ValidationError(`Shortcut at index ${i}: name is required`);
        }
        if (!shortcut.icon || typeof shortcut.icon !== 'string') {
          throw new ValidationError(`Shortcut at index ${i}: icon is required`);
        }
      }

      const result = await HomeService.updateCategoryShortcuts(shortcuts as CategoryShortcutDTO[]);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
