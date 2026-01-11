import { Request, Response, NextFunction } from 'express';
import { CategoryService } from '../services/category.service';
import { NotFoundError, ValidationError, BusinessError } from '../middlewares/errorHandler';
import { CreateCategoryDTO, UpdateCategoryDTO } from '../models/category.model';
import { BusinessErrorCode } from '../types';

export class AdminCategoryController {
  // GET /api/admin/categories - Get category tree
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

  // GET /api/admin/categories/list - Get category list (flat)
  static async getCategoryList(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 100;

      const categories = await CategoryService.getAllCategories();
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      const list = categories.slice(start, end);

      res.json({
        success: true,
        data: {
          list,
          total: categories.length,
          page,
          pageSize,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/admin/categories/:id - Get category by ID
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

  // POST /api/admin/categories - Create new category
  static async createCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data: CreateCategoryDTO = req.body;

      // Validate required fields
      if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
        throw new ValidationError('Category name is required');
      }

      // If parentId is provided, verify parent exists
      if (data.parentId) {
        const parentCategory = await CategoryService.getCategoryById(data.parentId);
        if (!parentCategory) {
          throw new NotFoundError('Parent category not found');
        }
      }

      const category = await CategoryService.createCategory({
        ...data,
        name: data.name.trim(),
      });

      res.status(201).json({
        success: true,
        data: category,
      });
    } catch (error) {
      next(error);
    }
  }


  // PUT /api/admin/categories/:id - Update category
  static async updateCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data: UpdateCategoryDTO = req.body;

      // Check if category exists
      const existingCategory = await CategoryService.getCategoryById(id);
      if (!existingCategory) {
        throw new NotFoundError('Category not found');
      }

      // Validate fields if provided
      if (data.name !== undefined && (typeof data.name !== 'string' || data.name.trim() === '')) {
        throw new ValidationError('Category name cannot be empty');
      }

      const category = await CategoryService.updateCategory(id, {
        ...data,
        name: data.name?.trim(),
      });

      res.json({
        success: true,
        data: category,
      });
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/admin/categories/:id - Delete category
  static async deleteCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      // Check if category exists
      const existingCategory = await CategoryService.getCategoryById(id);
      if (!existingCategory) {
        throw new NotFoundError('Category not found');
      }

      const result = await CategoryService.deleteCategory(id);

      if (!result.success) {
        throw new BusinessError(result.message || 'Cannot delete category', BusinessErrorCode.CATEGORY_DELETE_FAILED);
      }

      res.json({
        success: true,
        message: 'Category deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}
