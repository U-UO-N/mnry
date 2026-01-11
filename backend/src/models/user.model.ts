import { v4 as uuidv4 } from 'uuid';
import { query, execute } from '../database/mysql';
import { RowDataPacket } from 'mysql2/promise';

// Member level enum
export enum MemberLevel {
  NORMAL = 'normal',
  VIP = 'vip',
  SVIP = 'svip',
}

// User interface
export interface User {
  id: string;
  openid: string;
  nickname: string | null;
  avatar: string | null;
  phone: string | null;
  memberLevel: MemberLevel;
  balance: number;
  points: number;
  createdAt: Date;
  updatedAt: Date;
}

// User row from database
interface UserRow extends RowDataPacket {
  id: string;
  openid: string;
  nickname: string | null;
  avatar: string | null;
  phone: string | null;
  member_level: MemberLevel;
  balance: string;
  points: number;
  created_at: Date;
  updated_at: Date;
}

// DTO for creating user
export interface CreateUserDTO {
  openid: string;
  nickname?: string;
  avatar?: string;
}

// DTO for updating user
export interface UpdateUserDTO {
  nickname?: string;
  avatar?: string;
  phone?: string;
}

// Map database row to User object
const mapRowToUser = (row: UserRow): User => ({
  id: row.id,
  openid: row.openid,
  nickname: row.nickname,
  avatar: row.avatar,
  phone: row.phone,
  memberLevel: row.member_level,
  balance: parseFloat(row.balance),
  points: row.points,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export class UserModel {
  // Find user by ID
  static async findById(id: string): Promise<User | null> {
    const rows = await query<UserRow[]>('SELECT * FROM users WHERE id = ?', [id]);
    return rows.length > 0 ? mapRowToUser(rows[0]) : null;
  }

  // Find user by openid
  static async findByOpenid(openid: string): Promise<User | null> {
    const rows = await query<UserRow[]>('SELECT * FROM users WHERE openid = ?', [openid]);
    return rows.length > 0 ? mapRowToUser(rows[0]) : null;
  }

  // Create new user
  static async create(data: CreateUserDTO): Promise<User> {
    const id = uuidv4();
    await execute(
      `INSERT INTO users (id, openid, nickname, avatar) VALUES (?, ?, ?, ?)`,
      [id, data.openid, data.nickname || null, data.avatar || null]
    );
    const user = await this.findById(id);
    if (!user) {
      throw new Error('Failed to create user');
    }
    return user;
  }

  // Update user info
  static async update(id: string, data: UpdateUserDTO): Promise<User | null> {
    const updates: string[] = [];
    const values: unknown[] = [];

    if (data.nickname !== undefined) {
      updates.push('nickname = ?');
      values.push(data.nickname);
    }
    if (data.avatar !== undefined) {
      updates.push('avatar = ?');
      values.push(data.avatar);
    }
    if (data.phone !== undefined) {
      updates.push('phone = ?');
      values.push(data.phone);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    await execute(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);
    return this.findById(id);
  }

  // Find or create user by openid
  static async findOrCreate(data: CreateUserDTO): Promise<{ user: User; isNew: boolean }> {
    const existingUser = await this.findByOpenid(data.openid);
    if (existingUser) {
      return { user: existingUser, isNew: false };
    }
    const newUser = await this.create(data);
    return { user: newUser, isNew: true };
  }

  // Update user balance
  static async updateBalance(id: string, amount: number): Promise<User | null> {
    await execute('UPDATE users SET balance = balance + ? WHERE id = ?', [amount, id]);
    return this.findById(id);
  }

  // Update user points
  static async updatePoints(id: string, points: number): Promise<User | null> {
    await execute('UPDATE users SET points = points + ? WHERE id = ?', [points, id]);
    return this.findById(id);
  }

  // Get user balance
  static async getBalance(id: string): Promise<number | null> {
    const user = await this.findById(id);
    return user ? user.balance : null;
  }

  // Get user points
  static async getPoints(id: string): Promise<number | null> {
    const user = await this.findById(id);
    return user ? user.points : null;
  }

  // Update user member level
  static async updateMemberLevel(id: string, memberLevel: MemberLevel): Promise<User | null> {
    await execute('UPDATE users SET member_level = ? WHERE id = ?', [memberLevel, id]);
    return this.findById(id);
  }
}
