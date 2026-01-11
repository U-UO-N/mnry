import {
  MaterialModel,
  Material,
  CreateMaterialDTO,
  MaterialQueryParams,
} from '../models/material.model';
import { PaginatedResult } from '../types';

export class AdminMaterialService {
  /**
   * Get materials list with pagination and filtering
   */
  static async getMaterials(params: MaterialQueryParams): Promise<PaginatedResult<Material>> {
    const { page = 1, pageSize = 20 } = params;
    const { items, total } = await MaterialModel.findAll(params);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Upload a single material
   */
  static async uploadMaterial(data: CreateMaterialDTO): Promise<Material> {
    return MaterialModel.create(data);
  }

  /**
   * Upload multiple materials (batch)
   */
  static async uploadMaterials(materials: CreateMaterialDTO[]): Promise<Material[]> {
    return MaterialModel.createBatch(materials);
  }

  /**
   * Delete a material by ID
   */
  static async deleteMaterial(id: string): Promise<boolean> {
    return MaterialModel.delete(id);
  }

  /**
   * Get material by ID
   */
  static async getMaterialById(id: string): Promise<Material | null> {
    return MaterialModel.findById(id);
  }

  /**
   * Check if material exists
   */
  static async materialExists(id: string): Promise<boolean> {
    return MaterialModel.exists(id);
  }

  /**
   * Get all distinct categories
   */
  static async getCategories(): Promise<string[]> {
    return MaterialModel.getCategories();
  }
}
