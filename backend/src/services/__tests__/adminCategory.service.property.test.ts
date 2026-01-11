/**
 * Property-Based Tests for Admin Category Service
 * 
 * Feature: ecommerce-miniprogram
 * Property 27: Category Deletion Constraint Correctness
 * Validates: Requirements 14.5
 * 
 * For any category deletion operation, if the category has products,
 * the deletion should be blocked.
 */

import * as fc from 'fast-check';
import { CategoryModel } from '../../models/category.model';
import { ProductModel, ProductStatus } from '../../models/product.model';
import { CategoryService } from '../category.service';

// In-memory stores for testing
const categories = new Map<string, {
  id: string;
  name: string;
  icon: string | null;
  parent_id: string | null;
  sort: number;
  created_at: Date;
}>();

const products = new Map<string, {
  id: string;
  name: string;
  price: string;
  original_price: string | null;
  main_image: string;
  images: string | null;
  category_id: string | null;
  description: string | null;
  detail_images: string | null;
  stock: number;
  sales: number;
  status: string;
  sort: number;
  created_at: Date;
  updated_at: Date;
}>();

// Mock the database module
jest.mock('../../database/mysql', () => {
  return {
    query: jest.fn(async (sql: string, params?: unknown[]) => {
      // Category queries
      if (sql.includes('SELECT * FROM categories WHERE id = ?')) {
        const id = params?.[0] as string;
        const category = categories.get(id);
        return category ? [category] : [];
      }
      if (sql.includes('SELECT * FROM categories WHERE parent_id IS NULL')) {
        return Array.from(categories.values()).filter(c => c.parent_id === null);
      }
      if (sql.includes('SELECT * FROM categories WHERE parent_id = ?')) {
        const parentId = params?.[0] as string;
        return Array.from(categories.values()).filter(c => c.parent_id === parentId);
      }
      if (sql.includes('SELECT * FROM categories ORDER BY')) {
        return Array.from(categories.values());
      }
      if (sql.includes('SELECT COUNT(*) as count FROM products WHERE category_id = ?')) {
        const categoryId = params?.[0] as string;
        const count = Array.from(products.values()).filter(p => p.category_id === categoryId).length;
        return [{ count }];
      }
      if (sql.includes('SELECT COUNT(*) as count FROM categories WHERE parent_id = ?')) {
        const parentId = params?.[0] as string;
        const count = Array.from(categories.values()).filter(c => c.parent_id === parentId).length;
        return [{ count }];
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
      // Category operations
      if (sql.includes('INSERT INTO categories')) {
        const [id, name, icon, parentId, sort] = params as [string, string, string | null, string | null, number];
        categories.set(id, {
          id,
          name,
          icon,
          parent_id: parentId,
          sort,
          created_at: new Date(),
        });
        return { affectedRows: 1 };
      }
      if (sql.includes('DELETE FROM categories WHERE id = ?')) {
        const id = params?.[0] as string;
        const deleted = categories.delete(id);
        return { affectedRows: deleted ? 1 : 0 };
      }
      
      // Product operations
      if (sql.includes('INSERT INTO products')) {
        const [id, name, price, originalPrice, mainImage, images, categoryId, description, detailImages, stock, status, sort] = 
          params as [string, string, number, number | null, string, string, string | null, string | null, string, number, string, number];
        const now = new Date();
        products.set(id, {
          id,
          name,
          price: price.toString(),
          original_price: originalPrice?.toString() || null,
          main_image: mainImage,
          images,
          category_id: categoryId,
          description,
          detail_images: detailImages,
          stock,
          sales: 0,
          status,
          sort,
          created_at: now,
          updated_at: now,
        });
        return { affectedRows: 1 };
      }
      if (sql.includes('DELETE FROM products WHERE id = ?')) {
        const id = params?.[0] as string;
        const deleted = products.delete(id);
        return { affectedRows: deleted ? 1 : 0 };
      }
      
      return { affectedRows: 0 };
    }),
    getPool: jest.fn(),
    closePool: jest.fn(),
  };
});

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));


