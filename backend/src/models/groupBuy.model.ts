import { v4 as uuidv4 } from 'uuid';
import { query, execute } from '../database/mysql';
import { RowDataPacket } from 'mysql2/promise';

// Activity status enum
export enum ActivityStatus {
  NOT_STARTED = 'not_started',
  ACTIVE = 'active',
  ENDED = 'ended',
}

// Group buy status enum
export enum GroupBuyStatus {
  IN_PROGRESS = 'in_progress',
  SUCCESS = 'success',
  FAILED = 'failed',
}

// Group buy activity interface
export interface GroupBuyActivity {
  id: string;
  productId: string;
  groupPrice: number;
  originalPrice: number;
  requiredCount: number;
  timeLimit: number; // hours
  maxPerUser: number; // 每人最多参与次数
  startTime: Date;
  endTime: Date;
  status: ActivityStatus;
  createdAt: Date;
  updatedAt: Date;
}

// Group buy group interface
export interface GroupBuyGroup {
  id: string;
  activityId: string;
  initiatorId: string;
  status: GroupBuyStatus;
  currentCount: number;
  expireTime: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Group buy order interface
export interface GroupBuyOrder {
  id: string;
  groupId: string;
  userId: string;
  activityId: string;
  orderId: string | null;
  status: GroupBuyStatus;
  createdAt: Date;
  updatedAt: Date;
}

// Group buy activity with product info
export interface GroupBuyActivityDetail extends GroupBuyActivity {
  productName?: string;
  productImage?: string;
  productStock?: number;
  productDescription?: string;
}

// Group buy group with participants
export interface GroupBuyGroupDetail extends GroupBuyGroup {
  activity?: GroupBuyActivity;
  participants?: GroupBuyParticipant[];
}

// Group buy participant info
export interface GroupBuyParticipant {
  userId: string;
  nickname?: string;
  avatar?: string;
  joinedAt: Date;
}


// Database row types
interface ActivityRow extends RowDataPacket {
  id: string;
  product_id: string;
  group_price: string;
  original_price: string;
  required_count: number;
  time_limit: number;
  max_per_user: number;
  start_time: Date;
  end_time: Date;
  status: ActivityStatus;
  created_at: Date;
  updated_at: Date;
}

interface GroupRow extends RowDataPacket {
  id: string;
  activity_id: string;
  initiator_id: string;
  status: GroupBuyStatus;
  current_count: number;
  expire_time: Date;
  created_at: Date;
  updated_at: Date;
}

interface GroupBuyOrderRow extends RowDataPacket {
  id: string;
  group_id: string;
  user_id: string;
  activity_id: string;
  order_id: string | null;
  status: GroupBuyStatus;
  created_at: Date;
  updated_at: Date;
}

// DTO types
export interface CreateActivityDTO {
  productId: string;
  groupPrice: number;
  originalPrice: number;
  requiredCount: number;
  timeLimit: number;
  maxPerUser?: number;
  startTime: Date;
  endTime: Date;
}

export interface UpdateActivityDTO {
  groupPrice?: number;
  originalPrice?: number;
  requiredCount?: number;
  timeLimit?: number;
  maxPerUser?: number;
  startTime?: Date;
  endTime?: Date;
  status?: ActivityStatus;
}

export interface CreateGroupDTO {
  activityId: string;
  initiatorId: string;
  expireTime: Date;
}

export interface CreateGroupBuyOrderDTO {
  groupId: string;
  userId: string;
  activityId: string;
  orderId?: string;
}

export interface ActivityQuery {
  status?: ActivityStatus;
  productId?: string;
  page?: number;
  pageSize?: number;
}


// Map database row to Activity object
const mapRowToActivity = (row: ActivityRow): GroupBuyActivity => ({
  id: row.id,
  productId: row.product_id,
  groupPrice: parseFloat(row.group_price),
  originalPrice: parseFloat(row.original_price),
  requiredCount: row.required_count,
  timeLimit: row.time_limit,
  maxPerUser: row.max_per_user || 1,
  startTime: row.start_time,
  endTime: row.end_time,
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

// Map database row to Group object
const mapRowToGroup = (row: GroupRow): GroupBuyGroup => ({
  id: row.id,
  activityId: row.activity_id,
  initiatorId: row.initiator_id,
  status: row.status,
  currentCount: row.current_count,
  expireTime: row.expire_time,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

// Map database row to GroupBuyOrder object
const mapRowToGroupBuyOrder = (row: GroupBuyOrderRow): GroupBuyOrder => ({
  id: row.id,
  groupId: row.group_id,
  userId: row.user_id,
  activityId: row.activity_id,
  orderId: row.order_id,
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export class GroupBuyActivityModel {
  // Find activity by ID
  static async findById(id: string): Promise<GroupBuyActivity | null> {
    const rows = await query<ActivityRow[]>(
      'SELECT * FROM group_buy_activities WHERE id = ?',
      [id]
    );
    return rows.length > 0 ? mapRowToActivity(rows[0]) : null;
  }

  // Get activities with pagination and filters
  static async findMany(queryParams: ActivityQuery): Promise<{ items: GroupBuyActivity[]; total: number }> {
    const { status, productId, page = 1, pageSize = 20 } = queryParams;
    const conditions: string[] = [];
    const values: unknown[] = [];

    if (status) {
      conditions.push('status = ?');
      values.push(status);
    }

    if (productId) {
      conditions.push('product_id = ?');
      values.push(productId);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countRows = await query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM group_buy_activities ${whereClause}`,
      values
    );
    const total = countRows[0].total as number;

    // Get paginated results
    const offset = (page - 1) * pageSize;
    const rows = await query<ActivityRow[]>(
      `SELECT * FROM group_buy_activities ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...values, pageSize, offset]
    );

    return {
      items: rows.map(mapRowToActivity),
      total,
    };
  }


  // Get active activities
  static async findActive(page = 1, pageSize = 20): Promise<{ items: GroupBuyActivity[]; total: number }> {
    return this.findMany({ status: ActivityStatus.ACTIVE, page, pageSize });
  }

  // Create new activity
  static async create(data: CreateActivityDTO): Promise<GroupBuyActivity> {
    const id = uuidv4();
    await execute(
      `INSERT INTO group_buy_activities 
       (id, product_id, group_price, original_price, required_count, time_limit, max_per_user, start_time, end_time, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.productId,
        data.groupPrice,
        data.originalPrice,
        data.requiredCount,
        data.timeLimit,
        data.maxPerUser || 1,
        data.startTime,
        data.endTime,
        ActivityStatus.NOT_STARTED,
      ]
    );
    const activity = await this.findById(id);
    if (!activity) {
      throw new Error('Failed to create group buy activity');
    }
    return activity;
  }

  // Update activity
  static async update(id: string, data: UpdateActivityDTO): Promise<GroupBuyActivity | null> {
    const updates: string[] = [];
    const values: unknown[] = [];

    if (data.groupPrice !== undefined) {
      updates.push('group_price = ?');
      values.push(data.groupPrice);
    }
    if (data.originalPrice !== undefined) {
      updates.push('original_price = ?');
      values.push(data.originalPrice);
    }
    if (data.requiredCount !== undefined) {
      updates.push('required_count = ?');
      values.push(data.requiredCount);
    }
    if (data.timeLimit !== undefined) {
      updates.push('time_limit = ?');
      values.push(data.timeLimit);
    }
    if (data.maxPerUser !== undefined) {
      updates.push('max_per_user = ?');
      values.push(data.maxPerUser);
    }
    if (data.startTime !== undefined) {
      updates.push('start_time = ?');
      values.push(data.startTime);
    }
    if (data.endTime !== undefined) {
      updates.push('end_time = ?');
      values.push(data.endTime);
    }
    if (data.status !== undefined) {
      updates.push('status = ?');
      values.push(data.status);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    await execute(`UPDATE group_buy_activities SET ${updates.join(', ')} WHERE id = ?`, values);
    return this.findById(id);
  }

  // Update activity status
  static async updateStatus(id: string, status: ActivityStatus): Promise<GroupBuyActivity | null> {
    await execute('UPDATE group_buy_activities SET status = ? WHERE id = ?', [status, id]);
    return this.findById(id);
  }

  // Delete activity
  static async delete(id: string): Promise<boolean> {
    const result = await execute('DELETE FROM group_buy_activities WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }
}


export class GroupBuyGroupModel {
  // Find group by ID
  static async findById(id: string): Promise<GroupBuyGroup | null> {
    const rows = await query<GroupRow[]>(
      'SELECT * FROM group_buy_groups WHERE id = ?',
      [id]
    );
    return rows.length > 0 ? mapRowToGroup(rows[0]) : null;
  }

  // Find groups by activity ID
  static async findByActivityId(activityId: string): Promise<GroupBuyGroup[]> {
    const rows = await query<GroupRow[]>(
      'SELECT * FROM group_buy_groups WHERE activity_id = ? ORDER BY created_at DESC',
      [activityId]
    );
    return rows.map(mapRowToGroup);
  }

  // Find groups by initiator ID
  static async findByInitiatorId(initiatorId: string): Promise<GroupBuyGroup[]> {
    const rows = await query<GroupRow[]>(
      'SELECT * FROM group_buy_groups WHERE initiator_id = ? ORDER BY created_at DESC',
      [initiatorId]
    );
    return rows.map(mapRowToGroup);
  }

  // Find active groups for an activity (in_progress and not expired)
  static async findActiveByActivityId(activityId: string): Promise<GroupBuyGroup[]> {
    const rows = await query<GroupRow[]>(
      `SELECT * FROM group_buy_groups 
       WHERE activity_id = ? AND status = ? AND expire_time > NOW()
       ORDER BY created_at DESC`,
      [activityId, GroupBuyStatus.IN_PROGRESS]
    );
    return rows.map(mapRowToGroup);
  }

  // Find expired groups that are still in progress
  static async findExpiredInProgress(): Promise<GroupBuyGroup[]> {
    const rows = await query<GroupRow[]>(
      `SELECT * FROM group_buy_groups 
       WHERE status = ? AND expire_time <= NOW()`,
      [GroupBuyStatus.IN_PROGRESS]
    );
    return rows.map(mapRowToGroup);
  }

  // Create new group
  static async create(data: CreateGroupDTO): Promise<GroupBuyGroup> {
    const id = uuidv4();
    await execute(
      `INSERT INTO group_buy_groups 
       (id, activity_id, initiator_id, status, current_count, expire_time)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.activityId,
        data.initiatorId,
        GroupBuyStatus.IN_PROGRESS,
        1, // Initiator counts as first participant
        data.expireTime,
      ]
    );
    const group = await this.findById(id);
    if (!group) {
      throw new Error('Failed to create group buy group');
    }
    return group;
  }

  // Increment participant count
  static async incrementCount(id: string): Promise<GroupBuyGroup | null> {
    await execute(
      'UPDATE group_buy_groups SET current_count = current_count + 1 WHERE id = ?',
      [id]
    );
    return this.findById(id);
  }

  // Update group status
  static async updateStatus(id: string, status: GroupBuyStatus): Promise<GroupBuyGroup | null> {
    await execute('UPDATE group_buy_groups SET status = ? WHERE id = ?', [status, id]);
    return this.findById(id);
  }

  // Delete group
  static async delete(id: string): Promise<boolean> {
    const result = await execute('DELETE FROM group_buy_groups WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }
}


export class GroupBuyOrderModel {
  // Find order by ID
  static async findById(id: string): Promise<GroupBuyOrder | null> {
    const rows = await query<GroupBuyOrderRow[]>(
      'SELECT * FROM group_buy_orders WHERE id = ?',
      [id]
    );
    return rows.length > 0 ? mapRowToGroupBuyOrder(rows[0]) : null;
  }

  // Find orders by group ID
  static async findByGroupId(groupId: string): Promise<GroupBuyOrder[]> {
    const rows = await query<GroupBuyOrderRow[]>(
      'SELECT * FROM group_buy_orders WHERE group_id = ? ORDER BY created_at ASC',
      [groupId]
    );
    return rows.map(mapRowToGroupBuyOrder);
  }

  // Find orders by user ID
  static async findByUserId(userId: string, status?: GroupBuyStatus): Promise<GroupBuyOrder[]> {
    let sql = 'SELECT * FROM group_buy_orders WHERE user_id = ?';
    const params: unknown[] = [userId];

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    sql += ' ORDER BY created_at DESC';

    const rows = await query<GroupBuyOrderRow[]>(sql, params);
    return rows.map(mapRowToGroupBuyOrder);
  }

  // Check if user already joined a group
  static async findByUserAndGroup(userId: string, groupId: string): Promise<GroupBuyOrder | null> {
    const rows = await query<GroupBuyOrderRow[]>(
      'SELECT * FROM group_buy_orders WHERE user_id = ? AND group_id = ?',
      [userId, groupId]
    );
    return rows.length > 0 ? mapRowToGroupBuyOrder(rows[0]) : null;
  }

  // Count user's participation in an activity
  static async countByUserAndActivity(userId: string, activityId: string): Promise<number> {
    const rows = await query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM group_buy_orders WHERE user_id = ? AND activity_id = ?',
      [userId, activityId]
    );
    return rows[0].count as number;
  }

  // Create new group buy order
  static async create(data: CreateGroupBuyOrderDTO): Promise<GroupBuyOrder> {
    const id = uuidv4();
    await execute(
      `INSERT INTO group_buy_orders 
       (id, group_id, user_id, activity_id, order_id, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.groupId,
        data.userId,
        data.activityId,
        data.orderId || null,
        GroupBuyStatus.IN_PROGRESS,
      ]
    );
    const order = await this.findById(id);
    if (!order) {
      throw new Error('Failed to create group buy order');
    }
    return order;
  }

  // Update order status
  static async updateStatus(id: string, status: GroupBuyStatus): Promise<GroupBuyOrder | null> {
    await execute('UPDATE group_buy_orders SET status = ? WHERE id = ?', [status, id]);
    return this.findById(id);
  }

  // Update order status by group ID
  static async updateStatusByGroupId(groupId: string, status: GroupBuyStatus): Promise<boolean> {
    const result = await execute(
      'UPDATE group_buy_orders SET status = ? WHERE group_id = ?',
      [status, groupId]
    );
    return result.affectedRows > 0;
  }

  // Link to actual order
  static async linkOrder(id: string, orderId: string): Promise<GroupBuyOrder | null> {
    await execute('UPDATE group_buy_orders SET order_id = ? WHERE id = ?', [orderId, id]);
    return this.findById(id);
  }

  // Delete order
  static async delete(id: string): Promise<boolean> {
    const result = await execute('DELETE FROM group_buy_orders WHERE id = ?', [id]);
    return result.affectedRows > 0;
  }

  // Delete orders by group ID
  static async deleteByGroupId(groupId: string): Promise<boolean> {
    const result = await execute('DELETE FROM group_buy_orders WHERE group_id = ?', [groupId]);
    return result.affectedRows > 0;
  }
}
