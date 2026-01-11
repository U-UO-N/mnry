/**
 * Property-Based Tests for Admin Product Service
 * 
 * Feature: ecommerce-miniprogram
 * 
 * Property 25: Product Data Persistence Correctness
 * Validates: Requirements 13.3, 13.7
 * For any product save operation, querying after save should return the same data (round-trip consistency).
 * 
 * Property 26: Product Status Change Correctness
 * Validates: Requirements 13.6
 * For any on/off sale operation, product status should be correctly updated,
 * and off-sale products should not appear in frontend product list.
 */

import * as fc from 'fast-check';
import { ProductModel, ProductStatus } from '../../models/product.model';

// In-memory store for testing
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
        if (sql.includes('name LIKE ?')) {
          const keywordIndex = sql.includes('category_id = ?') ? (sql.includes('status = ?') ? 2 : 1) : (sql.includes('status = ?') ? 1 : 0);
          const keyword = (params?.[keywordIndex] as string).replace(/%/g, '');
          filtered = filtered.filter(p => p.name.includes(keyword) || (p.description && p.description.includes(keyword)));
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
        if (sql.includes('name LIKE ?')) {
          const keywordIndex = sql.includes('category_id = ?') ? (sql.includes('status = ?') ? 2 : 1) : (sql.includes('status = ?') ? 1 : 0);
          const keyword = (params?.[keywordIndex] as string).replace(/%/g, '');
          filtered = filtered.filter(p => p.name.includes(keyword) || (p.description && p.description.includes(keyword)));
        }
        return filtered;
      }
      
      return [];
    }),
    execute: jest.fn(async (sql: string, params?: unknown[]) => {
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
      if (sql.includes('UPDATE products SET') && sql.includes('status = ?') && sql.includes('WHERE id = ?')) {
        // Handle status update
        const status = params?.[0] as string;
        const id = params?.[1] as string;
        const product = products.get(id);
        if (product) {
          product.status = status;
          product.updated_at = new Date();
        }
        return { affectedRows: product ? 1 : 0 };
      }
      if (sql.includes('UPDATE products SET')) {
        // Handle general update
        const id = params?.[params.length - 1] as string;
        const product = products.get(id);
        if (product) {
          // Parse the SET clause to update fields
          const setMatch = sql.match(/SET (.+) WHERE/);
          if (setMatch) {
            const setClauses = setMatch[1].split(', ');
            let paramIndex = 0;
            for (const clause of setClauses) {
              const field = clause.split(' = ')[0].trim();
              const value = params?.[paramIndex];
              switch (field) {
                case 'name':
                  product.name = value as string;
                  break;
                case 'price':
                  product.price = (value as number).toString();
                  break;
                case 'original_price':
                  product.original_price = value ? (value as number).toString() : null;
                  break;
                case 'main_image':
                  product.main_image = value as string;
                  break;
                case 'images':
                  product.images = value as string;
                  break;
                case 'category_id':
                  product.category_id = value as string | null;
                  break;
                case 'description':
                  product.description = value as string | null;
                  break;
                case 'detail_images':
                  product.detail_images = value as string;
                  break;
                case 'stock':
                  product.stock = value as number;
                  break;
                case 'status':
                  product.status = value as string;
                  break;
                case 'sort':
                  product.sort = value as number;
                  break;
              }
              paramIndex++;
            }
          }
          product.updated_at = new Date();
        }
        return { affectedRows: product ? 1 : 0 };
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

describe('Admin Product Service Property Tests', () => {
  beforeEach(() => {
    products.clear();
    jest.clearAllMocks();
  });

  /**
   * Property 25: Product Data Persistence Correctness
   * 
   * For any product save operation, querying after save should return the same data.
   * This is a round-trip consistency property.
   * 
   * Validates: Requirements 13.3, 13.7
   */
  describe('Property 25: Product Data Persistence Correctness', () => {
    it('created product should be retrievable with same data (round-trip)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            price: fc.double({ min: 0.01, max: 10000, noNaN: true, noDefaultInfinity: true }),
            originalPrice: fc.option(
              fc.double({ min: 0.01, max: 10000, noNaN: true, noDefaultInfinity: true }),
              { nil: undefined }
            ),
            mainImage: fc.webUrl(),
            images: fc.array(fc.webUrl(), { minLength: 0, maxLength: 5 }),
            categoryId: fc.option(fc.uuid(), { nil: undefined }),
            description: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
            detailImages: fc.array(fc.webUrl(), { minLength: 0, maxLength: 5 }),
            stock: fc.integer({ min: 0, max: 10000 }),
            sort: fc.integer({ min: 0, max: 1000 }),
          }),
          async (productData) => {
            // Create product
            const roundedPrice = Math.round(productData.price * 100) / 100;
            const roundedOriginalPrice = productData.originalPrice 
              ? Math.round(productData.originalPrice * 100) / 100 
              : undefined;

            const created = await ProductModel.create({
              name: productData.name,
              price: roundedPrice,
              originalPrice: roundedOriginalPrice,
              mainImage: productData.mainImage,
              images: productData.images,
              categoryId: productData.categoryId,
              description: productData.description,
              detailImages: productData.detailImages,
              stock: productData.stock,
              sort: productData.sort,
              status: ProductStatus.DRAFT,
            });

            // Retrieve product
            const retrieved = await ProductModel.findById(created.id);

            // Verify round-trip consistency
            expect(retrieved).not.toBeNull();
            expect(retrieved!.id).toBe(created.id);
            expect(retrieved!.name).toBe(productData.name);
            expect(retrieved!.price).toBeCloseTo(roundedPrice, 2);
            expect(retrieved!.mainImage).toBe(productData.mainImage);
            expect(retrieved!.stock).toBe(productData.stock);
            expect(retrieved!.sort).toBe(productData.sort);
            expect(retrieved!.status).toBe(ProductStatus.DRAFT);
            
            // Verify arrays
            expect(retrieved!.images).toEqual(productData.images);
            expect(retrieved!.detailImages).toEqual(productData.detailImages);
            
            // Verify optional fields
            if (roundedOriginalPrice !== undefined) {
              expect(retrieved!.originalPrice).toBeCloseTo(roundedOriginalPrice, 2);
            }
            if (productData.categoryId !== undefined) {
              expect(retrieved!.categoryId).toBe(productData.categoryId);
            }
            if (productData.description !== undefined) {
              expect(retrieved!.description).toBe(productData.description);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('updated product should reflect all changes (round-trip)', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Initial product data
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            price: fc.double({ min: 0.01, max: 10000, noNaN: true, noDefaultInfinity: true }),
            mainImage: fc.webUrl(),
          }),
          // Update data
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            price: fc.double({ min: 0.01, max: 10000, noNaN: true, noDefaultInfinity: true }),
            description: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
            stock: fc.integer({ min: 0, max: 10000 }),
          }),
          async (initialData, updateData) => {
            // Create initial product
            const created = await ProductModel.create({
              name: initialData.name,
              price: Math.round(initialData.price * 100) / 100,
              mainImage: initialData.mainImage,
              status: ProductStatus.DRAFT,
            });

            // Update product
            const roundedUpdatePrice = Math.round(updateData.price * 100) / 100;
            await ProductModel.update(created.id, {
              name: updateData.name,
              price: roundedUpdatePrice,
              description: updateData.description,
              stock: updateData.stock,
            });

            // Retrieve updated product
            const retrieved = await ProductModel.findById(created.id);

            // Verify update was persisted correctly
            expect(retrieved).not.toBeNull();
            expect(retrieved!.name).toBe(updateData.name);
            expect(retrieved!.price).toBeCloseTo(roundedUpdatePrice, 2);
            expect(retrieved!.stock).toBe(updateData.stock);
            
            // Original mainImage should be preserved
            expect(retrieved!.mainImage).toBe(initialData.mainImage);
            
            // Description should be updated
            if (updateData.description !== undefined) {
              expect(retrieved!.description).toBe(updateData.description);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('deleted product should not be retrievable', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            price: fc.double({ min: 0.01, max: 10000, noNaN: true, noDefaultInfinity: true }),
            mainImage: fc.webUrl(),
          }),
          async (productData) => {
            // Create product
            const created = await ProductModel.create({
              name: productData.name,
              price: Math.round(productData.price * 100) / 100,
              mainImage: productData.mainImage,
              status: ProductStatus.DRAFT,
            });

            // Verify product exists
            const beforeDelete = await ProductModel.findById(created.id);
            expect(beforeDelete).not.toBeNull();

            // Delete product
            const deleted = await ProductModel.delete(created.id);
            expect(deleted).toBe(true);

            // Verify product no longer exists
            const afterDelete = await ProductModel.findById(created.id);
            expect(afterDelete).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });
  });


  /**
   * Property 26: Product Status Change Correctness
   * 
   * For any on/off sale operation, product status should be correctly updated,
   * and off-sale products should not appear in frontend product list.
   * 
   * Validates: Requirements 13.6
   */
  describe('Property 26: Product Status Change Correctness', () => {
    it('status update should correctly change product status', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            price: fc.double({ min: 0.01, max: 10000, noNaN: true, noDefaultInfinity: true }),
            mainImage: fc.webUrl(),
          }),
          fc.constantFrom(ProductStatus.ON_SALE, ProductStatus.OFF_SALE, ProductStatus.DRAFT),
          fc.constantFrom(ProductStatus.ON_SALE, ProductStatus.OFF_SALE, ProductStatus.DRAFT),
          async (productData, initialStatus, newStatus) => {
            // Create product with initial status
            const created = await ProductModel.create({
              name: productData.name,
              price: Math.round(productData.price * 100) / 100,
              mainImage: productData.mainImage,
              status: initialStatus,
            });

            // Verify initial status
            const beforeUpdate = await ProductModel.findById(created.id);
            expect(beforeUpdate!.status).toBe(initialStatus);

            // Update status
            await ProductModel.updateStatus(created.id, newStatus);

            // Verify status was updated
            const afterUpdate = await ProductModel.findById(created.id);
            expect(afterUpdate).not.toBeNull();
            expect(afterUpdate!.status).toBe(newStatus);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('off-sale products should not appear in frontend product list', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate multiple products with different statuses
          fc.array(
            fc.record({
              name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
              price: fc.double({ min: 0.01, max: 10000, noNaN: true, noDefaultInfinity: true }),
              mainImage: fc.webUrl(),
              status: fc.constantFrom(ProductStatus.ON_SALE, ProductStatus.OFF_SALE, ProductStatus.DRAFT),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          async (productsData) => {
            // Clear previous data
            products.clear();

            // Create products with various statuses
            const createdProducts = [];
            for (const data of productsData) {
              const product = await ProductModel.create({
                name: data.name,
                price: Math.round(data.price * 100) / 100,
                mainImage: data.mainImage,
                status: data.status,
              });
              createdProducts.push({ product, status: data.status });
            }

            // Query frontend product list (only ON_SALE)
            const { items: frontendList } = await ProductModel.findMany({
              status: ProductStatus.ON_SALE,
              page: 1,
              pageSize: 100,
            });

            // Verify: All products in frontend list should be ON_SALE
            for (const product of frontendList) {
              expect(product.status).toBe(ProductStatus.ON_SALE);
            }

            // Verify: OFF_SALE and DRAFT products should NOT be in frontend list
            const offSaleProducts = createdProducts.filter(p => p.status !== ProductStatus.ON_SALE);
            for (const { product } of offSaleProducts) {
              const found = frontendList.some(p => p.id === product.id);
              expect(found).toBe(false);
            }

            // Verify: All ON_SALE products should be in frontend list
            const onSaleProducts = createdProducts.filter(p => p.status === ProductStatus.ON_SALE);
            for (const { product } of onSaleProducts) {
              const found = frontendList.some(p => p.id === product.id);
              expect(found).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('changing status from ON_SALE to OFF_SALE should remove from frontend list', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            price: fc.double({ min: 0.01, max: 10000, noNaN: true, noDefaultInfinity: true }),
            mainImage: fc.webUrl(),
          }),
          async (productData) => {
            // Clear previous data
            products.clear();

            // Create product as ON_SALE
            const created = await ProductModel.create({
              name: productData.name,
              price: Math.round(productData.price * 100) / 100,
              mainImage: productData.mainImage,
              status: ProductStatus.ON_SALE,
            });

            // Verify product is in frontend list
            const { items: beforeList } = await ProductModel.findMany({
              status: ProductStatus.ON_SALE,
              page: 1,
              pageSize: 100,
            });
            const foundBefore = beforeList.some(p => p.id === created.id);
            expect(foundBefore).toBe(true);

            // Change status to OFF_SALE
            await ProductModel.updateStatus(created.id, ProductStatus.OFF_SALE);

            // Verify product is no longer in frontend list
            const { items: afterList } = await ProductModel.findMany({
              status: ProductStatus.ON_SALE,
              page: 1,
              pageSize: 100,
            });
            const foundAfter = afterList.some(p => p.id === created.id);
            expect(foundAfter).toBe(false);

            // Verify product still exists with OFF_SALE status
            const product = await ProductModel.findById(created.id);
            expect(product).not.toBeNull();
            expect(product!.status).toBe(ProductStatus.OFF_SALE);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('changing status from OFF_SALE to ON_SALE should add to frontend list', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            price: fc.double({ min: 0.01, max: 10000, noNaN: true, noDefaultInfinity: true }),
            mainImage: fc.webUrl(),
          }),
          async (productData) => {
            // Clear previous data
            products.clear();

            // Create product as OFF_SALE
            const created = await ProductModel.create({
              name: productData.name,
              price: Math.round(productData.price * 100) / 100,
              mainImage: productData.mainImage,
              status: ProductStatus.OFF_SALE,
            });

            // Verify product is NOT in frontend list
            const { items: beforeList } = await ProductModel.findMany({
              status: ProductStatus.ON_SALE,
              page: 1,
              pageSize: 100,
            });
            const foundBefore = beforeList.some(p => p.id === created.id);
            expect(foundBefore).toBe(false);

            // Change status to ON_SALE
            await ProductModel.updateStatus(created.id, ProductStatus.ON_SALE);

            // Verify product is now in frontend list
            const { items: afterList } = await ProductModel.findMany({
              status: ProductStatus.ON_SALE,
              page: 1,
              pageSize: 100,
            });
            const foundAfter = afterList.some(p => p.id === created.id);
            expect(foundAfter).toBe(true);

            // Verify product has ON_SALE status
            const product = await ProductModel.findById(created.id);
            expect(product).not.toBeNull();
            expect(product!.status).toBe(ProductStatus.ON_SALE);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
