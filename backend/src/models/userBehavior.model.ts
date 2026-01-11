import { v4 as uuidv4 } from 'uuid';
import { query, execute } from '../database/mysql';
import { RowDataPacket } from 'mysql2/promise';

// Favorite interface
export interface Favorite {
  id: string;
  userId: string;
  productId: string;
  createdAt: Date;
}

// Favorite with product details
export interface FavoriteWithProduct extends Favorite {
  productName: string;
  productImage: string;
  productPrice: number;
  productStatus: string;
}

// Browse history interface
export interface BrowseHistory {
  id: string;
  userId: string;
  productId: string;
  viewedAt: Date;
}

// Browse history with product details
export interface BrowseHistoryWithProduct extends BrowseHistory {
  productName: string;
  productImage: string;
  productPrice: number;
  productStatus: string;
}

// Review interface
export interface Review {
  id: string;
  userId: string;
  orderId: string;
  productId: string;
  rating: number;
  content: string;
  images: string[];
  createdAt: Date;
}

// Review with product details
export interface ReviewWithProduct extends Review {
  productName: string;
  productImage: string;
}

// Database row types
interface FavoriteRow extends RowDataPacket {
  id: string;
  user_id: string;
  product_id: string;
  created_at: Date;
}

interface FavoriteWithProductRow extends FavoriteRow {
  product_name: string;
  product_image: string;
  product_price: string;
  product_status: string;
}


interface BrowseHistoryRow extends RowDataPacket {
  id: string;
  user_id: string;
  product_id: string;
  viewed_at: Date;
}

interface BrowseHistoryWithProductRow extends BrowseHistoryRow {
  product_name: string;
  product_image: string;
  product_price: string;
  product_status: string;
}

interface ReviewRow extends RowDataPacket {
  id: string;
  user_id: string;
  order_id: string;
  product_id: string;
  rating: number;
  content: string;
  images: string | null;
  created_at: Date;
}

interface ReviewWithProductRow extends ReviewRow {
  product_name: string;
  product_image: string;
}

// Parse JSON safely
const parseJSON = <T>(value: string | null, defaultValue: T): T => {
  if (!value) return defaultValue;
  try {
    return JSON.parse(value) as T;
  } catch {
    return defaultValue;
  }
};

// Map database row to Favorite object
const mapRowToFavorite = (row: FavoriteRow): Favorite => ({
  id: row.id,
  userId: row.user_id,
  productId: row.product_id,
  createdAt: row.created_at,
});

// Map database row to FavoriteWithProduct object
const mapRowToFavoriteWithProduct = (row: FavoriteWithProductRow): FavoriteWithProduct => ({
  id: row.id,
  userId: row.user_id,
  productId: row.product_id,
  createdAt: row.created_at,
  productName: row.product_name,
  productImage: row.product_image,
  productPrice: parseFloat(row.product_price),
  productStatus: row.product_status,
});


// Map database row to BrowseHistory object
const mapRowToBrowseHistory = (row: BrowseHistoryRow): BrowseHistory => ({
  id: row.id,
  userId: row.user_id,
  productId: row.product_id,
  viewedAt: row.viewed_at,
});

// Map database row to BrowseHistoryWithProduct object
const mapRowToBrowseHistoryWithProduct = (row: BrowseHistoryWithProductRow): BrowseHistoryWithProduct => ({
  id: row.id,
  userId: row.user_id,
  productId: row.product_id,
  viewedAt: row.viewed_at,
  productName: row.product_name,
  productImage: row.product_image,
  productPrice: parseFloat(row.product_price),
  productStatus: row.product_status,
});

// Map database row to Review object
const mapRowToReview = (row: ReviewRow): Review => ({
  id: row.id,
  userId: row.user_id,
  orderId: row.order_id,
  productId: row.product_id,
  rating: row.rating,
  content: row.content,
  images: parseJSON<string[]>(row.images, []),
  createdAt: row.created_at,
});

// Map database row to ReviewWithProduct object
const mapRowToReviewWithProduct = (row: ReviewWithProductRow): ReviewWithProduct => ({
  id: row.id,
  userId: row.user_id,
  orderId: row.order_id,
  productId: row.product_id,
  rating: row.rating,
  content: row.content,
  images: parseJSON<string[]>(row.images, []),
  createdAt: row.created_at,
  productName: row.product_name,
  productImage: row.product_image,
});


export class FavoriteModel {
  // Find favorite by ID
  static async findById(id: string): Promise<Favorite | null> {
    const rows = await query<FavoriteRow[]>('SELECT * FROM favorites WHERE id = ?', [id]);
    return rows.length > 0 ? mapRowToFavorite(rows[0]) : null;
  }

