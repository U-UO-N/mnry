import { 
  ProductModel, 
  ProductSKUModel,
  Product, 
  ProductDetail, 
  ProductStatus, 
  ProductQuery,
  CreateProductDTO,
  UpdateProductDTO,
  CreateSKUDTO
} from '../models/product.model';
import { PaginatedResult } from '../types';

export class ProductService {
  // Get products with pagination and filters
  static async getProducts(queryParams: ProductQuery): Promise<PaginatedResult<Product>> {
    const { page = 1, pageSize = 20 } = queryParams;
    const { items, total } = await ProductModel.findMany({
      ...queryParams,
      // Only show on_sale products for public API
      status: queryParams.status || ProductStatus.ON_SALE,
    });

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  // Get all products for admin (no status filter by default)
  static async getProductsForAdmin(queryParams: ProductQuery): Promise<PaginatedResult<Product>> {
    const { page = 1, pageSize = 20 } = queryParams;
    const { items, total } = await ProductModel.findMany({
      ...queryParams,
      // Admin can see all statuses, only filter if explicitly specified
      status: queryParams.status,
    });

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  // Get product detail by ID
  static async getProductDetail(productId: string): Promise<ProductDetail | null> {
    return ProductModel.getDetail(productId);
  }

  // Get product by ID (basic info)
  static async getProductById(productId: string): Promise<Product | null> {
    return ProductModel.findById(productId);
  }

  // Get products by category
  static async getProductsByCategory(
    categoryId: string, 
    page = 1, 
    pageSize = 20
  ): Promise<PaginatedResult<Product>> {
    const { items, total } = await ProductModel.findByCategory(categoryId, page, pageSize);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  // Search products by keyword
  static async searchProducts(
    keyword: string, 
    page = 1, 
    pageSize = 20
  ): Promise<PaginatedResult<Product>> {
    const { items, total } = await ProductModel.search(keyword, page, pageSize);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  // Create product (admin)
  static async createProduct(data: CreateProductDTO): Promise<Product> {
    return ProductModel.create(data);
  }

  // Update product (admin)
  static async updateProduct(productId: string, data: UpdateProductDTO): Promise<Product | null> {
    return ProductModel.update(productId, data);
  }

  // Update product status (admin)
  static async updateProductStatus(productId: string, status: ProductStatus): Promise<Product | null> {
    return ProductModel.updateStatus(productId, status);
  }

  // Delete product (admin)
  static async deleteProduct(productId: string): Promise<boolean> {
    // Delete SKUs first
    await ProductSKUModel.deleteByProductId(productId);
    return ProductModel.delete(productId);
  }

  // Create SKU for product
  static async createSKU(data: CreateSKUDTO): Promise<ReturnType<typeof ProductSKUModel.create>> {
    return ProductSKUModel.create(data);
  }

  // Get SKUs for product
  static async getProductSKUs(productId: string): Promise<ReturnType<typeof ProductSKUModel.findByProductId>> {
    return ProductSKUModel.findByProductId(productId);
  }
}
