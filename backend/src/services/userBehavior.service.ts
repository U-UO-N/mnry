import {
  FavoriteModel,
  BrowseHistoryModel,
  ReviewModel,
  FavoriteWithProduct,
  BrowseHistoryWithProduct,
  ReviewWithProduct,
  Favorite,
  BrowseHistory,
  Review,
} from '../models/userBehavior.model';
import { ProductModel } from '../models/product.model';
import { OrderModel } from '../models/order.model';
import { PaginatedResult } from '../types';

export class UserBehaviorService {
  // ==================== Favorites ====================

  // Get user's favorites with pagination
  static async getFavorites(
    userId: string,
    page = 1,
    pageSize = 20
  ): Promise<PaginatedResult<FavoriteWithProduct>> {
    const { items, total } = await FavoriteModel.findByUserId(userId, page, pageSize);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  // Add product to favorites
  static async addFavorite(userId: string, productId: string): Promise<Favorite> {
    // Check if product exists
    const product = await ProductModel.findById(productId);
    if (!product) {
      throw new Error('Product not found');
    }

    // Check if already favorited
    const existing = await FavoriteModel.findByUserAndProduct(userId, productId);
    if (existing) {
      return existing;
    }

    return FavoriteModel.create(userId, productId);
  }

  // Remove product from favorites
  static async removeFavorite(userId: string, productId: string): Promise<boolean> {
    return FavoriteModel.deleteByUserAndProduct(userId, productId);
  }

  // Check if product is favorited
  static async isFavorited(userId: string, productId: string): Promise<boolean> {
    return FavoriteModel.isFavorited(userId, productId);
  }

  // Get favorites count
  static async getFavoritesCount(userId: string): Promise<number> {
    return FavoriteModel.getCountByUserId(userId);
  }


  // ==================== Browse History ====================

  // Get user's browse history with pagination
  static async getBrowseHistory(
    userId: string,
    page = 1,
    pageSize = 20
  ): Promise<PaginatedResult<BrowseHistoryWithProduct>> {
    const { items, total } = await BrowseHistoryModel.findByUserId(userId, page, pageSize);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  // Record product view
  static async recordBrowse(userId: string, productId: string): Promise<BrowseHistory> {
    // Check if product exists
    const product = await ProductModel.findById(productId);
    if (!product) {
      throw new Error('Product not found');
    }

    return BrowseHistoryModel.upsert(userId, productId);
  }

  // Clear browse history
  static async clearBrowseHistory(userId: string): Promise<boolean> {
    return BrowseHistoryModel.clearByUserId(userId);
  }

  // Get browse history count
  static async getBrowseHistoryCount(userId: string): Promise<number> {
    return BrowseHistoryModel.getCountByUserId(userId);
  }

  // ==================== Reviews ====================

  // Get user's reviews with pagination
  static async getUserReviews(
    userId: string,
    page = 1,
    pageSize = 20
  ): Promise<PaginatedResult<ReviewWithProduct>> {
    const { items, total } = await ReviewModel.findByUserId(userId, page, pageSize);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  // Create review for order
  static async createReview(
    userId: string,
    orderId: string,
    data: {
      rating: number;
      content: string;
      images?: string[];
    }
  ): Promise<Review> {
    // Check if order exists and belongs to user
    const order = await OrderModel.findById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }
    if (order.userId !== userId) {
      throw new Error('Order does not belong to user');
    }

    // Check if order is completed
    if (order.status !== 'completed') {
      throw new Error('Can only review completed orders');
    }

    // Check if already reviewed
    const hasReviewed = await ReviewModel.hasReviewed(orderId);
    if (hasReviewed) {
      throw new Error('Order has already been reviewed');
    }

    // Get product ID from order items (use first item for simplicity)
    const orderItems = await OrderModel.getOrderItems(orderId);
    if (orderItems.length === 0) {
      throw new Error('Order has no items');
    }

    const productId = orderItems[0].productId;

    return ReviewModel.create({
      userId,
      orderId,
      productId,
      rating: data.rating,
      content: data.content,
      images: data.images,
    });
  }

  // Get product reviews
  static async getProductReviews(
    productId: string,
    page = 1,
    pageSize = 20
  ): Promise<PaginatedResult<Review>> {
    const { items, total } = await ReviewModel.findByProductId(productId, page, pageSize);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  // Get product average rating
  static async getProductRating(productId: string): Promise<{ average: number; count: number }> {
    const average = await ReviewModel.getAverageRating(productId);
    const count = await ReviewModel.getCountByProductId(productId);
    return { average, count };
  }
}
