/**
 * Property-Based Tests for Product Service
 * 
 * Feature: ecommerce-miniprogram
 * Property 5: Product Detail Data Completeness
 * Validates: Requirements 4.1, 4.2
 * 
 * For any product detail request, the returned data must contain:
 * product images, name, price, spec options, description, detail images.
 */

import * as fc from 'fast-check';
import { ProductModel, ProductSKUModel, ProductStatus } from '../../models/product.model';

// In-memory stores for testing
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

const skus = new Map<string, {
  id: string;
  product_id: string;
  spec_values: string;
  price: string;
  stock: number;
  created_at: Date;
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
      
      // SKU queries
      if (sql.includes('SELECT * FROM product_skus WHERE id = ?')) {
        const id = params?.[0] as string;
        const sku = skus.get(id);
        return sku ? [sku] : [];
      }
      if (sql.includes('SELECT * FROM product_skus WHERE product_id = ?')) {
        const productId = params?.[0] as string;
        return Array.from(skus.values()).filter(s => s.product_id === productId);
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
      if (sql.includes('DELETE FROM products WHERE id = ?')) {
        const id = params?.[0] as string;
        const deleted = products.delete(id);
        return { affectedRows: deleted ? 1 : 0 };
      }
      
      // SKU operations
      if (sql.includes('INSERT INTO product_skus')) {
        const [id, productId, specValues, price, stock] = 
          params as [string, string, string, number, number];
        skus.set(id, {
          id,
          product_id: productId,
          spec_values: specValues,
          price: price.toString(),
          stock,
          created_at: new Date(),
        });
        return { affectedRows: 1 };
      }
      if (sql.includes('DELETE FROM product_skus WHERE product_id = ?')) {
        const productId = params?.[0] as string;
        let count = 0;
        for (const [id, sku] of skus.entries()) {
          if (sku.product_id === productId) {
            skus.delete(id);
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

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('Product Service Property Tests', () => {
  beforeEach(() => {
    products.clear();
    skus.clear();
    jest.clearAllMocks();
  });


  /**
   * Property 5: Product Detail Data Completeness
   * 
   * For any product detail request, the returned data must contain:
   * product images, name, price, spec options, description, detail images.
   * 
   * Validates: Requirements 4.1, 4.2
   */
  describe('Property 5: Product Detail Data Completeness', () => {
    it('product detail should contain all required fields', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate product data with all required fields
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 50 }),
            price: fc.double({ min: 0.01, max: 10000, noNaN: true, noDefaultInfinity: true }),
            originalPrice: fc.option(
              fc.double({ min: 0.01, max: 10000, noNaN: true, noDefaultInfinity: true }),
              { nil: undefined }
            ),
            mainImage: fc.webUrl(),
            images: fc.array(fc.webUrl(), { minLength: 0, maxLength: 5 }),
            description: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
            detailImages: fc.array(fc.webUrl(), { minLength: 0, maxLength: 5 }),
          }),
          async (productData) => {
            // Create a product with all fields
            const product = await ProductModel.create({
              name: productData.name,
              price: Math.round(productData.price * 100) / 100,
              originalPrice: productData.originalPrice 
                ? Math.round(productData.originalPrice * 100) / 100 
                : undefined,
              mainImage: productData.mainImage,
              images: productData.images,
              description: productData.description,
              detailImages: productData.detailImages,
              status: ProductStatus.ON_SALE,
            });

            // Get product detail
            const detail = await ProductModel.getDetail(product.id);

            // Verify: Detail should not be null
            expect(detail).not.toBeNull();

            // Verify: All required fields should be present
            expect(detail!.id).toBeDefined();
            expect(detail!.name).toBe(productData.name);
            expect(detail!.price).toBeCloseTo(Math.round(productData.price * 100) / 100, 2);
            expect(detail!.mainImage).toBe(productData.mainImage);
            
            // Verify: Images array should be present (even if empty)
            expect(Array.isArray(detail!.images)).toBe(true);
            expect(detail!.images.length).toBe(productData.images.length);
            
            // Verify: Detail images array should be present (even if empty)
            expect(Array.isArray(detail!.detailImages)).toBe(true);
            expect(detail!.detailImages.length).toBe(productData.detailImages.length);
            
            // Verify: SKUs and specs arrays should be present (even if empty)
            expect(Array.isArray(detail!.skus)).toBe(true);
            expect(Array.isArray(detail!.specs)).toBe(true);
            
            // Verify: Status should be defined
            expect(detail!.status).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('product detail with SKUs should have correct spec options', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate product with SKUs
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 50 }),
            price: fc.double({ min: 0.01, max: 10000, noNaN: true, noDefaultInfinity: true }),
            mainImage: fc.webUrl(),
          }),
          // Generate SKU spec values
          fc.array(
            fc.record({
              color: fc.constantFrom('红色', '蓝色', '绿色', '黑色', '白色'),
              size: fc.constantFrom('S', 'M', 'L', 'XL', 'XXL'),
              price: fc.double({ min: 0.01, max: 10000, noNaN: true, noDefaultInfinity: true }),
            }),
            { minLength: 1, maxLength: 5 }
          ),
          async (productData, skuDataList) => {
            // Create product
            const product = await ProductModel.create({
              name: productData.name,
              price: Math.round(productData.price * 100) / 100,
              mainImage: productData.mainImage,
              status: ProductStatus.ON_SALE,
            });

            // Create SKUs
            for (const skuData of skuDataList) {
              await ProductSKUModel.create({
                productId: product.id,
                specValues: { color: skuData.color, size: skuData.size },
                price: Math.round(skuData.price * 100) / 100,
                stock: 100,
              });
            }

            // Get product detail
            const detail = await ProductModel.getDetail(product.id);

            // Verify: Detail should not be null
            expect(detail).not.toBeNull();

            // Verify: SKUs should match created count
            expect(detail!.skus.length).toBe(skuDataList.length);

            // Verify: Each SKU should have spec values
            for (const sku of detail!.skus) {
              expect(sku.specValues).toBeDefined();
              expect(typeof sku.specValues).toBe('object');
            }

            // Verify: Specs should be extracted from SKUs
            if (skuDataList.length > 0) {
              expect(detail!.specs.length).toBeGreaterThan(0);
              
              // Verify: Each spec should have name and values
              for (const spec of detail!.specs) {
                expect(spec.name).toBeDefined();
                expect(Array.isArray(spec.values)).toBe(true);
                expect(spec.values.length).toBeGreaterThan(0);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('product retrieved by ID should match created product', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 50 }),
            price: fc.double({ min: 0.01, max: 10000, noNaN: true, noDefaultInfinity: true }),
            mainImage: fc.webUrl(),
            stock: fc.integer({ min: 0, max: 10000 }),
          }),
          async (productData) => {
            // Create product
            const created = await ProductModel.create({
              name: productData.name,
              price: Math.round(productData.price * 100) / 100,
              mainImage: productData.mainImage,
              stock: productData.stock,
              status: ProductStatus.ON_SALE,
            });

            // Retrieve product
            const retrieved = await ProductModel.findById(created.id);

            // Verify: Round-trip consistency
            expect(retrieved).not.toBeNull();
            expect(retrieved!.id).toBe(created.id);
            expect(retrieved!.name).toBe(created.name);
            expect(retrieved!.price).toBe(created.price);
            expect(retrieved!.mainImage).toBe(created.mainImage);
            expect(retrieved!.stock).toBe(created.stock);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});


  /**
   * Property 1: Search Result Relevance
   * 
   * For any search keyword, all returned products should have the keyword
   * (or its synonym) in their name or description.
   * 
   * Validates: Requirements 1.4
   */
  describe('Property 1: Search Result Relevance', () => {
    it('search results should contain the search keyword in name or description', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate a search keyword
          fc.string({ minLength: 2, maxLength: 10 }).filter(s => /^[a-zA-Z0-9\u4e00-\u9fa5]+$/.test(s)),
          // Generate products - some matching, some not
          fc.array(
            fc.record({
              name: fc.string({ minLength: 1, maxLength: 50 }),
              description: fc.option(fc.string({ minLength: 1, maxLength: 200 }), { nil: undefined }),
              price: fc.double({ min: 0.01, max: 10000, noNaN: true, noDefaultInfinity: true }),
              mainImage: fc.webUrl(),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          async (keyword, productsData) => {
            // Clear previous data
            products.clear();
            
            // Create products - some with keyword in name/description, some without
            const createdProducts = [];
            for (let i = 0; i < productsData.length; i++) {
              const data = productsData[i];
              // Make some products match the keyword
              const shouldMatch = i % 2 === 0;
              const name = shouldMatch ? `${data.name} ${keyword}` : data.name;
              const description = shouldMatch && data.description 
                ? `${data.description} ${keyword}` 
                : data.description;
              
              const product = await ProductModel.create({
                name,
                description,
                price: Math.round(data.price * 100) / 100,
                mainImage: data.mainImage,
                status: ProductStatus.ON_SALE,
              });
              createdProducts.push({ product, shouldMatch });
            }

            // Search for the keyword
            const { items: searchResults } = await ProductModel.search(keyword);

            // Verify: All search results should contain the keyword in name or description
            for (const result of searchResults) {
              const nameContains = result.name.toLowerCase().includes(keyword.toLowerCase());
              const descContains = result.description?.toLowerCase().includes(keyword.toLowerCase()) || false;
              
              expect(nameContains || descContains).toBe(true);
            }

            // Verify: Products that should match are in results
            const matchingProducts = createdProducts.filter(p => p.shouldMatch);
            for (const { product } of matchingProducts) {
              const found = searchResults.some(r => r.id === product.id);
              expect(found).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('empty search should return empty results or all products', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate products
          fc.array(
            fc.record({
              name: fc.string({ minLength: 1, maxLength: 50 }),
              price: fc.double({ min: 0.01, max: 10000, noNaN: true, noDefaultInfinity: true }),
              mainImage: fc.webUrl(),
            }),
            { minLength: 0, maxLength: 5 }
          ),
          async (productsData) => {
            // Clear previous data
            products.clear();
            
            // Create products
            for (const data of productsData) {
              await ProductModel.create({
                name: data.name,
                price: Math.round(data.price * 100) / 100,
                mainImage: data.mainImage,
                status: ProductStatus.ON_SALE,
              });
            }

            // Search with empty string
            const { items: searchResults } = await ProductModel.search('');

            // Verify: Empty search should return all on_sale products
            expect(searchResults.length).toBe(productsData.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('search should only return on_sale products', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 2, maxLength: 10 }).filter(s => /^[a-zA-Z0-9\u4e00-\u9fa5]+$/.test(s)),
          fc.array(
            fc.record({
              name: fc.string({ minLength: 1, maxLength: 50 }),
              price: fc.double({ min: 0.01, max: 10000, noNaN: true, noDefaultInfinity: true }),
              mainImage: fc.webUrl(),
              status: fc.constantFrom(ProductStatus.ON_SALE, ProductStatus.OFF_SALE, ProductStatus.DRAFT),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          async (keyword, productsData) => {
            // Clear previous data
            products.clear();
            
            // Create products with different statuses
            for (const data of productsData) {
              await ProductModel.create({
                name: `${data.name} ${keyword}`, // All contain keyword
                price: Math.round(data.price * 100) / 100,
                mainImage: data.mainImage,
                status: data.status,
              });
            }

            // Search for the keyword
            const { items: searchResults } = await ProductModel.search(keyword);

            // Verify: All search results should be on_sale
            for (const result of searchResults) {
              expect(result.status).toBe(ProductStatus.ON_SALE);
            }

            // Verify: Count should match on_sale products only
            const onSaleCount = productsData.filter(p => p.status === ProductStatus.ON_SALE).length;
            expect(searchResults.length).toBe(onSaleCount);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
