import { v4 as uuidv4 } from 'uuid';
import { query, execute } from '../database/mysql';
import { RowDataPacket } from 'mysql2/promise';

// Address interface
export interface Address {
  id: string;
  userId: string;
  name: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  detail: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Address row from database
interface AddressRow extends RowDataPacket {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  detail: string;
  is_default: number;
  created_at: Date;
  updated_at: Date;
}

// DTO for creating/updating address
export interface AddressDTO {
  name: string;
  phone: string;
  province: string;
  city: string;
  district: string;
  detail: string;
  isDefault?: boolean;
}

// Map database row to Address object
const mapRowToAddress = (row: AddressRow): Address => ({
  id: row.id,
  userId: row.user_id,
  name: row.name,
  phone: row.phone,
  province: row.province,
  city: row.city,
  district: row.district,
  detail: row.detail,
  isDefault: row.is_default === 1,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export class AddressModel {
  // Find address by ID
  static async findById(id: string): Promise<Address | null> {
    const rows = await query<AddressRow[]>('SELECT * FROM user_addresses WHERE id = ?', [id]);
    return rows.length > 0 ? mapRowToAddress(rows[0]) : null;
  }

  // Get all addresses for a user
  static async findByUserId(userId: string): Promise<Address[]> {
    const rows = await query<AddressRow[]>(
      'SELECT * FROM user_addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC',
      [userId]
    );
    return rows.map(mapRowToAddress);
  }

  // Get default address for a user
  static async findDefaultByUserId(userId: string): Promise<Address | null> {
    const rows = await query<AddressRow[]>(
      'SELECT * FROM user_addresses WHERE user_id = ? AND is_default = TRUE LIMIT 1',
      [userId]
    );
    return rows.length > 0 ? mapRowToAddress(rows[0]) : null;
  }

  // Create new address
  static async create(userId: string, data: AddressDTO): Promise<Address> {
    const id = uuidv4();
    
    // If this is the first address or set as default, clear other defaults
    if (data.isDefault) {
      await execute('UPDATE user_addresses SET is_default = FALSE WHERE user_id = ?', [userId]);
    }
    
    // Check if this is the first address (make it default)
    const existingAddresses = await this.findByUserId(userId);
    const isDefault = existingAddresses.length === 0 || data.isDefault;
    
    await execute(
      `INSERT INTO user_addresses (id, user_id, name, phone, province, city, district, detail, is_default)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, userId, data.name, data.phone, data.province, data.city, data.district, data.detail, isDefault]
    );
    
    const address = await this.findById(id);
    if (!address) {
      throw new Error('Failed to create address');
    }
    return address;
  }

  // Update address
  static async update(id: string, userId: string, data: Partial<AddressDTO>): Promise<Address | null> {
    // Verify address belongs to user
    const existing = await this.findById(id);
    if (!existing || existing.userId !== userId) {
      return null;
    }
    
    // If setting as default, clear other defaults
    if (data.isDefault) {
      await execute('UPDATE user_addresses SET is_default = FALSE WHERE user_id = ?', [userId]);
    }
    
    const updates: string[] = [];
    const values: unknown[] = [];
    
    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }
    if (data.phone !== undefined) {
      updates.push('phone = ?');
      values.push(data.phone);
    }
    if (data.province !== undefined) {
      updates.push('province = ?');
      values.push(data.province);
    }
    if (data.city !== undefined) {
      updates.push('city = ?');
      values.push(data.city);
    }
    if (data.district !== undefined) {
      updates.push('district = ?');
      values.push(data.district);
    }
    if (data.detail !== undefined) {
      updates.push('detail = ?');
      values.push(data.detail);
    }
    if (data.isDefault !== undefined) {
      updates.push('is_default = ?');
      values.push(data.isDefault);
    }
    
    if (updates.length === 0) {
      return existing;
    }
    
    values.push(id);
    await execute(`UPDATE user_addresses SET ${updates.join(', ')} WHERE id = ?`, values);
    return this.findById(id);
  }

  // Set address as default
  static async setDefault(id: string, userId: string): Promise<boolean> {
    // Verify address belongs to user
    const existing = await this.findById(id);
    if (!existing || existing.userId !== userId) {
      return false;
    }
    
    // Clear other defaults
    await execute('UPDATE user_addresses SET is_default = FALSE WHERE user_id = ?', [userId]);
    // Set this one as default
    await execute('UPDATE user_addresses SET is_default = TRUE WHERE id = ?', [id]);
    return true;
  }

  // Delete address
  static async delete(id: string, userId: string): Promise<boolean> {
    // Verify address belongs to user
    const existing = await this.findById(id);
    if (!existing || existing.userId !== userId) {
      return false;
    }
    
    const result = await execute('DELETE FROM user_addresses WHERE id = ?', [id]);
    
    // If deleted address was default, set another one as default
    if (existing.isDefault) {
      const addresses = await this.findByUserId(userId);
      if (addresses.length > 0) {
        await execute('UPDATE user_addresses SET is_default = TRUE WHERE id = ?', [addresses[0].id]);
      }
    }
    
    return result.affectedRows > 0;
  }
}
