import { Request, Response, NextFunction } from 'express';
import { CategoryService } from '../services/category.service';
import { NotFoundError } from '../middlewares/errorHandler';

export class CategoryController {
  // GET /api/categories - Get top-level categories
  static async getCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const categories = await CategoryService.getTopLevelCategories();

      res.json({
        success: true,
        data: categories,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/categories/:id/children - Get child categories
  static async getChildCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      // Verify parent category exists
      const parentCategory = await CategoryService.getCategoryById(id);
      if (!parentCategory) {
        throw new NotFoundError('Category not found');
      }

      const children = await CategoryService.getChildCategories(id);

      res.json({
        success: true,
        data: children,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/categories/:id - Get category by ID
  static async getCategoryById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const category = await CategoryService.getCategoryById(id);
      if (!category) {
        throw new NotFoundError('Category not found');
      }

      res.json({
        success: true,
        data: category,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/categories/tree - Get full category tree
  static async getCategoryTree(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tree = await CategoryService.getCategoryTree();

      res.json({
        success: true,
        data: tree,
      });
    } catch (error) {
      next(error);
    }
  }
}
