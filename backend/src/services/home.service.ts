import {
  BannerModel,
  Banner,
  BannerDTO,
  HomeHotProductModel,
  CategoryShortcutModel,
  CategoryShortcut,
  CategoryShortcutDTO,
} from '../models/home.model';
import { ProductModel, Product, ProductStatus } from '../models/product.model';

// Hot product with full product details
export interface HotProductWithDetails {
  id: string;
  productId: string;
  sort: number;
  product: Product;
}

export class HomeService {
  // ==================== Banner APIs ====================

  // Get active banners for frontend display
  static async getBanners(): Promise<Banner[]> {
    return BannerModel.findActive();
  }

  // Get all banners for admin
  static async getAllBanners(): Promise<Banner[]> {
    return BannerModel.findAll();
  }

  // Create banner
  static async createBanner(data: BannerDTO): Promise<Banner> {
    return BannerModel.create(data);
  }

  // Update banner
  static async updateBanner(id: string, data: Partial<BannerDTO>): Promise<Banner | null> {
    return BannerModel.update(id, data);
  }

  // Delete banner
  static async deleteBanner(id: string): Promise<boolean> {
    return BannerModel.delete(id);
  }

  // Replace all banners (batch update)
  static async replaceBanners(banners: BannerDTO[]): Promise<Banner[]> {
    return BannerModel.replaceAll(banners);
  }


  // ==================== Hot Products APIs ====================

  // Get hot products with full product details for frontend
  static async getHotProducts(): Promise<Product[]> {
    const hotProductIds = await HomeHotProductModel.getProductIds();
    
    if (hotProductIds.length === 0) {
      return [];
    }

    // Fetch products and filter only on_sale ones
    const products: Product[] = [];
    for (const productId of hotProductIds) {
      const product = await ProductModel.findById(productId);
      if (product && product.status === ProductStatus.ON_SALE) {
        products.push(product);
      }
    }

    return products;
  }

  // Get hot product IDs for admin
  static async getHotProductIds(): Promise<string[]> {
    return HomeHotProductModel.getProductIds();
  }

  // Add product to hot products
  static async addHotProduct(productId: string): Promise<void> {
    await HomeHotProductModel.add(productId);
  }

  // Remove product from hot products
  static async removeHotProduct(productId: string): Promise<boolean> {
    return HomeHotProductModel.remove(productId);
  }

  // Update hot products (replace all)
  static async updateHotProducts(productIds: string[]): Promise<void> {
    await HomeHotProductModel.replaceAll(productIds);
  }

  // ==================== Category Shortcuts APIs ====================

  // Get category shortcuts for frontend
  static async getCategoryShortcuts(): Promise<CategoryShortcut[]> {
    return CategoryShortcutModel.findAll();
  }

  // Create category shortcut
  static async createCategoryShortcut(data: CategoryShortcutDTO): Promise<CategoryShortcut> {
    return CategoryShortcutModel.create(data);
  }

  // Update category shortcut
  static async updateCategoryShortcut(
    id: string,
    data: Partial<CategoryShortcutDTO>
  ): Promise<CategoryShortcut | null> {
    return CategoryShortcutModel.update(id, data);
  }

  // Delete category shortcut
  static async deleteCategoryShortcut(id: string): Promise<boolean> {
    return CategoryShortcutModel.delete(id);
  }

  // Update category shortcuts (replace all)
  static async updateCategoryShortcuts(shortcuts: CategoryShortcutDTO[]): Promise<CategoryShortcut[]> {
    return CategoryShortcutModel.replaceAll(shortcuts);
  }
}
