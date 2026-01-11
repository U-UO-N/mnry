import { v4 as uuidv4 } from 'uuid';
import { query, execute } from '../database/mysql';
import { RowDataPacket } from 'mysql2/promise';

// Shipping Template interface
export interface ShippingTemplate {
  id: string;
  name: string;
  isFree: boolean;
  freeAmount: number;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Shipping Region interface
export interface ShippingRegion {
  id: string;
  templateId: string;
  provinces: string[];
  firstWeight: number;
  firstPrice: number;
  additionalWeight: number;
  additionalPrice: number;
  createdAt: Date;
}

// Delivery Area interface
export interface DeliveryArea {
  id: string;
  province: string;
  city: string | null;
  district: string | null;
  isEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Database row types
interface ShippingTemplateRow extends RowDataPacket {
  id: string;
  name: string;
  is_free: number;
  free_amount: string;
  is_default: number;
  created_at: Date;
  updated_at: Date;
}

interface ShippingRegionRow extends RowDataPacket {
  id: string;
  template_id: string;
  provinces: string;
  first_weight: string;
  first_price: string;
  additional_weight: string;
  additional_price: string;
  created_at: Date;
}

interface DeliveryAreaRow extends RowDataPacket {
  id: string;
  province: string;
  city: string | null;
  district: string | null;
  is_enabled: number;
  created_at: Date;
  updated_at: Date;
}

// DTOs
export interface ShippingTemplateDTO {
  name: string;
  isFree?: boolean;
  freeAmount?: number;
  isDefault?: boolean;
  regions?: ShippingRegionDTO[];
}

export interface ShippingRegionDTO {
  provinces: string[];
  firstWeight?: number;
  firstPrice: number;
  additionalWeight?: number;
  additionalPrice?: number;
}

export interface DeliveryAreaDTO {
  province: string;
  city?: string;
  district?: string;
  isEnabled: boolean;
}

// Map functions
const mapRowToTemplate = (row: ShippingTemplateRow): ShippingTemplate => ({
  id: row.id,
  name: row.name,
  isFree: row.is_free === 1,
  freeAmount: parseFloat(row.free_amount),
  isDefault: row.is_default === 1,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapRowToRegion = (row: ShippingRegionRow): ShippingRegion => {
  let provinces: string[] = [];
  
  if (row.provinces) {
    // If it's already an array (MySQL JSON type parsed automatically)
    if (Array.isArray(row.provinces)) {
      provinces = row.provinces;
    } else if (typeof row.provinces === 'string') {
      try {
        // Try to parse as JSON first
        const parsed = JSON.parse(row.provinces);
        provinces = Array.isArray(parsed) ? parsed : [];
      } catch {
        // If not valid JSON, treat as comma-separated string
        provinces = row.provinces.split(',').map(p => p.trim()).filter(p => p);
      }
    } else if (typeof row.provinces === 'object') {
      // If it's an object (parsed JSON), convert to array
      provinces = Object.values(row.provinces);
    }
  }
  
  return {
    id: row.id,
    templateId: row.template_id,
    provinces,
    firstWeight: parseFloat(row.first_weight) || 1,
    firstPrice: parseFloat(row.first_price) || 0,
    additionalWeight: parseFloat(row.additional_weight) || 1,
    additionalPrice: parseFloat(row.additional_price) || 0,
    createdAt: row.created_at,
  };
};

const mapRowToDeliveryArea = (row: DeliveryAreaRow): DeliveryArea => ({
  id: row.id,
  province: row.province,
  city: row.city,
  district: row.district,
  isEnabled: row.is_enabled === 1,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export class ShippingTemplateModel {
  static async findAll(): Promise<ShippingTemplate[]> {
    const rows = await query<ShippingTemplateRow[]>(
      'SELECT * FROM shipping_templates ORDER BY is_default DESC, created_at DESC'
    );
    return rows.map(mapRowToTemplate);
  }

  static async findById(id: string): Promise<ShippingTemplate | null> {
    const rows = await query<ShippingTemplateRow[]>(
      'SELECT * FROM shipping_templates WHERE id = ?',
      [id]
    );
    return rows.length > 0 ? mapRowToTemplate(rows[0]) : null;
  }

  static async findDefault(): Promise<ShippingTemplate | null> {
    const rows = await query<ShippingTemplateRow[]>(
      'SELECT * FROM shipping_templates WHERE is_default = TRUE LIMIT 1'
    );
    return rows.length > 0 ? mapRowToTemplate(rows[0]) : null;
  }

  static async create(data: ShippingTemplateDTO): Promise<ShippingTemplate> {
    const id = uuidv4();
    
    if (data.isDefault) {
      await execute('UPDATE shipping_templates SET is_default = FALSE');
    }
    
    await execute(
      `INSERT INTO shipping_templates (id, name, is_free, free_amount, is_default)
       VALUES (?, ?, ?, ?, ?)`,
      [id, data.name, data.isFree || false, data.freeAmount || 0, data.isDefault || false]
    );
    
    // Create regions if provided
    if (data.regions && data.regions.length > 0) {
      for (const region of data.regions) {
        await ShippingRegionModel.create(id, region);
      }
    }
    
    const template = await this.findById(id);
    if (!template) {
      throw new Error('Failed to create shipping template');
    }
    return template;
  }

  static async update(id: string, data: Partial<ShippingTemplateDTO>): Promise<ShippingTemplate | null> {
    if (data.isDefault) {
      await execute('UPDATE shipping_templates SET is_default = FALSE');
    }
    
    const updates: string[] = [];
    const values: unknown[] = [];
    
    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }
    if (data.isFree !== undefined) {
      updates.push('is_free = ?');
      values.push(data.isFree);
    }
    if (data.freeAmount !== undefined) {
      updates.push('free_amount = ?');
      values.push(data.freeAmount);
    }
    if (data.isDefault !== undefined) {
      updates.push('is_default = ?');
      values.push(data.isDefault);
    }
    
    if (updates.length > 0) {
      values.push(id);
      await execute(`UPDATE shipping_templates SET ${updates.join(', ')} WHERE id = ?`, values);
    }
    
    return this.findById(id);
  }

  static async delete(id: string): Promise<boolean> {
    // Delete regions first
    await execute('DELETE FROM shipping_regions WHERE template_id = ?', [id]);
    const result = await execute('DELETE FROM shipping_templates WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }
}

export class ShippingRegionModel {
  static async findByTemplateId(templateId: string): Promise<ShippingRegion[]> {
    const rows = await query<ShippingRegionRow[]>(
      'SELECT * FROM shipping_regions WHERE template_id = ?',
      [templateId]
    );
    return rows.map(mapRowToRegion);
  }

  static async create(templateId: string, data: ShippingRegionDTO): Promise<ShippingRegion> {
    const id = uuidv4();
    await execute(
      `INSERT INTO shipping_regions (id, template_id, provinces, first_weight, first_price, additional_weight, additional_price)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        templateId,
        JSON.stringify(data.provinces || []),
        data.firstWeight || 1,
        data.firstPrice || 0,
        data.additionalWeight || 1,
        data.additionalPrice || 0
      ]
    );
    
    const rows = await query<ShippingRegionRow[]>('SELECT * FROM shipping_regions WHERE id = ?', [id]);
    return mapRowToRegion(rows[0]);
  }

  static async deleteByTemplateId(templateId: string): Promise<boolean> {
    const result = await execute('DELETE FROM shipping_regions WHERE template_id = ?', [templateId]);
    return result.affectedRows > 0;
  }
}

export class DeliveryAreaModel {
  static async findAll(): Promise<DeliveryArea[]> {
    const rows = await query<DeliveryAreaRow[]>(
      'SELECT * FROM delivery_areas ORDER BY province, city, district'
    );
    return rows.map(mapRowToDeliveryArea);
  }

  static async findEnabled(): Promise<DeliveryArea[]> {
    const rows = await query<DeliveryAreaRow[]>(
      'SELECT * FROM delivery_areas WHERE is_enabled = TRUE ORDER BY province, city, district'
    );
    return rows.map(mapRowToDeliveryArea);
  }

  static async findByProvince(province: string): Promise<DeliveryArea[]> {
    const rows = await query<DeliveryAreaRow[]>(
      'SELECT * FROM delivery_areas WHERE province = ? ORDER BY city, district',
      [province]
    );
    return rows.map(mapRowToDeliveryArea);
  }

  static async isAreaEnabled(province: string, city?: string, district?: string): Promise<boolean> {
    // Check if any delivery areas are configured
    const allAreas = await query<DeliveryAreaRow[]>(
      'SELECT * FROM delivery_areas LIMIT 1'
    );
    
    // If no areas are configured at all, allow all provinces
    if (allAreas.length === 0) {
      return true;
    }
    
    // Check if province is enabled (province-level record with is_enabled = TRUE)
    // Support fuzzy matching for province names
    const provinceRows = await query<DeliveryAreaRow[]>(
      `SELECT * FROM delivery_areas 
       WHERE (province = ? OR province LIKE ? OR ? LIKE CONCAT('%', REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(province, '省', ''), '市', ''), '自治区', ''), '特别行政区', ''), '壮族', ''), '%'))
       AND (city IS NULL OR city = "") 
       AND (district IS NULL OR district = "") 
       AND is_enabled = TRUE`,
      [province, `%${province}%`, province]
    );
    
    if (provinceRows.length > 0) {
      return true;
    }
    
    // Also check if there are any enabled areas at all - if none are enabled, allow all
    const enabledAreas = await query<DeliveryAreaRow[]>(
      'SELECT * FROM delivery_areas WHERE is_enabled = TRUE LIMIT 1'
    );
    
    if (enabledAreas.length === 0) {
      return true;
    }
    
    return false;
  }

  static async upsert(data: DeliveryAreaDTO): Promise<DeliveryArea> {
    const existing = await query<DeliveryAreaRow[]>(
      'SELECT * FROM delivery_areas WHERE province = ? AND city <=> ? AND district <=> ?',
      [data.province, data.city || null, data.district || null]
    );
    
    if (existing.length > 0) {
      await execute(
        'UPDATE delivery_areas SET is_enabled = ? WHERE id = ?',
        [data.isEnabled, existing[0].id]
      );
      const updated = await query<DeliveryAreaRow[]>('SELECT * FROM delivery_areas WHERE id = ?', [existing[0].id]);
      return mapRowToDeliveryArea(updated[0]);
    }
    
    const id = uuidv4();
    await execute(
      `INSERT INTO delivery_areas (id, province, city, district, is_enabled)
       VALUES (?, ?, ?, ?, ?)`,
      [id, data.province, data.city || null, data.district || null, data.isEnabled]
    );
    
    const rows = await query<DeliveryAreaRow[]>('SELECT * FROM delivery_areas WHERE id = ?', [id]);
    return mapRowToDeliveryArea(rows[0]);
  }

  static async batchUpsert(areas: DeliveryAreaDTO[]): Promise<number> {
    let count = 0;
    for (const area of areas) {
      await this.upsert(area);
      count++;
    }
    return count;
  }

  static async setProvinceEnabled(province: string, isEnabled: boolean): Promise<boolean> {
    // Check if province record exists
    const existing = await query<DeliveryAreaRow[]>(
      'SELECT * FROM delivery_areas WHERE province = ? AND city IS NULL AND district IS NULL',
      [province]
    );
    
    if (existing.length > 0) {
      await execute(
        'UPDATE delivery_areas SET is_enabled = ? WHERE province = ? AND city IS NULL AND district IS NULL',
        [isEnabled, province]
      );
    } else {
      const id = uuidv4();
      await execute(
        'INSERT INTO delivery_areas (id, province, city, district, is_enabled) VALUES (?, ?, NULL, NULL, ?)',
        [id, province, isEnabled]
      );
    }
    
    return true;
  }
}
