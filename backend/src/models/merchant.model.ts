import { v4 as uuidv4 } from 'uuid';
import { query, execute } from '../database/mysql';
import { RowDataPacket } from 'mysql2/promise';

// Merchant type enum
export enum MerchantType {
  STORE = 'store',       // 门店
  SUPPLIER = 'supplier', // 供应商
}

// Application status enum
export enum ApplicationStatus {
  PENDING = 'pending',     // 待审核
  APPROVED = 'approved',   // 已通过
  REJECTED = 'rejected',   // 已拒绝
}

// Merchant application interface
export interface MerchantApplication {
  id: string;
  userId: string;
  type: MerchantType;
  companyName: string;
  contactName: string;
  contactPhone: string;
  businessLicense: string | null;
  address: string | null;
  description: string | null;
  status: ApplicationStatus;
  rejectReason: string | null;
  reviewedAt: Date | null;
  reviewedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Merchant application row from database
interface MerchantApplicationRow extends RowDataPacket {
  id: string;
  user_id: string;
  type: MerchantType;
  company_name: string;
  contact_name: string;
  contact_phone: string;
  business_license: string | null;
  address: string | null;
  description: string | null;
  status: ApplicationStatus;
  reject_reason: string | null;
  reviewed_at: Date | null;
  reviewed_by: string | null;
  created_at: Date;
  updated_at: Date;
}

// DTO for creating store application
export interface CreateStoreApplicationDTO {
  userId: string;
  companyName: string;
  contactName: string;
  contactPhone: string;
  businessLicense?: string;
  address?: string;
  description?: string;
}

// DTO for creating supplier application
export interface CreateSupplierApplicationDTO {
  userId: string;
  companyName: string;
  contactName: string;
  contactPhone: string;
  businessLicense?: string;
  address?: string;
  description?: string;
}


// Query parameters for application list
export interface ApplicationQuery {
  userId?: string;
  type?: MerchantType;
  status?: ApplicationStatus;
  page?: number;
  pageSize?: number;
}

// Map database row to MerchantApplication object
const mapRowToApplication = (row: MerchantApplicationRow): MerchantApplication => ({
  id: row.id,
  userId: row.user_id,
  type: row.type,
  companyName: row.company_name,
  contactName: row.contact_name,
  contactPhone: row.contact_phone,
  businessLicense: row.business_license,
  address: row.address,
  description: row.description,
  status: row.status,
  rejectReason: row.reject_reason,
  reviewedAt: row.reviewed_at,
  reviewedBy: row.reviewed_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export class MerchantApplicationModel {
  // Find application by ID
  static async findById(id: string): Promise<MerchantApplication | null> {
    const rows = await query<MerchantApplicationRow[]>(
      'SELECT * FROM merchant_applications WHERE id = ?',
      [id]
    );
    return rows.length > 0 ? mapRowToApplication(rows[0]) : null;
  }

  // Find application by user ID and type
  static async findByUserAndType(
    userId: string,
    type: MerchantType
  ): Promise<MerchantApplication | null> {
    const rows = await query<MerchantApplicationRow[]>(
      'SELECT * FROM merchant_applications WHERE user_id = ? AND type = ? ORDER BY created_at DESC LIMIT 1',
      [userId, type]
    );
    return rows.length > 0 ? mapRowToApplication(rows[0]) : null;
  }

  // Find all applications by user ID
  static async findByUser(userId: string): Promise<MerchantApplication[]> {
    const rows = await query<MerchantApplicationRow[]>(
      'SELECT * FROM merchant_applications WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    return rows.map(mapRowToApplication);
  }


  // Find applications with pagination (for admin)
  static async findAll(
    queryParams: ApplicationQuery
  ): Promise<{ items: MerchantApplication[]; total: number }> {
    const { userId, type, status, page = 1, pageSize = 20 } = queryParams;
    const conditions: string[] = [];
    const values: unknown[] = [];

    if (userId) {
      conditions.push('user_id = ?');
      values.push(userId);
    }

    if (type) {
      conditions.push('type = ?');
      values.push(type);
    }

    if (status) {
      conditions.push('status = ?');
      values.push(status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countRows = await query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM merchant_applications ${whereClause}`,
      values
    );
    const total = countRows[0].total as number;

    // Get paginated results
    const offset = (page - 1) * pageSize;
    const rows = await query<MerchantApplicationRow[]>(
      `SELECT * FROM merchant_applications ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...values, pageSize, offset]
    );

    return {
      items: rows.map(mapRowToApplication),
      total,
    };
  }

  // Create store application
  static async createStoreApplication(
    data: CreateStoreApplicationDTO
  ): Promise<MerchantApplication> {
    const id = uuidv4();

    await execute(
      `INSERT INTO merchant_applications 
       (id, user_id, type, company_name, contact_name, contact_phone, business_license, address, description, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.userId,
        MerchantType.STORE,
        data.companyName,
        data.contactName,
        data.contactPhone,
        data.businessLicense || null,
        data.address || null,
        data.description || null,
        ApplicationStatus.PENDING,
      ]
    );

    const application = await this.findById(id);
    if (!application) {
      throw new Error('Failed to create store application');
    }
    return application;
  }


  // Create supplier application
  static async createSupplierApplication(
    data: CreateSupplierApplicationDTO
  ): Promise<MerchantApplication> {
    const id = uuidv4();

    await execute(
      `INSERT INTO merchant_applications 
       (id, user_id, type, company_name, contact_name, contact_phone, business_license, address, description, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.userId,
        MerchantType.SUPPLIER,
        data.companyName,
        data.contactName,
        data.contactPhone,
        data.businessLicense || null,
        data.address || null,
        data.description || null,
        ApplicationStatus.PENDING,
      ]
    );

    const application = await this.findById(id);
    if (!application) {
      throw new Error('Failed to create supplier application');
    }
    return application;
  }

  // Update application status (for admin review)
  static async updateStatus(
    id: string,
    status: ApplicationStatus,
    reviewedBy: string,
    rejectReason?: string
  ): Promise<MerchantApplication | null> {
    const updates: string[] = ['status = ?', 'reviewed_at = NOW()', 'reviewed_by = ?'];
    const values: unknown[] = [status, reviewedBy];

    if (status === ApplicationStatus.REJECTED && rejectReason) {
      updates.push('reject_reason = ?');
      values.push(rejectReason);
    }

    values.push(id);
    await execute(
      `UPDATE merchant_applications SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
    return this.findById(id);
  }

  // Check if user has pending application of a type
  static async hasPendingApplication(
    userId: string,
    type: MerchantType
  ): Promise<boolean> {
    const rows = await query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM merchant_applications WHERE user_id = ? AND type = ? AND status = ?',
      [userId, type, ApplicationStatus.PENDING]
    );
    return (rows[0].count as number) > 0;
  }

  // Check if user is already approved merchant of a type
  static async isApprovedMerchant(
    userId: string,
    type: MerchantType
  ): Promise<boolean> {
    const rows = await query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM merchant_applications WHERE user_id = ? AND type = ? AND status = ?',
      [userId, type, ApplicationStatus.APPROVED]
    );
    return (rows[0].count as number) > 0;
  }
}
