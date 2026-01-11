import { Request, Response, NextFunction } from 'express';
import { ProductService } from '../services/product.service';
import { NotFoundError, ValidationError } from '../middlewares/errorHandler';
import { BusinessErrorCode } from '../types';
import { ProductStatus, CreateProductDTO, UpdateProductDTO } from '../models/product.model';

export class AdminProductController {
  // GET /api/admin/products - Get product list with search, filter, pagination
  static async getProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        keyword,
        categoryId,
        status,
        page = '1',
        pageSize = '20',
      } = req.query;

      const result = await ProductService.getProductsForAdmin({
        keyword: keyword as string | undefined,
        categoryId: categoryId as string | undefined,
        status: status as ProductStatus | undefined,
        page: parseInt(page as string, 10),
        pageSize: parseInt(pageSize as string, 10),
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/admin/products/:id - Get product detail
  static async getProductDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const product = await ProductService.getProductDetail(id);

      if (!product) {
        throw new NotFoundError('Product not found', BusinessErrorCode.PRODUCT_NOT_FOUND);
      }

      res.json({
        success: true,
        data: product,
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/admin/products - Create new product
  static async createProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data: CreateProductDTO = req.body;

      // Validate required fields
      if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
        throw new ValidationError('Product name is required');
      }
      if (data.price === undefined || typeof data.price !== 'number' || data.price < 0) {
        throw new ValidationError('Valid product price is required');
      }
      if (!data.mainImage || typeof data.mainImage !== 'string') {
        throw new ValidationError('Product main image is required');
      }

      const product = await ProductService.createProduct({
        ...data,
        name: data.name.trim(),
      });

      res.status(201).json({
        success: true,
        data: product,
      });
    } catch (error) {
      next(error);
    }
  }

  // PUT /api/admin/products/:id - Update product
  static async updateProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const data: UpdateProductDTO = req.body;

      console.log('Update product request body:', JSON.stringify(data, null, 2));

      // Check if product exists
      const existingProduct = await ProductService.getProductById(id);
      if (!existingProduct) {
        throw new NotFoundError('Product not found', BusinessErrorCode.PRODUCT_NOT_FOUND);
      }

      // Validate fields if provided
      if (data.name !== undefined && (typeof data.name !== 'string' || data.name.trim() === '')) {
        throw new ValidationError('Product name cannot be empty');
      }
      if (data.price !== undefined && (typeof data.price !== 'number' || data.price < 0)) {
        throw new ValidationError('Product price must be a non-negative number');
      }

      const product = await ProductService.updateProduct(id, {
        ...data,
        name: data.name?.trim(),
      });

      res.json({
        success: true,
        data: product,
      });
    } catch (error) {
      next(error);
    }
  }

  // PUT /api/admin/products/:id/status - Update product status (on/off sale)
  static async updateProductStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;

      // Validate status
      if (!status || !Object.values(ProductStatus).includes(status)) {
        throw new ValidationError('Invalid product status');
      }

      // Check if product exists
      const existingProduct = await ProductService.getProductById(id);
      if (!existingProduct) {
        throw new NotFoundError('Product not found', BusinessErrorCode.PRODUCT_NOT_FOUND);
      }

      const product = await ProductService.updateProductStatus(id, status);

      res.json({
        success: true,
        data: product,
      });
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/admin/products/:id - Delete product
  static async deleteProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      // Check if product exists
      const existingProduct = await ProductService.getProductById(id);
      if (!existingProduct) {
        throw new NotFoundError('Product not found', BusinessErrorCode.PRODUCT_NOT_FOUND);
      }

      await ProductService.deleteProduct(id);

      res.json({
        success: true,
        message: 'Product deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}
