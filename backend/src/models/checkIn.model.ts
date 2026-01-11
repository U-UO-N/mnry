import { v4 as uuidv4 } from 'uuid';
import { query, execute } from '../database/mysql';
import { RowDataPacket } from 'mysql2/promise';

// Check-in interface
export interface CheckIn {
  id: string;
  userId: string;
  checkInDate: string; // YYYY-MM-DD format
  pointsEarned: number;
  consecutiveDays: number;
  createdAt: Date;
}

// Check-in status interface
export interface CheckInStatus {
  hasCheckedInToday: boolean;
  consecutiveDays: number;
  lastCheckInDate: string | null;
  todayPoints: number;
}

// Database row type
interface CheckInRow extends RowDataPacket {
  id: string;
  user_id: string;
  check_in_date: string;
  points_earned: number;
  consecutive_days: number;
  created_at: Date;
}

// DTO for creating check-in
export interface CreateCheckInDTO {
  userId: string;
  checkInDate: string;
  pointsEarned: number;
  consecutiveDays: number;
}

// Map function
const mapRowToCheckIn = (row: CheckInRow): CheckIn => ({
  id: row.id,
  userId: row.user_id,
  checkInDate: row.check_in_date,
  pointsEarned: row.points_earned,
  consecutiveDays: row.consecutive_days,
  createdAt: row.created_at,
});

// Check-in Model
export class CheckInModel {
  static async findById(id: string): Promise<CheckIn | null> {
    const rows = await query<CheckInRow[]>('SELECT * FROM check_ins WHERE id = ?', [id]);
    return rows.length > 0 ? mapRowToCheckIn(rows[0]) : null;
  }

  static async findByUserAndDate(userId: string, date: string): Promise<CheckIn | null> {
    const rows = await query<CheckInRow[]>(
      'SELECT * FROM check_ins WHERE user_id = ? AND check_in_date = ?',
      [userId, date]
    );
    return rows.length > 0 ? mapRowToCheckIn(rows[0]) : null;
  }

  static async findLatestByUser(userId: string): Promise<CheckIn | null> {
    const rows = await query<CheckInRow[]>(
      'SELECT * FROM check_ins WHERE user_id = ? ORDER BY check_in_date DESC LIMIT 1',
      [userId]
    );
    return rows.length > 0 ? mapRowToCheckIn(rows[0]) : null;
  }

  static async findByUserInDateRange(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<CheckIn[]> {
    const rows = await query<CheckInRow[]>(
      'SELECT * FROM check_ins WHERE user_id = ? AND check_in_date BETWEEN ? AND ? ORDER BY check_in_date DESC',
      [userId, startDate, endDate]
    );
    return rows.map(mapRowToCheckIn);
  }

  static async create(data: CreateCheckInDTO): Promise<CheckIn> {
    const id = uuidv4();
    await execute(
      `INSERT INTO check_ins (id, user_id, check_in_date, points_earned, consecutive_days)
       VALUES (?, ?, ?, ?, ?)`,
      [id, data.userId, data.checkInDate, data.pointsEarned, data.consecutiveDays]
    );
    const checkIn = await this.findById(id);
    if (!checkIn) throw new Error('Failed to create check-in record');
    return checkIn;
  }

  static async getConsecutiveDays(userId: string): Promise<number> {
    const latest = await this.findLatestByUser(userId);
    if (!latest) return 0;

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // If last check-in was today, return current consecutive days
    if (latest.checkInDate === todayStr) {
      return latest.consecutiveDays;
    }

    // If last check-in was yesterday, return consecutive days (will be incremented on next check-in)
    if (latest.checkInDate === yesterdayStr) {
      return latest.consecutiveDays;
    }

    // Otherwise, streak is broken
    return 0;
  }

  static async getCheckInStatus(userId: string): Promise<CheckInStatus> {
    const today = new Date().toISOString().split('T')[0];
    const todayCheckIn = await this.findByUserAndDate(userId, today);
    const latest = await this.findLatestByUser(userId);

    let consecutiveDays = 0;
    if (latest) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      if (latest.checkInDate === today) {
        consecutiveDays = latest.consecutiveDays;
      } else if (latest.checkInDate === yesterdayStr) {
        consecutiveDays = latest.consecutiveDays;
      }
    }

    return {
      hasCheckedInToday: !!todayCheckIn,
      consecutiveDays,
      lastCheckInDate: latest?.checkInDate || null,
      todayPoints: todayCheckIn?.pointsEarned || 0,
    };
  }
}
