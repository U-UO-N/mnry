import { v4 as uuidv4 } from 'uuid';
import { query, execute } from '../database/mysql';
import { RowDataPacket } from 'mysql2/promise';

// Material type enum
export enum MaterialType {
  IMAGE = 'image',
  VIDEO = 'video',
}

// Material interface
export interface Material {
  id: string;
  url: string;
  type: MaterialType;
  name: string;
  size: number;
  category: string | null;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Material row from database
interface MaterialRow extends RowDataPacket {
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

// DTO for creating material
export interface CreateMaterialDTO {
  url: string;
  type: MaterialType;
  name: string;
  size: number;
  category?: string;
  tags?: string[];
}

// Query parameters for listing materials
export interface MaterialQueryParams {
  type?: MaterialType;
  category?: string;
  keyword?: string;
  page?: number;
  pageSize?: number;
}

// Map database row to Material object
const mapRowToMaterial = (row: MaterialRow): Material => ({
  id: row.id,
  url: row.url,
  type: row.type,
  name: row.name,
  size: row.size,
  category: row.category,
  tags: row.tags ? JSON.parse(row.tags) : [],
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export class MaterialModel {
  // Find material by ID
  static async findById(id: string): Promise<Material | null> {
    const rows = await query<MaterialRow[]>('SELECT * FROM materials WHERE id = ?', [id]);
    return rows.length > 0 ? mapRowToMaterial(rows[0]) : null;
  }

  // Get all materials with pagination and filtering
  static async findAll(
    params: MaterialQueryParams = {}
  ): Promise<{ items: Material[]; total: number }> {
    const { type, category, keyword, page = 1, pageSize = 20 } = params;
    const conditions: string[] = [];
    const values: unknown[] = [];

    if (type) {
      conditions.push('type = ?');
      values.push(type);
    }
    if (category) {
      conditions.push('category = ?');
      values.push(category);
    }
    if (keyword) {
      conditions.push('(name LIKE ? OR tags LIKE ?)');
      values.push(`%${keyword}%`, `%${keyword}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countRows = await query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM materials ${whereClause}`,
      values
    );
    const total = countRows[0].total as number;

    // Get paginated results
    const offset = (page - 1) * pageSize;
    const rows = await query<MaterialRow[]>(
      `SELECT * FROM materials ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...values, pageSize, offset]
    );

    return {
      items: rows.map(mapRowToMaterial),
      total,
    };
  }

  // Create new material
  static async create(data: CreateMaterialDTO): Promise<Material> {
    const id = uuidv4();
    const tagsJson = data.tags ? JSON.stringify(data.tags) : null;

    await execute(
      `INSERT INTO materials (id, url, type, name, size, category, tags)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, data.url, data.type, data.name, data.size, data.category || null, tagsJson]
    );

    const material = await this.findById(id);
    if (!material) {
      throw new Error('Failed to create material');
    }
    return material;
  }

  // Create multiple materials (batch upload)
  static async createBatch(materials: CreateMaterialDTO[]): Promise<Material[]> {
    const results: Material[] = [];
    for (const data of materials) {
      const material = await this.create(data);
      results.push(material);
    }
    return results;
  }

  // Delete material
  static async delete(id: string): Promise<boolean> {
    const result = await execute('DELETE FROM materials WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  // Check if material exists
  static async exists(id: string): Promise<boolean> {
    const rows = await query<RowDataPacket[]>('SELECT 1 FROM materials WHERE id = ? LIMIT 1', [id]);
    return rows.length > 0;
  }

  // Get distinct categories
  static async getCategories(): Promise<string[]> {
    const rows = await query<RowDataPacket[]>(
      'SELECT DISTINCT category FROM materials WHERE category IS NOT NULL ORDER BY category'
    );
    return rows.map(row => row.category as string);
  }
}
