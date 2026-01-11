/**
 * Property-Based Tests for User Behavior Service
 * 
 * Feature: ecommerce-miniprogram
 * 
 * Property 18: Favorite List Consistency
 * Validates: Requirements 9.3
 * 
 * For any favorite operation, adding a product should make it appear in the favorites list,
 * and removing it should make it disappear from the favorites list.
 * 
 * Property 19: Browse History Correctness
 * Validates: Requirements 9.4
 * 
 * For any product view, that product should appear in the user's browse history,
 * and the history should be sorted by time in descending order.
 */

import * as fc from 'fast-check';
import { FavoriteModel, BrowseHistoryModel } from '../../models/userBehavior.model';
import { UserBehaviorService } from '../userBehavior.service';

// In-memory stores for testing
const favorites = new Map<string, {
  id: string;
  user_id: string;
  product_id: string;
  created_at: Date;
}>();

const browseHistory = new Map<string, {
  id: string;
  user_id: string;
  product_id: string;
  viewed_at: Date;
}>();

const products = new Map<string, {
  id: string;
  name: string;
  price: string;
  main_image: string;
  stock: number;
  status: string;
}>();

let idCounter = 0;
const generateId = () => `test-id-${++idCounter}`;

// Mock the database module
jest.mock('../../database/mysql', () => {
  return {
    query: jest.fn(async (sql: string, params?: unknown[]) => {
      // Favorite queries
      if (sql.includes('SELECT * FROM favorites WHERE id = ?')) {
        const id = params?.[0] as string;
        const fav = favorites.get(id);
        return fav ? [fav] : [];
      }

      if (sql.includes('SELECT * FROM favorites WHERE user_id = ? AND product_id = ?')) {
        const userId = params?.[0] as string;
        const productId = params?.[1] as string;
        for (const fav of favorites.values()) {
          if (fav.user_id === userId && fav.product_id === productId) {
            return [fav];
          }
        }
        return [];
      }


      // Favorites count
      if (sql.includes('SELECT COUNT(*) as total FROM favorites WHERE user_id = ?')) {
        const userId = params?.[0] as string;
        let count = 0;
        for (const fav of favorites.values()) {
          if (fav.user_id === userId) count++;
        }
        return [{ total: count }];
      }

      // Favorites with product details
      if (sql.includes('FROM favorites f') && sql.includes('JOIN products p')) {
        const userId = params?.[0] as string;
        const pageSize = params?.[1] as number;
        const offset = params?.[2] as number;
        
        const results: unknown[] = [];
        const userFavorites = Array.from(favorites.values())
          .filter(f => f.user_id === userId)
          .sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
        
        const paginated = userFavorites.slice(offset, offset + pageSize);
        
        for (const fav of paginated) {
          const product = products.get(fav.product_id);
          if (product) {
            results.push({
              id: fav.id,
              user_id: fav.user_id,
              product_id: fav.product_id,
              created_at: fav.created_at,
              product_name: product.name,
              product_image: product.main_image,
              product_price: product.price,
              product_status: product.status,
            });
          }
        }
        return results;
      }

      // Browse history queries
      if (sql.includes('SELECT * FROM browse_history WHERE id = ?')) {
        const id = params?.[0] as string;
        const history = browseHistory.get(id);
        return history ? [history] : [];
      }

      if (sql.includes('SELECT * FROM browse_history WHERE user_id = ? AND product_id = ?')) {
        const userId = params?.[0] as string;
        const productId = params?.[1] as string;
        for (const history of browseHistory.values()) {
          if (history.user_id === userId && history.product_id === productId) {
            return [history];
          }
        }
        return [];
      }


      // Browse history count
      if (sql.includes('SELECT COUNT(*) as total FROM browse_history WHERE user_id = ?')) {
        const userId = params?.[0] as string;
        let count = 0;
        for (const history of browseHistory.values()) {
          if (history.user_id === userId) count++;
        }
        return [{ total: count }];
      }

      // Browse history with product details
      if (sql.includes('FROM browse_history bh') && sql.includes('JOIN products p')) {
        const userId = params?.[0] as string;
        const pageSize = params?.[1] as number;
        const offset = params?.[2] as number;
        
        const results: unknown[] = [];
        const userHistory = Array.from(browseHistory.values())
          .filter(h => h.user_id === userId)
          .sort((a, b) => b.viewed_at.getTime() - a.viewed_at.getTime());
        
        const paginated = userHistory.slice(offset, offset + pageSize);
        
        for (const history of paginated) {
          const product = products.get(history.product_id);
          if (product) {
            results.push({
              id: history.id,
              user_id: history.user_id,
              product_id: history.product_id,
              viewed_at: history.viewed_at,
              product_name: product.name,
              product_image: product.main_image,
              product_price: product.price,
              product_status: product.status,
            });
          }
        }
        return results;
      }

      // Product queries
      if (sql.includes('SELECT * FROM products WHERE id = ?')) {
        const id = params?.[0] as string;
        const product = products.get(id);
        return product ? [product] : [];
      }

      return [];
    }),


    execute: jest.fn(async (sql: string, params?: unknown[]) => {
      // Insert favorite
      if (sql.includes('INSERT INTO favorites')) {
        const [id, userId, productId] = params as [string, string, string];
        const now = new Date();
        favorites.set(id, {
          id,
          user_id: userId,
          product_id: productId,
          created_at: now,
        });
        return { affectedRows: 1 };
      }

      // Delete favorite by ID
      if (sql.includes('DELETE FROM favorites WHERE id = ?')) {
        const id = params?.[0] as string;
        const deleted = favorites.delete(id);
        return { affectedRows: deleted ? 1 : 0 };
      }

      // Delete favorite by user and product
      if (sql.includes('DELETE FROM favorites WHERE user_id = ? AND product_id = ?')) {
        const userId = params?.[0] as string;
        const productId = params?.[1] as string;
        let deleted = false;
        for (const [id, fav] of favorites.entries()) {
          if (fav.user_id === userId && fav.product_id === productId) {
            favorites.delete(id);
            deleted = true;
            break;
          }
        }
        return { affectedRows: deleted ? 1 : 0 };
      }

      // Insert browse history
      if (sql.includes('INSERT INTO browse_history')) {
        const [id, userId, productId] = params as [string, string, string];
        const now = new Date();
        browseHistory.set(id, {
          id,
          user_id: userId,
          product_id: productId,
          viewed_at: now,
        });
        return { affectedRows: 1 };
      }

      // Update browse history
      if (sql.includes('UPDATE browse_history SET viewed_at')) {
        const id = params?.[0] as string;
        const history = browseHistory.get(id);
        if (history) {
          history.viewed_at = new Date();
          return { affectedRows: 1 };
        }
        return { affectedRows: 0 };
      }

      // Delete browse history by user
      if (sql.includes('DELETE FROM browse_history WHERE user_id = ?')) {
        const userId = params?.[0] as string;
        let count = 0;
        for (const [id, history] of browseHistory.entries()) {
          if (history.user_id === userId) {
            browseHistory.delete(id);
            count++;
          }
        }
        return { affectedRows: count };
      }

      return { affectedRows: 0 };
    }),
    getPool: jest.fn(),
    closePool: jest.fn(),
  };
});

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => generateId()),
}));

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));


