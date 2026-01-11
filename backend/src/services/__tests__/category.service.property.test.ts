/**
 * Property-Based Tests for Category Service
 * 
 * Feature: ecommerce-miniprogram
 * Property 2: Category Hierarchy Consistency
 * Validates: Requirements 2.2, 2.3
 * 
 * For any product, its second-level category must be a child of its first-level category;
 * For any second-level category's product list, all products must belong to that category.
 */

import * as fc from 'fast-check';
import { CategoryModel, Category } from '../../models/category.model';
import { ProductModel, ProductStatus } from '../../models/product.model';

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
      if (sql.includes('SELECT COUNT(*) as total FROM products')) {
        let filtered = Array.from(products.values());
        if (sql.includes('category_id = ?')) {
          const categoryId = params?.[0] as string;
          filtered = filtered.filter(p => p.category_id === categoryId);
        }
        if (sql.includes('status = ?')) {
          const statusIndex = sql.includes('category_id = ?') ? 1 : 0;
          const status = params?.[statusIndex] as string;
          filtered = filtered.filter(p => p.status === status);
        }
        return [{ total: filtered.length }];
      }
      if (sql.includes('SELECT * FROM products') && sql.includes('LIMIT')) {
        let filtered = Array.from(products.values());
        if (sql.includes('category_id = ?')) {
          const categoryId = params?.[0] as string;
          filtered = filtered.filter(p => p.category_id === categoryId);
        }
        if (sql.includes('status = ?')) {
          const statusIndex = sql.includes('category_id = ?') ? 1 : 0;
          const status = params?.[statusIndex] as string;
          filtered = filtered.filter(p => p.status === status);
        }
        return filtered;
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

describe('Category Service Property Tests', () => {
  beforeEach(() => {
    categories.clear();
    products.clear();
    jest.clearAllMocks();
  });


  /**
   * Property 2: Category Hierarchy Consistency
   * 
   * For any product assigned to a second-level category, that category must be
   * a child of a valid first-level category.
   * 
   * For any category's product list query, all returned products must belong
   * to that category.
   * 
   * Validates: Requirements 2.2, 2.3
   */
  describe('Property 2: Category Hierarchy Consistency', () => {
    it('child categories should always have valid parent categories', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate parent category data
          fc.record({
            parentName: fc.string({ minLength: 1, maxLength: 30 }),
            parentIcon: fc.option(fc.webUrl(), { nil: undefined }),
          }),
          // Generate child category data
          fc.array(
            fc.record({
              childName: fc.string({ minLength: 1, maxLength: 30 }),
              childIcon: fc.option(fc.webUrl(), { nil: undefined }),
            }),
            { minLength: 1, maxLength: 5 }
          ),
          async (parentData, childrenData) => {
            // Create parent category (first-level)
            const parentCategory = await CategoryModel.create({
              name: parentData.parentName,
              icon: parentData.parentIcon,
            });

            // Create child categories (second-level)
            const childCategories: Category[] = [];
            for (const childData of childrenData) {
              const child = await CategoryModel.create({
                name: childData.childName,
                icon: childData.childIcon,
                parentId: parentCategory.id,
              });
              childCategories.push(child);
            }

            // Verify: All child categories should have the parent as their parentId
            for (const child of childCategories) {
              expect(child.parentId).toBe(parentCategory.id);
            }

            // Verify: Getting children of parent should return all created children
            const retrievedChildren = await CategoryModel.findChildren(parentCategory.id);
            expect(retrievedChildren.length).toBe(childCategories.length);
            
            // Verify: Each retrieved child belongs to the parent
            for (const child of retrievedChildren) {
              expect(child.parentId).toBe(parentCategory.id);
            }

            // Verify: Parent category should appear in top-level categories
            const topLevel = await CategoryModel.findTopLevel();
            const foundParent = topLevel.find(c => c.id === parentCategory.id);
            expect(foundParent).toBeDefined();
            expect(foundParent!.parentId).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('products in a category list should all belong to that category', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate category name
          fc.string({ minLength: 1, maxLength: 30 }),
          // Generate products data
          fc.array(
            fc.record({
              name: fc.string({ minLength: 1, maxLength: 50 }),
              price: fc.double({ min: 0.01, max: 10000, noNaN: true, noDefaultInfinity: true }),
              mainImage: fc.webUrl(),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          async (categoryName, productsData) => {
            // Create a category
            const category = await CategoryModel.create({
              name: categoryName,
            });

            // Create products in this category
            const createdProducts = [];
            for (const productData of productsData) {
              const product = await ProductModel.create({
                name: productData.name,
                price: Math.round(productData.price * 100) / 100,
                mainImage: productData.mainImage,
                categoryId: category.id,
                status: ProductStatus.ON_SALE,
              });
              createdProducts.push(product);
            }

            // Query products by category
            const { items: categoryProducts } = await ProductModel.findByCategory(category.id);

            // Verify: All returned products should belong to this category
            for (const product of categoryProducts) {
              expect(product.categoryId).toBe(category.id);
            }

            // Verify: Count should match
            expect(categoryProducts.length).toBe(createdProducts.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('category tree should maintain parent-child relationships', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate multiple parent categories with children
          fc.array(
            fc.record({
              parentName: fc.string({ minLength: 1, maxLength: 20 }),
              childrenNames: fc.array(
                fc.string({ minLength: 1, maxLength: 20 }),
                { minLength: 0, maxLength: 3 }
              ),
            }),
            { minLength: 1, maxLength: 5 }
          ),
          async (categoriesData) => {
            // Clear previous data at the start of each iteration
            categories.clear();
            products.clear();
            
            // Create category hierarchy
            const parentIds: string[] = [];
            const childrenByParent = new Map<string, string[]>();

            for (const data of categoriesData) {
              // Create parent
              const parent = await CategoryModel.create({
                name: data.parentName,
              });
              parentIds.push(parent.id);
              childrenByParent.set(parent.id, []);

              // Create children
              for (const childName of data.childrenNames) {
                const child = await CategoryModel.create({
                  name: childName,
                  parentId: parent.id,
                });
                childrenByParent.get(parent.id)!.push(child.id);
              }
            }

            // Get category tree
            const tree = await CategoryModel.getCategoryTree();

            // Verify: All top-level categories should have no parent
            for (const topCategory of tree) {
              expect(topCategory.parentId).toBeNull();
            }

            // Verify: All children in tree should reference their parent correctly
            for (const topCategory of tree) {
              if (topCategory.children) {
                for (const child of topCategory.children) {
                  expect(child.parentId).toBe(topCategory.id);
                }
              }
            }

            // Verify: Number of top-level categories matches
            expect(tree.length).toBe(parentIds.length);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
