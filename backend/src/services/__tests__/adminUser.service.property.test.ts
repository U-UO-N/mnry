/**
 * Property-Based Tests for Admin User Service
 * 
 * Feature: ecommerce-miniprogram
 * Property 31: User Points/Balance Adjustment Log Correctness
 * Validates: Requirements 18.3
 * 
 * For any points or balance adjustment operation, a corresponding operation log
 * record should be generated.
 */

import * as fc from 'fast-check';
import { MemberLevel } from '../../models/user.model';
import { RecordType } from '../../models/benefits.model';
import { AdminUserService } from '../adminUser.service';

// In-memory stores for testing
const users = new Map<string, {
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
}>();

const pointsRecords = new Map<string, {
  id: string;
  user_id: string;
  type: RecordType;
  points: number;
  balance: number;
  description: string;
  related_id: string | null;
  created_at: Date;
}>();

const balanceRecords = new Map<string, {
  id: string;
  user_id: string;
  type: RecordType;
  amount: string;
  balance: string;
  description: string;
  related_id: string | null;
  created_at: Date;
}>();

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => `uuid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`),
}));

// Mock the database module
jest.mock('../../database/mysql', () => {
  return {
    query: jest.fn(async (sql: string, params?: unknown[]) => {
      // Find user by ID
      if (sql.includes('SELECT * FROM users WHERE id = ?')) {
        const id = params?.[0] as string;
        const user = users.get(id);
        return user ? [user] : [];
      }

      // Find points record by ID
      if (sql.includes('SELECT * FROM points_records WHERE id = ?')) {
        const id = params?.[0] as string;
        const record = pointsRecords.get(id);
        return record ? [record] : [];
      }

      // Find balance record by ID
      if (sql.includes('SELECT * FROM balance_records WHERE id = ?')) {
        const id = params?.[0] as string;
        const record = balanceRecords.get(id);
        return record ? [record] : [];
      }

      // Find points records by user
      if (sql.includes('SELECT * FROM points_records WHERE') && sql.includes('user_id = ?')) {
        const userId = params?.[0] as string;
        const results: unknown[] = [];
        for (const record of pointsRecords.values()) {
          if (record.user_id === userId) {
            results.push(record);
          }
        }
        return results;
      }

      // Find balance records by user
      if (sql.includes('SELECT * FROM balance_records WHERE') && sql.includes('user_id = ?')) {
        const userId = params?.[0] as string;
        const results: unknown[] = [];
        for (const record of balanceRecords.values()) {
          if (record.user_id === userId) {
            results.push(record);
          }
        }
        return results;
      }

      // Count points records
      if (sql.includes('SELECT COUNT(*) as total FROM points_records')) {
        const userId = params?.[0] as string;
        let count = 0;
        for (const record of pointsRecords.values()) {
          if (record.user_id === userId) {
            count++;
          }
        }
        return [{ total: count }];
      }

      // Count balance records
      if (sql.includes('SELECT COUNT(*) as total FROM balance_records')) {
        const userId = params?.[0] as string;
        let count = 0;
        for (const record of balanceRecords.values()) {
          if (record.user_id === userId) {
            count++;
          }
        }
        return [{ total: count }];
      }

      return [];
    }),
    execute: jest.fn(async (sql: string, params?: unknown[]) => {
      // Update user points
      if (sql.includes('UPDATE users SET points = points +')) {
        const [points, id] = params as [number, string];
        const user = users.get(id);
        if (user) {
          user.points = user.points + points;
          user.updated_at = new Date();
        }
        return { affectedRows: user ? 1 : 0 };
      }

      // Update user balance
      if (sql.includes('UPDATE users SET balance = balance +')) {
        const [amount, id] = params as [number, string];
        const user = users.get(id);
        if (user) {
          const newBalance = parseFloat(user.balance) + amount;
          user.balance = newBalance.toFixed(2);
          user.updated_at = new Date();
        }
        return { affectedRows: user ? 1 : 0 };
      }

      // Insert points record
      if (sql.includes('INSERT INTO points_records')) {
        const [id, userId, type, points, balance, description, relatedId] = params as [
          string, string, RecordType, number, number, string, string | null
        ];
        const now = new Date();
        pointsRecords.set(id, {
          id,
          user_id: userId,
          type,
          points,
          balance,
          description,
          related_id: relatedId,
          created_at: now,
        });
        return { affectedRows: 1 };
      }

      // Insert balance record
      if (sql.includes('INSERT INTO balance_records')) {
        const [id, userId, type, amount, balance, description, relatedId] = params as [
          string, string, RecordType, number, number, string, string | null
        ];
        const now = new Date();
        balanceRecords.set(id, {
          id,
          user_id: userId,
          type,
          amount: amount.toString(),
          balance: balance.toString(),
          description,
          related_id: relatedId,
          created_at: now,
        });
        return { affectedRows: 1 };
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

// Helper function to create a test user
const createTestUser = (id: string, initialPoints: number = 0, initialBalance: number = 0) => {
  const now = new Date();
  users.set(id, {
    id,
    openid: `openid-${id}`,
    nickname: `User ${id}`,
    avatar: null,
    phone: null,
    member_level: MemberLevel.NORMAL,
    balance: initialBalance.toFixed(2),
    points: initialPoints,
    created_at: now,
    updated_at: now,
  });
};

// Helper to get points records for a user
const getPointsRecordsForUser = (userId: string) => {
  const records: typeof pointsRecords extends Map<string, infer V> ? V[] : never = [];
  for (const record of pointsRecords.values()) {
    if (record.user_id === userId) {
      records.push(record);
    }
  }
  return records;
};

// Helper to get balance records for a user
const getBalanceRecordsForUser = (userId: string) => {
  const records: typeof balanceRecords extends Map<string, infer V> ? V[] : never = [];
  for (const record of balanceRecords.values()) {
    if (record.user_id === userId) {
      records.push(record);
    }
  }
  return records;
};

describe('Admin User Service Property Tests', () => {
  beforeEach(() => {
    // Clear all stores before each test
    users.clear();
    pointsRecords.clear();
    balanceRecords.clear();
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clear all stores after each test
    users.clear();
    pointsRecords.clear();
    balanceRecords.clear();
  });

  /**
   * Property 31: User Points/Balance Adjustment Log Correctness
   * 
   * For any points or balance adjustment operation, a corresponding operation log
   * record should be generated.
   * 
   * Validates: Requirements 18.3
   */
  describe('Property 31: User Points/Balance Adjustment Log Correctness', () => {
    it('points adjustment should always create a corresponding log record', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate points adjustment data
          fc.record({
            initialPoints: fc.integer({ min: 0, max: 10000 }),
            adjustmentPoints: fc.integer({ min: -1000, max: 1000 }),
            reason: fc.string({ minLength: 1, maxLength: 100 }),
          }),
          async ({ initialPoints, adjustmentPoints, reason }) => {
            // Clear stores for this iteration
            users.clear();
            pointsRecords.clear();
            balanceRecords.clear();

            // Create a test user with initial points
            const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            createTestUser(userId, initialPoints, 0);

            // Count records before adjustment
            const recordsBefore = getPointsRecordsForUser(userId).length;

            // Perform points adjustment
            const result = await AdminUserService.adjustPoints(userId, {
              points: adjustmentPoints,
              reason,
              adminId: 'admin-test',
            });

            // Count records after adjustment
            const recordsAfter = getPointsRecordsForUser(userId);

            // Verify a new record was created
            expect(recordsAfter.length).toBe(recordsBefore + 1);

            // Verify the record contains correct data
            const newRecord = recordsAfter[recordsAfter.length - 1];
            expect(newRecord.user_id).toBe(userId);
            expect(newRecord.type).toBe(RecordType.ADMIN_ADJUST);
            expect(newRecord.points).toBe(adjustmentPoints);
            expect(newRecord.description).toContain(reason);
            expect(newRecord.related_id).toBe('admin-test');

            // Verify the returned record matches
            expect(result.record.points).toBe(adjustmentPoints);
            expect(result.record.type).toBe(RecordType.ADMIN_ADJUST);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('balance adjustment should always create a corresponding log record', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate balance adjustment data
          fc.record({
            initialBalance: fc.float({ min: 0, max: 10000, noNaN: true }),
            adjustmentAmount: fc.float({ min: -1000, max: 1000, noNaN: true }),
            reason: fc.string({ minLength: 1, maxLength: 100 }),
          }),
          async ({ initialBalance, adjustmentAmount, reason }) => {
            // Clear stores for this iteration
            users.clear();
            pointsRecords.clear();
            balanceRecords.clear();

            // Round to 2 decimal places
            const roundedInitial = Math.round(initialBalance * 100) / 100;
            const roundedAdjustment = Math.round(adjustmentAmount * 100) / 100;

            // Create a test user with initial balance
            const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            createTestUser(userId, 0, roundedInitial);

            // Count records before adjustment
            const recordsBefore = getBalanceRecordsForUser(userId).length;

            // Perform balance adjustment
            const result = await AdminUserService.adjustBalance(userId, {
              amount: roundedAdjustment,
              reason,
              adminId: 'admin-test',
            });

            // Count records after adjustment
            const recordsAfter = getBalanceRecordsForUser(userId);

            // Verify a new record was created
            expect(recordsAfter.length).toBe(recordsBefore + 1);

            // Verify the record contains correct data
            const newRecord = recordsAfter[recordsAfter.length - 1];
            expect(newRecord.user_id).toBe(userId);
            expect(newRecord.type).toBe(RecordType.ADMIN_ADJUST);
            expect(parseFloat(newRecord.amount)).toBeCloseTo(roundedAdjustment, 2);
            expect(newRecord.description).toContain(reason);
            expect(newRecord.related_id).toBe('admin-test');

            // Verify the returned record matches
            expect(result.record.amount).toBeCloseTo(roundedAdjustment, 2);
            expect(result.record.type).toBe(RecordType.ADMIN_ADJUST);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('multiple adjustments should create multiple log records', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate multiple adjustments
          fc.record({
            pointsAdjustments: fc.array(
              fc.record({
                points: fc.integer({ min: -100, max: 100 }),
                reason: fc.string({ minLength: 1, maxLength: 50 }),
              }),
              { minLength: 1, maxLength: 10 }
            ),
            balanceAdjustments: fc.array(
              fc.record({
                amount: fc.float({ min: -100, max: 100, noNaN: true }),
                reason: fc.string({ minLength: 1, maxLength: 50 }),
              }),
              { minLength: 1, maxLength: 10 }
            ),
          }),
          async ({ pointsAdjustments, balanceAdjustments }) => {
            // Clear stores for this iteration
            users.clear();
            pointsRecords.clear();
            balanceRecords.clear();

            // Create a test user
            const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            createTestUser(userId, 1000, 1000);

            // Perform all points adjustments
            for (const adj of pointsAdjustments) {
              await AdminUserService.adjustPoints(userId, {
                points: adj.points,
                reason: adj.reason,
                adminId: 'admin-test',
              });
            }

            // Perform all balance adjustments
            for (const adj of balanceAdjustments) {
              const roundedAmount = Math.round(adj.amount * 100) / 100;
              await AdminUserService.adjustBalance(userId, {
                amount: roundedAmount,
                reason: adj.reason,
                adminId: 'admin-test',
              });
            }

            // Verify correct number of records
            const pointsRecordsCount = getPointsRecordsForUser(userId).length;
            const balanceRecordsCount = getBalanceRecordsForUser(userId).length;

            expect(pointsRecordsCount).toBe(pointsAdjustments.length);
            expect(balanceRecordsCount).toBe(balanceAdjustments.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('log record balance should reflect the new balance after adjustment', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate adjustment sequence
          fc.record({
            initialPoints: fc.integer({ min: 100, max: 1000 }),
            adjustments: fc.array(
              fc.integer({ min: -50, max: 50 }),
              { minLength: 1, maxLength: 5 }
            ),
          }),
          async ({ initialPoints, adjustments }) => {
            // Clear stores for this iteration
            users.clear();
            pointsRecords.clear();
            balanceRecords.clear();

            // Create a test user
            const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            createTestUser(userId, initialPoints, 0);

            let expectedBalance = initialPoints;

            // Perform adjustments and verify balance in records
            for (const points of adjustments) {
              expectedBalance += points;

              const result = await AdminUserService.adjustPoints(userId, {
                points,
                reason: 'Test adjustment',
                adminId: 'admin-test',
              });

              // The record's balance should be the new balance after adjustment
              expect(result.record.balance).toBe(expectedBalance);
            }

            // Verify final user points
            const finalUser = users.get(userId);
            expect(finalUser?.points).toBe(expectedBalance);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