  // Find favorite by user and product
  static async findByUserAndProduct(userId: string, productId: string): Promise<Favorite | null> {
    const rows = await query<FavoriteRow[]>(
      'SELECT * FROM favorites WHERE user_id = ? AND product_id = ?',
      [userId, productId]
    );
    return rows.length > 0 ? mapRowToFavorite(rows[0]) : null;
  }

  // Get favorites by user with product details
  static async findByUserId(
    userId: string,
    page = 1,
    pageSize = 20
  ): Promise<{ items: FavoriteWithProduct[]; total: number }> {
    // Get total count
    const countRows = await query<RowDataPacket[]>(
      'SELECT COUNT(*) as total FROM favorites WHERE user_id = ?',
      [userId]
    );
    const total = countRows[0].total as number;

    // Get paginated results with product details
    const offset = (page - 1) * pageSize;
    const rows = await query<FavoriteWithProductRow[]>(
      `SELECT f.*, p.name as product_name, p.main_image as product_image, 
              p.price as product_price, p.status as product_status
       FROM favorites f
       JOIN products p ON f.product_id = p.id
       WHERE f.user_id = ?
       ORDER BY f.created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, pageSize, offset]
    );

    return {
      items: rows.map(mapRowToFavoriteWithProduct),
      total,
    };
  }

  // Create favorite
  static async create(userId: string, productId: string): Promise<Favorite> {
    const id = uuidv4();
    await execute(
      'INSERT INTO favorites (id, user_id, product_id) VALUES (?, ?, ?)',
      [id, userId, productId]
    );
    const favorite = await this.findById(id);
    if (!favorite) {
      throw new Error('Failed to create favorite');
    }
    return favorite;
  }

  // Delete favorite by ID
  static async delete(id: string): Promise<boolean> {
    const result = await execute('DELETE FROM favorites WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  // Delete favorite by user and product
  static async deleteByUserAndProduct(userId: string, productId: string): Promise<boolean> {
    const result = await execute(
      'DELETE FROM favorites WHERE user_id = ? AND product_id = ?',
      [userId, productId]
    );
    return result.affectedRows > 0;
  }

  // Check if product is favorited by user
  static async isFavorited(userId: string, productId: string): Promise<boolean> {
    const favorite = await this.findByUserAndProduct(userId, productId);
    return favorite !== null;
  }

  // Get favorite count for user
  static async getCountByUserId(userId: string): Promise<number> {
    const rows = await query<RowDataPacket[]>(
      'SELECT COUNT(*) as total FROM favorites WHERE user_id = ?',
      [userId]
    );
    return rows[0].total as number;
  }
}


export class BrowseHistoryModel {
  // Find browse history by ID
  static async findById(id: string): Promise<BrowseHistory | null> {
    const rows = await query<BrowseHistoryRow[]>('SELECT * FROM browse_history WHERE id = ?', [id]);
    return rows.length > 0 ? mapRowToBrowseHistory(rows[0]) : null;
  }

  // Find browse history by user and product
  static async findByUserAndProduct(userId: string, productId: string): Promise<BrowseHistory | null> {
    const rows = await query<BrowseHistoryRow[]>(
      'SELECT * FROM browse_history WHERE user_id = ? AND product_id = ?',
      [userId, productId]
    );
    return rows.length > 0 ? mapRowToBrowseHistory(rows[0]) : null;
  }

  // Get browse history by user with product details
  static async findByUserId(
    userId: string,
    page = 1,
    pageSize = 20
  ): Promise<{ items: BrowseHistoryWithProduct[]; total: number }> {
    // Get total count
    const countRows = await query<RowDataPacket[]>(
      'SELECT COUNT(*) as total FROM browse_history WHERE user_id = ?',
      [userId]
    );
    const total = countRows[0].total as number;

    // Get paginated results with product details
    const offset = (page - 1) * pageSize;
    const rows = await query<BrowseHistoryWithProductRow[]>(
      `SELECT bh.*, p.name as product_name, p.main_image as product_image, 
              p.price as product_price, p.status as product_status
       FROM browse_history bh
       JOIN products p ON bh.product_id = p.id
       WHERE bh.user_id = ?
       ORDER BY bh.viewed_at DESC
       LIMIT ? OFFSET ?`,
      [userId, pageSize, offset]
    );

    return {
      items: rows.map(mapRowToBrowseHistoryWithProduct),
      total,
    };
  }

  // Create or update browse history (upsert)
  static async upsert(userId: string, productId: string): Promise<BrowseHistory> {
    // Check if record exists
    const existing = await this.findByUserAndProduct(userId, productId);
    
    if (existing) {
      // Update viewed_at timestamp
      await execute(
        'UPDATE browse_history SET viewed_at = CURRENT_TIMESTAMP WHERE id = ?',
        [existing.id]
      );
      const updated = await this.findById(existing.id);
      if (!updated) {
        throw new Error('Failed to update browse history');
      }
      return updated;
    } else {
      // Create new record
      const id = uuidv4();
      await execute(
        'INSERT INTO browse_history (id, user_id, product_id) VALUES (?, ?, ?)',
        [id, userId, productId]
      );
      const history = await this.findById(id);
      if (!history) {
        throw new Error('Failed to create browse history');
      }
      return history;
    }
  }

  // Delete browse history by ID
  static async delete(id: string): Promise<boolean> {
    const result = await execute('DELETE FROM browse_history WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  // Clear browse history for user
  static async clearByUserId(userId: string): Promise<boolean> {
    const result = await execute('DELETE FROM browse_history WHERE user_id = ?', [userId]);
    return result.affectedRows > 0;
  }

  // Get browse history count for user
  static async getCountByUserId(userId: string): Promise<number> {
    const rows = await query<RowDataPacket[]>(
      'SELECT COUNT(*) as total FROM browse_history WHERE user_id = ?',
      [userId]
    );
    return rows[0].total as number;
  }
}


export class ReviewModel {
  // Find review by ID
  static async findById(id: string): Promise<Review | null> {
    const rows = await query<ReviewRow[]>('SELECT * FROM reviews WHERE id = ?', [id]);
    return rows.length > 0 ? mapRowToReview(rows[0]) : null;
  }

  // Find review by order ID
  static async findByOrderId(orderId: string): Promise<Review | null> {
    const rows = await query<ReviewRow[]>('SELECT * FROM reviews WHERE order_id = ?', [orderId]);
    return rows.length > 0 ? mapRowToReview(rows[0]) : null;
  }

  // Get reviews by user with product details
  static async findByUserId(
    userId: string,
    page = 1,
    pageSize = 20
  ): Promise<{ items: ReviewWithProduct[]; total: number }> {
    // Get total count
    const countRows = await query<RowDataPacket[]>(
      'SELECT COUNT(*) as total FROM reviews WHERE user_id = ?',
      [userId]
    );
    const total = countRows[0].total as number;

    // Get paginated results with product details
    const offset = (page - 1) * pageSize;
    const rows = await query<ReviewWithProductRow[]>(
      `SELECT r.*, p.name as product_name, p.main_image as product_image
       FROM reviews r
       JOIN products p ON r.product_id = p.id
       WHERE r.user_id = ?
       ORDER BY r.created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, pageSize, offset]
    );

