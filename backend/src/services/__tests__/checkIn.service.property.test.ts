/**
 * Property-Based Tests for Check-In Service
 * 
 * Feature: ecommerce-miniprogram
 * Property 15: Check-in Points Increase Correctness
 * Validates: Requirements 8.2
 * 
 * For any check-in operation, user points should increase by the corresponding value,
 * and check-in status should be updated to checked-in.
 * 
 * Property 16: Check-in Idempotency
 * Validates: Requirements 8.3
 * 
 * For any user, multiple check-in requests on the same day should only take effect once,
 * and points should only increase once.
 */

import * as fc from 'fast-check';
import { CheckInService } from '../checkIn.service';
import { RecordType } from '../../models/benefits.model';

// In-memory stores for testing
const users = new Map<string, {
  id: string;
  openid: string;
  nickname: string | null;
  avatar: string | null;
  phone: string | null;
  member_level: string;
  balance: string;
  points: number;
  created_at: Date;
  updated_at: Date;
}>();

const checkIns = new Map<string, {
  id: string;
  user_id: string;
  check_in_date: string;
  points_earned: number;
  consecutive_days: number;
  created_at: Date;
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

// Mock the database module
jest.mock('../../database/mysql', () => {
  return {
    query: jest.fn(async (sql: string, params?: unknown[]) => {
      // User queries
      if (sql.includes('SELECT * FROM users WHERE id = ?')) {
        const id = params?.[0] as string;
        const user = users.get(id);
        return user ? [user] : [];
      }

      // Check-in by id
      if (sql.includes('SELECT * FROM check_ins WHERE id = ?')) {
        const id = params?.[0] as string;
        const checkIn = checkIns.get(id);
        return checkIn ? [checkIn] : [];
      }

      // Check-in by user and date
      if (sql.includes('SELECT * FROM check_ins WHERE user_id = ? AND check_in_date = ?')) {
        const [userId, date] = params as [string, string];
        for (const ci of checkIns.values()) {
          if (ci.user_id === userId && ci.check_in_date === date) {
            return [ci];
          }
        }
        return [];
      }

      // Latest check-in by user
      if (sql.includes('SELECT * FROM check_ins WHERE user_id = ? ORDER BY check_in_date DESC LIMIT 1')) {
        const userId = params?.[0] as string;
        let latest: {
          id: string;
          user_id: string;
          check_in_date: string;
          points_earned: number;
          consecutive_days: number;
          created_at: Date;
        } | null = null;
        for (const ci of checkIns.values()) {
          if (ci.user_id === userId) {
            if (!latest || ci.check_in_date > latest.check_in_date) {
              latest = ci;
            }
          }
        }
        return latest ? [latest] : [];
      }

      // Check-ins in date range
      if (sql.includes('SELECT * FROM check_ins WHERE user_id = ? AND check_in_date BETWEEN')) {
        const [userId, startDate, endDate] = params as [string, string, string];
        const results: {
          id: string;
          user_id: string;
          check_in_date: string;
          points_earned: number;
          consecutive_days: number;
          created_at: Date;
        }[] = [];
        for (const ci of checkIns.values()) {
          if (ci.user_id === userId && ci.check_in_date >= startDate && ci.check_in_date <= endDate) {
            results.push(ci);
          }
        }
        return results.sort((a, b) => 
          b.check_in_date.localeCompare(a.check_in_date)
        );
      }

      // Points record by id
      if (sql.includes('SELECT * FROM points_records WHERE id = ?')) {
        const id = params?.[0] as string;
        const record = pointsRecords.get(id);
        return record ? [record] : [];
      }

      return [];
    }),
    execute: jest.fn(async (sql: string, params?: unknown[]) => {
      // Insert check-in
      if (sql.includes('INSERT INTO check_ins')) {
        const [id, userId, checkInDate, pointsEarned, consecutiveDays] = params as [
          string, string, string, number, number
        ];
        const now = new Date();
        checkIns.set(id, {
          id,
          user_id: userId,
          check_in_date: checkInDate,
          points_earned: pointsEarned,
          consecutive_days: consecutiveDays,
          created_at: now,
        });
        return { affectedRows: 1 };
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

      // Update user points
      if (sql.includes('UPDATE users SET points = points +')) {
        const [points, id] = params as [number, string];
        const user = users.get(id);
        if (user) {
          user.points += points;
        }
        return { affectedRows: user ? 1 : 0 };
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

// Helper to create test data
const createTestUser = (id: string, initialPoints: number = 0) => {
  const now = new Date();
  users.set(id, {
    id,
    openid: `openid-${id}`,
    nickname: 'Test User',
    avatar: null,
    phone: null,
    member_level: 'normal',
    balance: '100.00',
    points: initialPoints,
    created_at: now,
    updated_at: now,
  });
};

// Helper to create a check-in record
const createTestCheckIn = (
  id: string,
  userId: string,
  checkInDate: string,
  pointsEarned: number,
  consecutiveDays: number
) => {
  const now = new Date();
  checkIns.set(id, {
    id,
    user_id: userId,
    check_in_date: checkInDate,
    points_earned: pointsEarned,
    consecutive_days: consecutiveDays,
    created_at: now,
  });
};

describe('Check-In Service Property Tests', () => {
  beforeEach(() => {
    // Clear all stores before each test
    users.clear();
    checkIns.clear();
    pointsRecords.clear();
    jest.clearAllMocks();
  });

  /**
   * Property 15: Check-in Points Increase Correctness
   * 
   * For any check-in operation, user points should increase by the corresponding value,
   * and check-in status should be updated to checked-in.
   * 
   * Validates: Requirements 8.2
   */
  describe('Property 15: Check-in Points Increase Correctness', () => {
    it('check-in should increase user points by the earned amount', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate initial points
          fc.integer({ min: 0, max: 10000 }),
          async (initialPoints) => {
            // Setup test user
            const userId = `user-${Date.now()}-${Math.random()}`;
            createTestUser(userId, initialPoints);

            // Get initial user state
            const userBefore = users.get(userId)!;
            const pointsBefore = userBefore.points;

            // Perform check-in
            const result = await CheckInService.checkIn(userId);

            // Verify check-in was successful
            expect(result.success).toBe(true);
            expect(result.pointsEarned).toBeGreaterThan(0);

            // Verify user points increased by the earned amount
            const userAfter = users.get(userId)!;
            expect(userAfter.points).toBe(pointsBefore + result.pointsEarned);

            // Verify check-in record was created
            expect(result.checkIn).toBeDefined();
            expect(result.checkIn!.pointsEarned).toBe(result.pointsEarned);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('check-in status should be updated to checked-in', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 10000 }),
          async (initialPoints) => {
            // Setup test user
            const userId = `user-status-${Date.now()}-${Math.random()}`;
            createTestUser(userId, initialPoints);

            // Verify not checked in before
            const statusBefore = await CheckInService.getCheckInStatus(userId);
            expect(statusBefore).not.toBeNull();
            expect(statusBefore!.hasCheckedInToday).toBe(false);

            // Perform check-in
            const result = await CheckInService.checkIn(userId);
            expect(result.success).toBe(true);

            // Verify checked in after
            const statusAfter = await CheckInService.getCheckInStatus(userId);
            expect(statusAfter).not.toBeNull();
            expect(statusAfter!.hasCheckedInToday).toBe(true);
            expect(statusAfter!.todayPoints).toBe(result.pointsEarned);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('consecutive days should increase points bonus', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate consecutive days (1-7)
          fc.integer({ min: 1, max: 7 }),
          async (previousConsecutiveDays) => {
            // Setup test user
            const userId = `user-consec-${Date.now()}-${Math.random()}`;
            createTestUser(userId, 0);

            // Create a check-in from yesterday with the specified consecutive days
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];
            
            createTestCheckIn(
              `ci-yesterday-${Date.now()}-${Math.random()}`,
              userId,
              yesterdayStr,
              10 + (previousConsecutiveDays - 1) * 2, // Previous points
              previousConsecutiveDays
            );

            // Perform check-in today
            const result = await CheckInService.checkIn(userId);

            // Verify check-in was successful
            expect(result.success).toBe(true);

            // Verify consecutive days increased
            expect(result.consecutiveDays).toBe(previousConsecutiveDays + 1);

            // Verify points earned follows the formula: base (10) + (days - 1) * 2, max 30
            const expectedPoints = Math.min(10 + (result.consecutiveDays - 1) * 2, 30);
            expect(result.pointsEarned).toBe(expectedPoints);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 16: Check-in Idempotency
   * 
   * For any user, multiple check-in requests on the same day should only take effect once,
   * and points should only increase once.
   * 
   * Validates: Requirements 8.3
   */
  describe('Property 16: Check-in Idempotency', () => {
    it('multiple check-ins on the same day should only increase points once', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate number of check-in attempts (2-10)
          fc.integer({ min: 2, max: 10 }),
          // Generate initial points
          fc.integer({ min: 0, max: 10000 }),
          async (attempts, initialPoints) => {
            // Setup test user
            const userId = `user-idem-${Date.now()}-${Math.random()}`;
            createTestUser(userId, initialPoints);

            // First check-in should succeed
            const firstResult = await CheckInService.checkIn(userId);
            expect(firstResult.success).toBe(true);
            const pointsAfterFirst = users.get(userId)!.points;

            // Subsequent check-ins should fail
            for (let i = 1; i < attempts; i++) {
              const result = await CheckInService.checkIn(userId);
              expect(result.success).toBe(false);
              expect(result.message).toBe('Already checked in today');
              
              // Points should not change
              const currentPoints = users.get(userId)!.points;
              expect(currentPoints).toBe(pointsAfterFirst);
            }

            // Final verification: points should only have increased once
            const finalPoints = users.get(userId)!.points;
            expect(finalPoints).toBe(initialPoints + firstResult.pointsEarned);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('check-in status should remain checked-in after multiple attempts', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate number of check-in attempts (2-5)
          fc.integer({ min: 2, max: 5 }),
          async (attempts) => {
            // Setup test user
            const userId = `user-status-idem-${Date.now()}-${Math.random()}`;
            createTestUser(userId, 0);

            // First check-in
            const firstResult = await CheckInService.checkIn(userId);
            expect(firstResult.success).toBe(true);

            // Verify status after first check-in
            const statusAfterFirst = await CheckInService.getCheckInStatus(userId);
            expect(statusAfterFirst!.hasCheckedInToday).toBe(true);
            const consecutiveDaysAfterFirst = statusAfterFirst!.consecutiveDays;

            // Multiple subsequent attempts
            for (let i = 1; i < attempts; i++) {
              await CheckInService.checkIn(userId);
              
              // Status should remain the same
              const status = await CheckInService.getCheckInStatus(userId);
              expect(status!.hasCheckedInToday).toBe(true);
              expect(status!.consecutiveDays).toBe(consecutiveDaysAfterFirst);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('only one check-in record should be created per day', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate number of check-in attempts (2-10)
          fc.integer({ min: 2, max: 10 }),
          async (attempts) => {
            // Setup test user
            const userId = `user-record-${Date.now()}-${Math.random()}`;
            createTestUser(userId, 0);

            // Perform multiple check-in attempts
            for (let i = 0; i < attempts; i++) {
              await CheckInService.checkIn(userId);
            }

            // Count check-in records for this user today
            const today = new Date().toISOString().split('T')[0];
            let recordCount = 0;
            for (const ci of checkIns.values()) {
              if (ci.user_id === userId && ci.check_in_date === today) {
                recordCount++;
              }
            }

            // Should only have one record
            expect(recordCount).toBe(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('failed check-in attempts should return the existing check-in data', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 10000 }),
          async (initialPoints) => {
            // Setup test user
            const userId = `user-existing-${Date.now()}-${Math.random()}`;
            createTestUser(userId, initialPoints);

            // First check-in
            const firstResult = await CheckInService.checkIn(userId);
            expect(firstResult.success).toBe(true);

            // Second check-in should fail but return existing data
            const secondResult = await CheckInService.checkIn(userId);
            expect(secondResult.success).toBe(false);
            expect(secondResult.checkIn).toBeDefined();
            expect(secondResult.checkIn!.id).toBe(firstResult.checkIn!.id);
            expect(secondResult.consecutiveDays).toBe(firstResult.consecutiveDays);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});