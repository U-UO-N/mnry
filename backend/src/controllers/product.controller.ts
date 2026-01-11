import { Request, Response, NextFunction } from 'express';
import { ProductService } from '../services/product.service';
import { NotFoundError } from '../middlewares/errorHandler';
import { BusinessErrorCode } from '../types';
import { ProductStatus } from '../models/product.model';

export class ProductController {
  // GET /api/products - Get product list with pagination and filters
  static async getProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { 
        categoryId, 
        page = '1', 
        pageSize = '20',
        keyword 
      } = req.query;

      const result = await ProductService.getProducts({
        categoryId: categoryId as string | undefined,
        keyword: keyword as string | undefined,
        page: parseInt(page as string, 10),
        pageSize: parseInt(pageSize as string, 10),
        status: ProductStatus.ON_SALE,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/products/:id - Get product detail
  static async getProductDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const product = await ProductService.getProductDetail(id);

      if (!product) {
        throw new NotFoundError('Product not found', BusinessErrorCode.PRODUCT_NOT_FOUND);
      }

      // Check if product is available for public view
      if (product.status !== ProductStatus.ON_SALE) {
        throw new NotFoundError('Product not available', BusinessErrorCode.PRODUCT_OFF_SALE);
      }

      res.json({
        success: true,
        data: product,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/products/search - Search products by keyword
  static async searchProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { 
        keyword = '', 
        page = '1', 
        pageSize = '20' 
      } = req.query;

      const result = await ProductService.searchProducts(
        keyword as string,
        parseInt(page as string, 10),
        parseInt(pageSize as string, 10)
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/products/category/:categoryId - Get products by category
  static async getProductsByCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { categoryId } = req.params;
      const { page = '1', pageSize = '20' } = req.query;

      const result = await ProductService.getProductsByCategory(
        categoryId,
        parseInt(page as string, 10),
        parseInt(pageSize as string, 10)
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
