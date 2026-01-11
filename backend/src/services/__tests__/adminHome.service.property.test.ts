/**
 * Property-Based Tests for Admin Home Service
 * 
 * Feature: ecommerce-miniprogram
 * 
 * Property 28: Home Configuration Sync Correctness
 * Validates: Requirements 15.2, 15.3, 15.4, 15.5
 * For any home configuration save, the mini program home API should return data consistent with the configuration.
 */

import * as fc from 'fast-check';
import { BannerModel, Banner, BannerDTO, LinkType } from '../../models/home.model';
import { HomeHotProductModel, HomeHotProduct } from '../../models/home.model';
import { CategoryShortcutModel, CategoryShortcut, CategoryShortcutDTO } from '../../models/home.model';
import { HomeService } from '../home.service';

// In-memory stores for testing
const banners = new Map<string, {
  id: string;
  image: string;
  link_type: LinkType;
  link_value: string | null;
  sort: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}>();

const hotProducts = new Map<string, {
  id: string;
  product_id: string;
  sort: number;
  created_at: Date;
}>();

const categoryShortcuts = new Map<string, {
  id: string;
  category_id: string;
  name: string;
  icon: string;
  sort: number;
  created_at: Date;
  updated_at: Date;
}>();

// Mock the database module
jest.mock('../../database/mysql', () => {
  return {
    query: jest.fn(async (sql: string, params?: unknown[]) => {
      // Banner queries
      if (sql.includes('SELECT * FROM banners WHERE id = ?')) {
        const id = params?.[0] as string;
        const banner = banners.get(id);
        return banner ? [banner] : [];
      }
      if (sql.includes('SELECT * FROM banners WHERE is_active = TRUE')) {
        return Array.from(banners.values())
          .filter(b => b.is_active)
          .sort((a, b) => a.sort - b.sort);
      }
      if (sql.includes('SELECT * FROM banners ORDER BY')) {
        return Array.from(banners.values()).sort((a, b) => a.sort - b.sort);
      }

      // Hot products queries
      if (sql.includes('SELECT * FROM home_hot_products WHERE id = ?')) {
        const id = params?.[0] as string;
        const hp = hotProducts.get(id);
        return hp ? [hp] : [];
      }
      if (sql.includes('SELECT * FROM home_hot_products ORDER BY')) {
        return Array.from(hotProducts.values()).sort((a, b) => a.sort - b.sort);
      }
      if (sql.includes('SELECT MAX(sort) as max_sort FROM home_hot_products')) {
        const values = Array.from(hotProducts.values());
        const maxSort = values.length > 0 ? Math.max(...values.map(hp => hp.sort)) : 0;
        return [{ max_sort: maxSort }];
      }

      // Category shortcuts queries
      if (sql.includes('SELECT * FROM category_shortcuts WHERE id = ?')) {
        const id = params?.[0] as string;
        const shortcut = categoryShortcuts.get(id);
        return shortcut ? [shortcut] : [];
      }
      if (sql.includes('SELECT * FROM category_shortcuts ORDER BY')) {
        return Array.from(categoryShortcuts.values()).sort((a, b) => a.sort - b.sort);
      }
      if (sql.includes('SELECT MAX(sort) as max_sort FROM category_shortcuts')) {
        const values = Array.from(categoryShortcuts.values());
        const maxSort = values.length > 0 ? Math.max(...values.map(s => s.sort)) : 0;
        return [{ max_sort: maxSort }];
      }

      return [];
    }),
    execute: jest.fn(async (sql: string, params?: unknown[]) => {
      // Banner operations
      if (sql.includes('INSERT INTO banners')) {
        const [id, image, linkType, linkValue, sort, isActive] = 
          params as [string, string, LinkType, string | null, number, boolean];
        const now = new Date();
        banners.set(id, {
          id,
          image,
          link_type: linkType,
          link_value: linkValue,
          sort,
          is_active: isActive,
          created_at: now,
          updated_at: now,
        });
        return { affectedRows: 1 };
      }
      if (sql.includes('DELETE FROM banners WHERE id = ?')) {
        const id = params?.[0] as string;
        const deleted = banners.delete(id);
        return { affectedRows: deleted ? 1 : 0 };
      }
      if (sql === 'DELETE FROM banners') {
        banners.clear();
        return { affectedRows: 1 };
      }

      // Hot products operations
      if (sql.includes('INSERT INTO home_hot_products')) {
        const [id, productId, sort] = params as [string, string, number];
        const now = new Date();
        hotProducts.set(id, {
          id,
          product_id: productId,
          sort,
          created_at: now,
        });
        return { affectedRows: 1 };
      }
      if (sql.includes('DELETE FROM home_hot_products WHERE product_id = ?')) {
        const productId = params?.[0] as string;
        let deleted = false;
        for (const [key, value] of hotProducts.entries()) {
          if (value.product_id === productId) {
            hotProducts.delete(key);
            deleted = true;
            break;
          }
        }
        return { affectedRows: deleted ? 1 : 0 };
      }
      if (sql === 'DELETE FROM home_hot_products') {
        hotProducts.clear();
        return { affectedRows: 1 };
      }

      // Category shortcuts operations
      if (sql.includes('INSERT INTO category_shortcuts')) {
        const [id, categoryId, name, icon, sort] = 
          params as [string, string, string, string, number];
        const now = new Date();
        categoryShortcuts.set(id, {
          id,
          category_id: categoryId,
          name,
          icon,
          sort,
          created_at: now,
          updated_at: now,
        });
        return { affectedRows: 1 };
      }
      if (sql.includes('DELETE FROM category_shortcuts WHERE id = ?')) {
        const id = params?.[0] as string;
        const deleted = categoryShortcuts.delete(id);
        return { affectedRows: deleted ? 1 : 0 };
      }
      if (sql === 'DELETE FROM category_shortcuts') {
        categoryShortcuts.clear();
        return { affectedRows: 1 };
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

// Mock ProductModel for hot products
jest.mock('../../models/product.model', () => ({
  ProductModel: {
    findById: jest.fn(async (id: string) => ({
      id,
      name: `Product ${id}`,
      price: 100,
      mainImage: 'http://example.com/image.jpg',
      status: 'on_sale',
    })),
  },
  ProductStatus: {
    ON_SALE: 'on_sale',
    OFF_SALE: 'off_sale',
    DRAFT: 'draft',
  },
}));

describe('Admin Home Service Property Tests', () => {
  beforeEach(() => {
    banners.clear();
    hotProducts.clear();
    categoryShortcuts.clear();
    jest.clearAllMocks();
  });

  /**
   * Property 28: Home Configuration Sync Correctness
   * 
   * For any home configuration save, the mini program home API should return
   * data consistent with the configuration.
   * 
   * Validates: Requirements 15.2, 15.3, 15.4, 15.5
   */
  describe('Property 28: Home Configuration Sync Correctness', () => {
    /**
     * Property 28.1: Banner configuration sync
     * After configuring banners, the frontend API should return the same banners in order.
     * Validates: Requirements 15.2
     */
    it('configured banners should be returned by frontend API in correct order', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              image: fc.webUrl(),
              linkType: fc.constantFrom(LinkType.PRODUCT, LinkType.CATEGORY, LinkType.URL, LinkType.NONE),
              linkValue: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
              isActive: fc.boolean(),
            }),
            { minLength: 0, maxLength: 10 }
          ),
          async (bannerConfigs) => {
            // Clear previous data
            banners.clear();

            // Configure banners via admin API
            const configuredBanners = await BannerModel.replaceAll(
              bannerConfigs.map((config, index) => ({
                image: config.image,
                linkType: config.linkType,
                linkValue: config.linkValue,
                sort: index,
                isActive: config.isActive,
              }))
            );

            // Get banners via frontend API (only active ones)
            const frontendBanners = await BannerModel.findActive();

            // Verify: Frontend should only return active banners
            const expectedActiveBanners = configuredBanners.filter(b => b.isActive);
            expect(frontendBanners.length).toBe(expectedActiveBanners.length);

            // Verify: Banners should be in correct order (by sort)
            for (let i = 0; i < frontendBanners.length; i++) {
              const frontendBanner = frontendBanners[i];
              const expectedBanner = expectedActiveBanners[i];
              
              expect(frontendBanner.image).toBe(expectedBanner.image);
              expect(frontendBanner.linkType).toBe(expectedBanner.linkType);
              expect(frontendBanner.linkValue).toBe(expectedBanner.linkValue);
              expect(frontendBanner.sort).toBe(expectedBanner.sort);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property 28.2: Hot products configuration sync
     * After configuring hot products, the frontend API should return products in the same order.
     * Validates: Requirements 15.3
     */
    it('configured hot products should be returned by frontend API in correct order', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.uuid(), { minLength: 0, maxLength: 10 }),
          async (productIds) => {
            // Clear previous data
            hotProducts.clear();

            // Configure hot products via admin API
            await HomeHotProductModel.replaceAll(productIds);

            // Get hot product IDs via service
            const retrievedIds = await HomeHotProductModel.getProductIds();

            // Verify: Product IDs should match in the same order
            expect(retrievedIds.length).toBe(productIds.length);
            for (let i = 0; i < productIds.length; i++) {
              expect(retrievedIds[i]).toBe(productIds[i]);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property 28.3: Category shortcuts configuration sync
     * After configuring category shortcuts, the frontend API should return the same shortcuts.
     * Validates: Requirements 15.4
     */
    it('configured category shortcuts should be returned by frontend API in correct order', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              categoryId: fc.uuid(),
              name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
              icon: fc.webUrl(),
            }),
            { minLength: 0, maxLength: 10 }
          ),
          async (shortcutConfigs) => {
            // Clear previous data
            categoryShortcuts.clear();

            // Configure shortcuts via admin API
            const configuredShortcuts = await CategoryShortcutModel.replaceAll(
              shortcutConfigs.map((config, index) => ({
                categoryId: config.categoryId,
                name: config.name,
                icon: config.icon,
                sort: index,
              }))
            );

            // Get shortcuts via frontend API
            const frontendShortcuts = await CategoryShortcutModel.findAll();

            // Verify: Shortcuts should match in the same order
            expect(frontendShortcuts.length).toBe(configuredShortcuts.length);
            for (let i = 0; i < frontendShortcuts.length; i++) {
              const frontendShortcut = frontendShortcuts[i];
              const expectedShortcut = configuredShortcuts[i];
              
              expect(frontendShortcut.categoryId).toBe(expectedShortcut.categoryId);
              expect(frontendShortcut.name).toBe(expectedShortcut.name);
              expect(frontendShortcut.icon).toBe(expectedShortcut.icon);
              expect(frontendShortcut.sort).toBe(expectedShortcut.sort);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property 28.4: Configuration replacement is complete
     * When replacing configuration, old data should be completely removed.
     * Validates: Requirements 15.5
     */
    it('replacing configuration should completely remove old data', async () => {
      await fc.assert(
        fc.asyncProperty(
          // First configuration
          fc.array(
            fc.record({
              image: fc.webUrl(),
              linkType: fc.constantFrom(LinkType.PRODUCT, LinkType.CATEGORY, LinkType.URL, LinkType.NONE),
              isActive: fc.constant(true),
            }),
            { minLength: 1, maxLength: 5 }
          ),
          // Second configuration (replacement)
          fc.array(
            fc.record({
              image: fc.webUrl(),
              linkType: fc.constantFrom(LinkType.PRODUCT, LinkType.CATEGORY, LinkType.URL, LinkType.NONE),
              isActive: fc.constant(true),
            }),
            { minLength: 0, maxLength: 5 }
          ),
          async (firstConfig, secondConfig) => {
            // Clear previous data
            banners.clear();

            // Configure first set of banners
            const firstBanners = await BannerModel.replaceAll(
              firstConfig.map((config, index) => ({
                image: config.image,
                linkType: config.linkType,
                sort: index,
                isActive: config.isActive,
              }))
            );

            // Verify first configuration
            const afterFirst = await BannerModel.findAll();
            expect(afterFirst.length).toBe(firstBanners.length);

            // Replace with second configuration
            const secondBanners = await BannerModel.replaceAll(
              secondConfig.map((config, index) => ({
                image: config.image,
                linkType: config.linkType,
                sort: index,
                isActive: config.isActive,
              }))
            );

            // Verify second configuration completely replaced first
            const afterSecond = await BannerModel.findAll();
            expect(afterSecond.length).toBe(secondBanners.length);

            // Verify no banners from first config remain (by checking images)
            const firstImages = new Set(firstConfig.map(c => c.image));
            const secondImages = new Set(secondConfig.map(c => c.image));
            
            for (const banner of afterSecond) {
              // Banner should be from second config
              expect(secondImages.has(banner.image)).toBe(true);
            }

            // If first and second configs have no overlap, first banners should be gone
            const overlap = [...firstImages].filter(img => secondImages.has(img));
            if (overlap.length === 0 && firstConfig.length > 0) {
              for (const firstBanner of firstBanners) {
                const found = afterSecond.some(b => b.id === firstBanner.id);
                expect(found).toBe(false);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property 28.5: Empty configuration is valid
     * Configuring with empty array should clear all items.
     * Validates: Requirements 15.2, 15.3, 15.4
     */
    it('empty configuration should clear all items', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Initial non-empty configuration
          fc.array(
            fc.record({
              image: fc.webUrl(),
              linkType: fc.constantFrom(LinkType.PRODUCT, LinkType.CATEGORY, LinkType.URL, LinkType.NONE),
              isActive: fc.constant(true),
            }),
            { minLength: 1, maxLength: 5 }
          ),
          async (initialConfig) => {
            // Clear previous data
            banners.clear();

            // Configure initial banners
            await BannerModel.replaceAll(
              initialConfig.map((config, index) => ({
                image: config.image,
                linkType: config.linkType,
                sort: index,
                isActive: config.isActive,
              }))
            );

            // Verify initial configuration exists
            const afterInitial = await BannerModel.findAll();
            expect(afterInitial.length).toBe(initialConfig.length);

            // Replace with empty configuration
            await BannerModel.replaceAll([]);

            // Verify all banners are cleared
            const afterEmpty = await BannerModel.findAll();
            expect(afterEmpty.length).toBe(0);

            // Frontend API should also return empty
            const frontendBanners = await BannerModel.findActive();
            expect(frontendBanners.length).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property 28.6: Sort order is preserved
     * Items should be returned in the order they were configured.
     * Validates: Requirements 15.2, 15.3, 15.4
     */
    it('sort order should be preserved after configuration', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.uuid(), { minLength: 2, maxLength: 10 }),
          async (productIds) => {
            // Clear previous data
            hotProducts.clear();

            // Configure hot products in specific order
            await HomeHotProductModel.replaceAll(productIds);

            // Get hot products
            const retrieved = await HomeHotProductModel.findAll();

            // Verify order is preserved
            expect(retrieved.length).toBe(productIds.length);
            for (let i = 0; i < productIds.length; i++) {
              expect(retrieved[i].productId).toBe(productIds[i]);
              expect(retrieved[i].sort).toBe(i);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
