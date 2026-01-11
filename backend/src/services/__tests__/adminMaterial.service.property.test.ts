/**
 * Property-Based Tests for Admin Material Service
 *
 * Feature: ecommerce-miniprogram
 *
 * Property 34: Material Deletion Correctness
 * Validates: Requirements 20.3
 * For any material delete operation, the deleted material should not appear in the material list.
 */

import * as fc from 'fast-check';
import { MaterialModel, Material, MaterialType } from '../../models/material.model';

// In-memory store for testing
const materials = new Map<
  string,
  {
    id: string;
    url: string;
    type: MaterialType;
    name: string;
    size: number;
    category: string | null;
    tags: string | null;
    created_at: Date;
    updated_at: Date;
  }
>();

// Mock the database module
jest.mock('../../database/mysql', () => {
  return {
    query: jest.fn(async (sql: string, params?: unknown[]) => {
      // Find by ID
      if (sql.includes('SELECT * FROM materials WHERE id = ?')) {
        const id = params?.[0] as string;
        const material = materials.get(id);
        return material ? [material] : [];
      }

      // Check exists
      if (sql.includes('SELECT 1 FROM materials WHERE id = ?')) {
        const id = params?.[0] as string;
        return materials.has(id) ? [{ 1: 1 }] : [];
      }

      // Count query
      if (sql.includes('SELECT COUNT(*) as total FROM materials')) {
        let count = materials.size;

        // Apply filters if present
        if (sql.includes('WHERE')) {
          const allMaterials = Array.from(materials.values());
          let filtered = allMaterials;

          if (sql.includes('type = ?') && params && params.length > 0) {
            const type = params[0] as MaterialType;
            filtered = filtered.filter((m) => m.type === type);
          }

          if (sql.includes('category = ?') && params && params.length > 0) {
            // Find the category param based on position
            const typeParamCount = sql.includes('type = ?') ? 1 : 0;
            const category = params[typeParamCount] as string;
            if (category) {
              filtered = filtered.filter((m) => m.category === category);
            }
          }

          count = filtered.length;
        }

        return [{ total: count }];
      }

      // Select all with pagination
      if (sql.includes('SELECT * FROM materials')) {
        let allMaterials = Array.from(materials.values());

        // Apply filters
        if (sql.includes('type = ?')) {
          const type = params?.[0] as MaterialType;
          allMaterials = allMaterials.filter((m) => m.type === type);
        }

        // Sort by created_at DESC
        allMaterials.sort(
          (a, b) => b.created_at.getTime() - a.created_at.getTime()
        );

        // Apply pagination
        if (sql.includes('LIMIT')) {
          const limitMatch = sql.match(/LIMIT \? OFFSET \?/);
          if (limitMatch) {
            const limitIndex = params!.length - 2;
            const offsetIndex = params!.length - 1;
            const limit = params![limitIndex] as number;
            const offset = params![offsetIndex] as number;
            allMaterials = allMaterials.slice(offset, offset + limit);
          }
        }

        return allMaterials;
      }

      // Get distinct categories
      if (sql.includes('SELECT DISTINCT category FROM materials')) {
        const categories = new Set<string>();
        for (const material of materials.values()) {
          if (material.category) {
            categories.add(material.category);
          }
        }
        return Array.from(categories)
          .sort()
          .map((c) => ({ category: c }));
      }

      return [];
    }),
    execute: jest.fn(async (sql: string, params?: unknown[]) => {
      // Insert material
      if (sql.includes('INSERT INTO materials')) {
        const [id, url, type, name, size, category, tags] = params as [
          string,
          string,
          MaterialType,
          string,
          number,
          string | null,
          string | null,
        ];
        const now = new Date();
        materials.set(id, {
          id,
          url,
          type,
          name,
          size,
          category,
          tags,
          created_at: now,
          updated_at: now,
        });
        return { affectedRows: 1 };
      }

      // Delete material
      if (sql.includes('DELETE FROM materials WHERE id = ?')) {
        const id = params?.[0] as string;
        const deleted = materials.delete(id);
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

describe('Admin Material Service Property Tests', () => {
  beforeEach(() => {
    materials.clear();
    jest.clearAllMocks();
  });

  /**
   * Property 34: Material Deletion Correctness
   *
   * For any material delete operation, the deleted material should not appear
   * in the material list.
   *
   * Validates: Requirements 20.3
   */
  describe('Property 34: Material Deletion Correctness', () => {
    /**
     * Property 34.1: Deleted material should not appear in list
     * After deleting a material, it should not be found in the materials list.
     */
    it('deleted material should not appear in materials list', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate a list of materials to create
          fc.array(
            fc.record({
              url: fc.webUrl(),
              type: fc.constantFrom(MaterialType.IMAGE, MaterialType.VIDEO),
              name: fc
                .string({ minLength: 1, maxLength: 100 })
                .filter((s) => s.trim().length > 0),
              size: fc.integer({ min: 1, max: 10000000 }),
              category: fc.option(
                fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
                { nil: undefined }
              ),
              tags: fc.option(
                fc.array(fc.string({ minLength: 1, maxLength: 20 }), {
                  minLength: 0,
                  maxLength: 5,
                }),
                { nil: undefined }
              ),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          // Index of material to delete
          fc.nat(),
          async (materialConfigs, deleteIndexRaw) => {
            // Clear previous data
            materials.clear();

            // Create materials
            const createdMaterials: Material[] = [];
            for (const config of materialConfigs) {
              const material = await MaterialModel.create({
                url: config.url,
                type: config.type,
                name: config.name,
                size: config.size,
                category: config.category,
                tags: config.tags,
              });
              createdMaterials.push(material);
            }

            // Select a material to delete
            const deleteIndex = deleteIndexRaw % createdMaterials.length;
            const materialToDelete = createdMaterials[deleteIndex];

            // Verify material exists before deletion
            const existsBefore = await MaterialModel.exists(materialToDelete.id);
            expect(existsBefore).toBe(true);

            // Delete the material
            const deleteResult = await MaterialModel.delete(materialToDelete.id);
            expect(deleteResult).toBe(true);

            // Verify material no longer exists
            const existsAfter = await MaterialModel.exists(materialToDelete.id);
            expect(existsAfter).toBe(false);

            // Verify material is not in the list
            const { items } = await MaterialModel.findAll({});
            const foundInList = items.some(
              (item) => item.id === materialToDelete.id
            );
            expect(foundInList).toBe(false);

            // Verify other materials still exist
            for (let i = 0; i < createdMaterials.length; i++) {
              if (i !== deleteIndex) {
                const otherMaterial = createdMaterials[i];
                const otherExists = await MaterialModel.exists(otherMaterial.id);
                expect(otherExists).toBe(true);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property 34.2: Deleting non-existent material returns false
     * Attempting to delete a material that doesn't exist should return false.
     */
    it('deleting non-existent material should return false', async () => {
      await fc.assert(
        fc.asyncProperty(fc.uuid(), async (nonExistentId) => {
          // Clear previous data
          materials.clear();

          // Verify material doesn't exist
          const existsBefore = await MaterialModel.exists(nonExistentId);
          expect(existsBefore).toBe(false);

          // Attempt to delete non-existent material
          const deleteResult = await MaterialModel.delete(nonExistentId);
          expect(deleteResult).toBe(false);
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Property 34.3: Delete is idempotent
     * Deleting the same material twice should succeed first time and fail second time.
     */
    it('delete operation should be idempotent', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            url: fc.webUrl(),
            type: fc.constantFrom(MaterialType.IMAGE, MaterialType.VIDEO),
            name: fc
              .string({ minLength: 1, maxLength: 100 })
              .filter((s) => s.trim().length > 0),
            size: fc.integer({ min: 1, max: 10000000 }),
          }),
          async (materialConfig) => {
            // Clear previous data
            materials.clear();

            // Create a material
            const material = await MaterialModel.create({
              url: materialConfig.url,
              type: materialConfig.type,
              name: materialConfig.name,
              size: materialConfig.size,
            });

            // First delete should succeed
            const firstDelete = await MaterialModel.delete(material.id);
            expect(firstDelete).toBe(true);

            // Second delete should fail (material already deleted)
            const secondDelete = await MaterialModel.delete(material.id);
            expect(secondDelete).toBe(false);

            // Material should still not exist
            const exists = await MaterialModel.exists(material.id);
            expect(exists).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property 34.4: List count decreases after deletion
     * After deleting a material, the total count should decrease by 1.
     */
    it('material count should decrease by 1 after deletion', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              url: fc.webUrl(),
              type: fc.constantFrom(MaterialType.IMAGE, MaterialType.VIDEO),
              name: fc
                .string({ minLength: 1, maxLength: 100 })
                .filter((s) => s.trim().length > 0),
              size: fc.integer({ min: 1, max: 10000000 }),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          fc.nat(),
          async (materialConfigs, deleteIndexRaw) => {
            // Clear previous data
            materials.clear();

            // Create materials
            const createdMaterials: Material[] = [];
            for (const config of materialConfigs) {
              const material = await MaterialModel.create({
                url: config.url,
                type: config.type,
                name: config.name,
                size: config.size,
              });
              createdMaterials.push(material);
            }

            // Get count before deletion
            const { total: countBefore } = await MaterialModel.findAll({});
            expect(countBefore).toBe(createdMaterials.length);

            // Delete a material
            const deleteIndex = deleteIndexRaw % createdMaterials.length;
            const materialToDelete = createdMaterials[deleteIndex];
            await MaterialModel.delete(materialToDelete.id);

            // Get count after deletion
            const { total: countAfter } = await MaterialModel.findAll({});
            expect(countAfter).toBe(countBefore - 1);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