describe('Admin Category Service Property Tests', () => {
  beforeEach(() => {
    categories.clear();
    products.clear();
    jest.clearAllMocks();
  });

  /**
   * Property 27: Category Deletion Constraint Correctness
   * 
   * For any category deletion operation, if the category has products,
   * the deletion should be blocked.
   * 
   * Validates: Requirements 14.5
   */
  describe('Property 27: Category Deletion Constraint Correctness', () => {
    it('should block deletion of categories that have products', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate category name
          fc.string({ minLength: 1, maxLength: 30 }),
          // Generate products data (at least 1 product)
          fc.array(
            fc.record({
              name: fc.string({ minLength: 1, maxLength: 50 }),
              price: fc.double({ min: 0.01, max: 10000, noNaN: true, noDefaultInfinity: true }),
              mainImage: fc.webUrl(),
            }),
            { minLength: 1, maxLength: 5 }
          ),
          async (categoryName, productsData) => {
            // Create a category
            const category = await CategoryModel.create({
              name: categoryName,
            });

            // Create products in this category
            for (const productData of productsData) {
              await ProductModel.create({
                name: productData.name,
                price: Math.round(productData.price * 100) / 100,
                mainImage: productData.mainImage,
                categoryId: category.id,
                status: ProductStatus.ON_SALE,
              });
            }

            // Verify category has products
            const hasProducts = await CategoryModel.hasProducts(category.id);
            expect(hasProducts).toBe(true);

            // Attempt to delete the category
            const result = await CategoryService.deleteCategory(category.id);

            // Verify: Deletion should be blocked
            expect(result.success).toBe(false);
            expect(result.message).toBe('Cannot delete category with products');

            // Verify: Category should still exist
            const categoryAfterDelete = await CategoryModel.findById(category.id);
            expect(categoryAfterDelete).not.toBeNull();
            expect(categoryAfterDelete!.id).toBe(category.id);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should allow deletion of categories without products', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate category name
          fc.string({ minLength: 1, maxLength: 30 }),
          fc.option(fc.webUrl(), { nil: undefined }),
          async (categoryName, icon) => {
            // Create a category without products
            const category = await CategoryModel.create({
              name: categoryName,
              icon,
            });

            // Verify category has no products
            const hasProducts = await CategoryModel.hasProducts(category.id);
            expect(hasProducts).toBe(false);

            // Verify category has no children
            const hasChildren = await CategoryModel.hasChildren(category.id);
            expect(hasChildren).toBe(false);

            // Attempt to delete the category
            const result = await CategoryService.deleteCategory(category.id);

            // Verify: Deletion should succeed
            expect(result.success).toBe(true);

            // Verify: Category should no longer exist
            const categoryAfterDelete = await CategoryModel.findById(category.id);
            expect(categoryAfterDelete).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should block deletion of categories that have subcategories', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate parent category name
          fc.string({ minLength: 1, maxLength: 30 }),
          // Generate child category names (at least 1 child)
          fc.array(
            fc.string({ minLength: 1, maxLength: 30 }),
            { minLength: 1, maxLength: 5 }
          ),
          async (parentName, childNames) => {
            // Create parent category
            const parentCategory = await CategoryModel.create({
              name: parentName,
            });

            // Create child categories
            for (const childName of childNames) {
              await CategoryModel.create({
                name: childName,
                parentId: parentCategory.id,
              });
            }

            // Verify parent has children
            const hasChildren = await CategoryModel.hasChildren(parentCategory.id);
            expect(hasChildren).toBe(true);

            // Attempt to delete the parent category
            const result = await CategoryService.deleteCategory(parentCategory.id);

            // Verify: Deletion should be blocked
            expect(result.success).toBe(false);
            expect(result.message).toBe('Cannot delete category with subcategories');

            // Verify: Parent category should still exist
            const categoryAfterDelete = await CategoryModel.findById(parentCategory.id);
            expect(categoryAfterDelete).not.toBeNull();
            expect(categoryAfterDelete!.id).toBe(parentCategory.id);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
