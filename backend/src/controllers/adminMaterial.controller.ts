import { Request, Response, NextFunction } from 'express';
import { AdminMaterialService } from '../services/adminMaterial.service';
import { NotFoundError, ValidationError } from '../middlewares/errorHandler';
import { MaterialType, CreateMaterialDTO } from '../models/material.model';

export class AdminMaterialController {
  /**
   * GET /api/admin/materials - Get materials list with filtering and pagination
   * Validates: Requirements 20.1
   */
  static async getMaterials(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { type, category, keyword, page = '1', pageSize = '20' } = req.query;

      // Validate type if provided
      if (type && !Object.values(MaterialType).includes(type as MaterialType)) {
        throw new ValidationError('Invalid material type');
      }

      const result = await AdminMaterialService.getMaterials({
        type: type as MaterialType | undefined,
        category: category as string | undefined,
        keyword: keyword as string | undefined,
        page: parseInt(page as string, 10),
        pageSize: parseInt(pageSize as string, 10),
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/admin/materials - Upload material(s)
   * Supports single upload and batch upload
   * Validates: Requirements 20.2
   */
  static async uploadMaterial(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { materials } = req.body;

      // Check if batch upload or single upload
      if (Array.isArray(materials)) {
        // Batch upload
        if (materials.length === 0) {
          throw new ValidationError('At least one material is required');
        }

        // Validate each material
        for (const material of materials) {
          AdminMaterialController.validateMaterialData(material);
        }

        const result = await AdminMaterialService.uploadMaterials(materials);

        res.status(201).json({
          success: true,
          data: result,
        });
      } else {
        // Single upload
        const data: CreateMaterialDTO = req.body;
        AdminMaterialController.validateMaterialData(data);

        const result = await AdminMaterialService.uploadMaterial(data);

        res.status(201).json({
          success: true,
          data: result,
        });
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/admin/materials/:id - Delete a material
   * Validates: Requirements 20.3
   */
  static async deleteMaterial(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      // Check if material exists
      const exists = await AdminMaterialService.materialExists(id);
      if (!exists) {
        throw new NotFoundError('Material not found');
      }

      await AdminMaterialService.deleteMaterial(id);

      res.json({
        success: true,
        message: 'Material deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/materials/categories - Get all material categories
   */
  static async getCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const categories = await AdminMaterialService.getCategories();

      res.json({
        success: true,
        data: categories,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Validate material data
   */
  private static validateMaterialData(data: CreateMaterialDTO): void {
    if (!data.url || typeof data.url !== 'string' || data.url.trim() === '') {
      throw new ValidationError('Material URL is required');
    }
    if (!data.type || !Object.values(MaterialType).includes(data.type)) {
      throw new ValidationError('Valid material type is required (image or video)');
    }
    if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
      throw new ValidationError('Material name is required');
    }
    if (data.size === undefined || typeof data.size !== 'number' || data.size < 0) {
      throw new ValidationError('Valid material size is required');
    }
    if (data.tags !== undefined && !Array.isArray(data.tags)) {
      throw new ValidationError('Tags must be an array');
    }
  }
}