// Helper to create a test product
const createTestProduct = (id: string, name: string, price: number) => {
  products.set(id, {
    id,
    name,
    price: price.toString(),
    main_image: 'https://example.com/image.jpg',
    stock: 100,
    status: 'on_sale',
  });
};

describe('User Behavior Service Property Tests', () => {
  beforeEach(() => {
    favorites.clear();
    browseHistory.clear();
    products.clear();
    idCounter = 0;
    jest.clearAllMocks();
  });

  /**
   * Property 18: Favorite List Consistency
   * 
   * For any favorite operation, adding a product should make it appear in the favorites list,
   * and removing it should make it disappear from the favorites list.
   * 
   * Validates: Requirements 9.3
   */
  describe('Property 18: Favorite List Consistency', () => {
    it('adding a product to favorites should make it appear in the list', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            productName: fc.string({ minLength: 1, maxLength: 50 }),
            productPrice: fc.double({ min: 0.01, max: 1000, noNaN: true, noDefaultInfinity: true }),
          }),
          async (data) => {
            // Clear stores at the start of each iteration
            favorites.clear();
            products.clear();
            
            const userId = 'test-user-fav-add';
            const productId = `product-${generateId()}`;
            
            createTestProduct(productId, data.productName, data.productPrice);

            // Add to favorites
            await FavoriteModel.create(userId, productId);

            // Verify: Product should appear in favorites
            const result = await UserBehaviorService.getFavorites(userId, 1, 20);
            const found = result.items.find(item => item.productId === productId);
            
            expect(found).toBeDefined();
            expect(found!.productId).toBe(productId);
          }
        ),
        { numRuns: 100 }
      );
    });


    it('removing a product from favorites should make it disappear from the list', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 5 }),
          async (numProducts) => {
            // Clear stores at the start of each iteration
            favorites.clear();
            products.clear();
            
            const userId = 'test-user-fav-remove';
            const productIds: string[] = [];
            
            // Create multiple products and add to favorites
            for (let i = 0; i < numProducts; i++) {
              const productId = `product-rm-${generateId()}`;
              createTestProduct(productId, `Product ${i}`, 10);
              await FavoriteModel.create(userId, productId);
              productIds.push(productId);
            }

            // Verify all products are in favorites
            let result = await UserBehaviorService.getFavorites(userId, 1, 20);
            expect(result.items.length).toBe(numProducts);

            // Remove the first product
            const removedProductId = productIds[0];
            await UserBehaviorService.removeFavorite(userId, removedProductId);

            // Verify: Removed product should not appear in favorites
            result = await UserBehaviorService.getFavorites(userId, 1, 20);
            const found = result.items.find(item => item.productId === removedProductId);
            
            expect(found).toBeUndefined();
            expect(result.items.length).toBe(numProducts - 1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('adding the same product twice should not create duplicates', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 2, max: 5 }),
          async (addAttempts) => {
            // Clear stores at the start of each iteration
            favorites.clear();
            products.clear();
            
            const userId = 'test-user-fav-dup';
            const productId = `product-dup-${generateId()}`;
            
            createTestProduct(productId, 'Duplicate Test', 10);

            // Try to add the same product multiple times
            for (let i = 0; i < addAttempts; i++) {
              await UserBehaviorService.addFavorite(userId, productId);
            }

            // Verify: Only one favorite entry should exist
            const result = await UserBehaviorService.getFavorites(userId, 1, 20);
            const matchingItems = result.items.filter(item => item.productId === productId);
            
            expect(matchingItems.length).toBe(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('isFavorited should return correct status after add/remove operations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.boolean(),
          async (shouldAdd) => {
            // Clear stores at the start of each iteration
            favorites.clear();
            products.clear();
            
            const userId = 'test-user-fav-check';
            const productId = `product-check-${generateId()}`;
            
            createTestProduct(productId, 'Check Test', 10);

            if (shouldAdd) {
              await FavoriteModel.create(userId, productId);
            }

            // Verify: isFavorited should match the expected state
            const isFavorited = await UserBehaviorService.isFavorited(userId, productId);
            expect(isFavorited).toBe(shouldAdd);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('favorites count should match the number of items in the list', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 10 }),
          async (numProducts) => {
            // Clear stores at the start of each iteration
            favorites.clear();
            products.clear();
            
            const userId = 'test-user-fav-count';
            
            // Create products and add to favorites
            for (let i = 0; i < numProducts; i++) {
              const productId = `product-cnt-${generateId()}`;
              createTestProduct(productId, `Product ${i}`, 10);
              await FavoriteModel.create(userId, productId);
            }

            // Verify: Count should match number of items
            const count = await UserBehaviorService.getFavoritesCount(userId);
            const result = await UserBehaviorService.getFavorites(userId, 1, 100);
            
            expect(count).toBe(numProducts);
            expect(result.total).toBe(numProducts);
          }
        ),
        { numRuns: 100 }
      );
    });
  });


  /**
   * Property 19: Browse History Correctness
   * 
   * For any product view, that product should appear in the user's browse history,
   * and the history should be sorted by time in descending order.
   * 
   * Validates: Requirements 9.4
   */
  describe('Property 19: Browse History Correctness', () => {
    it('viewing a product should add it to browse history', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            productName: fc.string({ minLength: 1, maxLength: 50 }),
            productPrice: fc.double({ min: 0.01, max: 1000, noNaN: true, noDefaultInfinity: true }),
          }),
          async (data) => {
            // Clear stores at the start of each iteration
            browseHistory.clear();
            products.clear();
            
            const userId = 'test-user-browse-add';
            const productId = `product-browse-${generateId()}`;
            
            createTestProduct(productId, data.productName, data.productPrice);

            // Record browse
            await UserBehaviorService.recordBrowse(userId, productId);

            // Verify: Product should appear in browse history
            const result = await UserBehaviorService.getBrowseHistory(userId, 1, 20);
            const found = result.items.find(item => item.productId === productId);
            
            expect(found).toBeDefined();
            expect(found!.productId).toBe(productId);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('browse history should be sorted by time in descending order', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 2, max: 10 }),
          async (numProducts) => {
            // Clear stores at the start of each iteration
            browseHistory.clear();
            products.clear();
            
            const userId = 'test-user-browse-order';
            
            // Create products and record browse with delays
            for (let i = 0; i < numProducts; i++) {
              const productId = `product-order-${generateId()}`;
              createTestProduct(productId, `Product ${i}`, 10);
              await UserBehaviorService.recordBrowse(userId, productId);
              // Small delay to ensure different timestamps
              await new Promise(resolve => setTimeout(resolve, 5));
            }

            // Verify: History should be sorted by time descending
            const result = await UserBehaviorService.getBrowseHistory(userId, 1, 100);
            
            for (let i = 1; i < result.items.length; i++) {
              const prevTime = new Date(result.items[i - 1].viewedAt).getTime();
              const currTime = new Date(result.items[i].viewedAt).getTime();
              expect(prevTime).toBeGreaterThanOrEqual(currTime);
            }
          }
        ),
        { numRuns: 50 }
      );
    });


    it('viewing the same product again should update its position to most recent', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 3, max: 5 }),
          async (numProducts) => {
            // Clear stores at the start of each iteration
            browseHistory.clear();
            products.clear();
            
            const userId = 'test-user-browse-update';
            const productIds: string[] = [];
            
            // Create products and record browse
            for (let i = 0; i < numProducts; i++) {
              const productId = `product-upd-${generateId()}`;
              createTestProduct(productId, `Product ${i}`, 10);
              await UserBehaviorService.recordBrowse(userId, productId);
              productIds.push(productId);
              await new Promise(resolve => setTimeout(resolve, 5));
            }

            // View the first product again
            const firstProductId = productIds[0];
            await new Promise(resolve => setTimeout(resolve, 10));
            await UserBehaviorService.recordBrowse(userId, firstProductId);

            // Verify: First product should now be at the top (most recent)
            const result = await UserBehaviorService.getBrowseHistory(userId, 1, 100);
            
            expect(result.items[0].productId).toBe(firstProductId);
            // Total count should remain the same (no duplicates)
            expect(result.items.length).toBe(numProducts);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('browse history count should match the number of unique products viewed', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 10 }),
          async (numProducts) => {
            // Clear stores at the start of each iteration
            browseHistory.clear();
            products.clear();
            
            const userId = 'test-user-browse-count';
            
            // Create products and record browse
            for (let i = 0; i < numProducts; i++) {
              const productId = `product-bcnt-${generateId()}`;
              createTestProduct(productId, `Product ${i}`, 10);
              await UserBehaviorService.recordBrowse(userId, productId);
            }

            // Verify: Count should match number of unique products
            const count = await UserBehaviorService.getBrowseHistoryCount(userId);
            const result = await UserBehaviorService.getBrowseHistory(userId, 1, 100);
            
            expect(count).toBe(numProducts);
            expect(result.total).toBe(numProducts);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('clearing browse history should remove all entries', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 10 }),
          async (numProducts) => {
            // Clear stores at the start of each iteration
            browseHistory.clear();
            products.clear();
            
            const userId = 'test-user-browse-clear';
            
            // Create products and record browse
            for (let i = 0; i < numProducts; i++) {
              const productId = `product-clr-${generateId()}`;
              createTestProduct(productId, `Product ${i}`, 10);
              await UserBehaviorService.recordBrowse(userId, productId);
            }

            // Verify items exist
            let result = await UserBehaviorService.getBrowseHistory(userId, 1, 100);
            expect(result.items.length).toBe(numProducts);

            // Clear history
            await UserBehaviorService.clearBrowseHistory(userId);

            // Verify: History should be empty
            result = await UserBehaviorService.getBrowseHistory(userId, 1, 100);
            expect(result.items.length).toBe(0);
            expect(result.total).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