    return {
      items: rows.map(mapRowToReviewWithProduct),
      total,
    };
  }

  // Get reviews by product
  static async findByProductId(
    productId: string,
    page = 1,
    pageSize = 20
  ): Promise<{ items: Review[]; total: number }> {
    // Get total count
    const countRows = await query<RowDataPacket[]>(
      'SELECT COUNT(*) as total FROM reviews WHERE product_id = ?',
      [productId]
    );
    const total = countRows[0].total as number;

    // Get paginated results
    const offset = (page - 1) * pageSize;
    const rows = await query<ReviewRow[]>(
      `SELECT * FROM reviews WHERE product_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [productId, pageSize, offset]
    );

    return {
      items: rows.map(mapRowToReview),
      total,
    };
  }

  // Create review
  static async create(data: {
    userId: string;
    orderId: string;
    productId: string;
    rating: number;
    content: string;
    images?: string[];
  }): Promise<Review> {
    const id = uuidv4();
    await execute(
      `INSERT INTO reviews (id, user_id, order_id, product_id, rating, content, images)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.userId,
        data.orderId,
        data.productId,
        data.rating,
        data.content,
        JSON.stringify(data.images || []),
      ]
    );
    const review = await this.findById(id);
    if (!review) {
      throw new Error('Failed to create review');
    }
    return review;
  }

  // Check if order has been reviewed
  static async hasReviewed(orderId: string): Promise<boolean> {
    const review = await this.findByOrderId(orderId);
    return review !== null;
  }

  // Get average rating for product
  static async getAverageRating(productId: string): Promise<number> {
    const rows = await query<RowDataPacket[]>(
      'SELECT AVG(rating) as avg_rating FROM reviews WHERE product_id = ?',
      [productId]
    );
    return rows[0].avg_rating ? parseFloat(rows[0].avg_rating) : 0;
  }

  // Get review count for product
  static async getCountByProductId(productId: string): Promise<number> {
    const rows = await query<RowDataPacket[]>(
      'SELECT COUNT(*) as total FROM reviews WHERE product_id = ?',
      [productId]
    );
    return rows[0].total as number;
  }
}
