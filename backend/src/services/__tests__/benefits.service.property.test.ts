/**
 * Property-Based Tests for Benefits Service
 * 
 * Feature: ecommerce-miniprogram
 * Property 13: Coupon Status Classification Correctness
 * Validates: Requirements 7.4
 * 
 * For any coupon list query with a status filter, all returned coupons
 * must have a status matching the filter condition.
 */

import * as fc from 'fast-check';
import { CouponStatus, CouponType } from '../../models/benefits.model';
import { BenefitsService } from '../benefits.service';

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

const coupons = new Map<string, {
  id: string;
  name: string;
  type: CouponType;
  value: string;
  min_amount: string;
  total_count: number;
  used_count: number;
  start_time: Date;
  end_time: Date;
  is_active: number;
  created_at: Date;
  updated_at: Date;
}>();

const userCoupons = new Map<string, {
  id: string;
  user_id: string;
  coupon_id: string;
  status: CouponStatus;
  used_at: Date | null;
  order_id: string | null;
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

      // User coupon count query
      if (sql.includes('SELECT COUNT(*) as count FROM user_coupons')) {
        const userId = params?.[0] as string;
        let count = 0;
        for (const uc of userCoupons.values()) {
          if (uc.user_id === userId) {
            if (params?.length === 1) {
              count++;
            } else if (params?.[1] === uc.status) {
              count++;
            }
          }
        }
        return [{ count }];
      }

      // User coupon total count query
      if (sql.includes('SELECT COUNT(*) as total FROM user_coupons')) {
        const userId = params?.[0] as string;
        let count = 0;
        for (const uc of userCoupons.values()) {
          if (uc.user_id === userId) {
            if (params?.length === 1) {
              count++;
            } else if (params?.[1] === uc.status) {
              count++;
            }
          }
        }
        return [{ total: count }];
      }

      // User coupons with join query
      if (sql.includes('SELECT uc.*, c.name as coupon_name')) {
        const userId = params?.[0] as string;
        const results: unknown[] = [];
        
        // Check if status filter is present in the SQL query
        const hasStatusFilter = sql.includes('uc.status = ?');
        const statusParam = hasStatusFilter && params ? params[1] as CouponStatus : undefined;
        
        for (const uc of userCoupons.values()) {
          if (uc.user_id === userId) {
            // Check status filter if present in query
            if (hasStatusFilter && statusParam !== uc.status) {
              continue;
            }
            
            const coupon = coupons.get(uc.coupon_id);
            if (coupon) {
              results.push({
                id: uc.id,
                user_id: uc.user_id,
                coupon_id: uc.coupon_id,
                status: uc.status,
                used_at: uc.used_at,
                order_id: uc.order_id,
                created_at: uc.created_at,
                coupon_name: coupon.name,
                coupon_type: coupon.type,
                coupon_value: coupon.value,
                coupon_min_amount: coupon.min_amount,
                coupon_start_time: coupon.start_time,
                coupon_end_time: coupon.end_time,
              });
            }
          }
        }
        
        return results;
      }

      // Single user coupon query
      if (sql.includes('SELECT * FROM user_coupons WHERE user_id = ? AND coupon_id = ?')) {
        const [userId, couponId] = params as [string, string];
        for (const uc of userCoupons.values()) {
          if (uc.user_id === userId && uc.coupon_id === couponId) {
            return [uc];
          }
        }
        return [];
      }

      // Coupon query
      if (sql.includes('SELECT * FROM coupons WHERE id = ?')) {
        const id = params?.[0] as string;
        const coupon = coupons.get(id);
        return coupon ? [coupon] : [];
      }

      return [];
    }),
    execute: jest.fn(async (sql: string, params?: unknown[]) => {
      // Insert user
      if (sql.includes('INSERT INTO users')) {
        const [id, openid, nickname, avatar] = params as [string, string, string | null, string | null];
        const now = new Date();
        users.set(id, {
          id,
          openid,
          nickname,
          avatar,
          phone: null,
          member_level: 'normal',
          balance: '0.00',
          points: 0,
          created_at: now,
          updated_at: now,
        });
        return { affectedRows: 1 };
      }

      // Insert coupon
      if (sql.includes('INSERT INTO coupons')) {
        const [id, name, type, value, minAmount, totalCount, startTime, endTime] = params as [
          string, string, CouponType, number, number, number, Date, Date
        ];
        const now = new Date();
        coupons.set(id, {
          id,
          name,
          type,
          value: value.toString(),
          min_amount: minAmount.toString(),
          total_count: totalCount,
          used_count: 0,
          start_time: startTime,
          end_time: endTime,
          is_active: 1,
          created_at: now,
          updated_at: now,
        });
        return { affectedRows: 1 };
      }

      // Insert user coupon
      if (sql.includes('INSERT INTO user_coupons')) {
        const [id, userId, couponId, status] = params as [string, string, string, CouponStatus];
        const now = new Date();
        userCoupons.set(id, {
          id,
          user_id: userId,
          coupon_id: couponId,
          status,
          used_at: null,
          order_id: null,
          created_at: now,
        });
        return { affectedRows: 1 };
      }

      // Update user coupon status
      if (sql.includes('UPDATE user_coupons SET status = ?')) {
        const status = params?.[0] as CouponStatus;
        const id = params?.[params.length - 1] as string;
        const uc = userCoupons.get(id);
        if (uc) {
          uc.status = status;
          if (status === CouponStatus.USED) {
            uc.used_at = new Date();
            uc.order_id = params?.[2] as string;
          }
        }
        return { affectedRows: uc ? 1 : 0 };
      }

      // Update coupon used count
      if (sql.includes('UPDATE coupons SET used_count = used_count + 1')) {
        const id = params?.[0] as string;
        const coupon = coupons.get(id);
        if (coupon) {
          coupon.used_count++;
        }
        return { affectedRows: coupon ? 1 : 0 };
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
const createTestUser = (id: string) => {
  const now = new Date();
  users.set(id, {
    id,
    openid: `openid-${id}`,
    nickname: 'Test User',
    avatar: null,
    phone: null,
    member_level: 'normal',
    balance: '100.00',
    points: 1000,
    created_at: now,
    updated_at: now,
  });
};

const createTestCoupon = (id: string, endTime: Date) => {
  const now = new Date();
  const startTime = new Date(now.getTime() - 86400000); // 1 day ago
  coupons.set(id, {
    id,
    name: `Coupon ${id}`,
    type: CouponType.FIXED,
    value: '10.00',
    min_amount: '50.00',
    total_count: 100,
    used_count: 0,
    start_time: startTime,
    end_time: endTime,
    is_active: 1,
    created_at: now,
    updated_at: now,
  });
};

const createTestUserCoupon = (id: string, userId: string, couponId: string, status: CouponStatus) => {
  const now = new Date();
  userCoupons.set(id, {
    id,
    user_id: userId,
    coupon_id: couponId,
    status,
    used_at: status === CouponStatus.USED ? now : null,
    order_id: status === CouponStatus.USED ? 'order-123' : null,
    created_at: now,
  });
};

describe('Benefits Service Property Tests', () => {
  beforeEach(() => {
    // Clear all stores before each test
    users.clear();
    coupons.clear();
    userCoupons.clear();
    jest.clearAllMocks();
  });

  /**
   * Property 13: Coupon Status Classification Correctness
   * 
   * For any coupon list query with a status filter, all returned coupons
   * must have a status matching the filter condition (available/used/expired).
   * 
   * Validates: Requirements 7.4
   */
  describe('Property 13: Coupon Status Classification Correctness', () => {
    it('all returned coupons should match the requested status filter', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate test scenario
          fc.record({
            availableCount: fc.integer({ min: 0, max: 10 }),
            usedCount: fc.integer({ min: 0, max: 10 }),
            expiredCount: fc.integer({ min: 0, max: 10 }),
            filterStatus: fc.constantFrom(
              CouponStatus.AVAILABLE,
              CouponStatus.USED,
              CouponStatus.EXPIRED
            ),
          }),
          async ({ availableCount, usedCount, expiredCount, filterStatus }) => {
            // Setup test user
            const userId = `user-${Date.now()}-${Math.random()}`;
            createTestUser(userId);

            // Create coupons with different statuses
            const now = new Date();
            const futureDate = new Date(now.getTime() + 86400000 * 30); // 30 days from now
            const pastDate = new Date(now.getTime() - 86400000); // 1 day ago

            // Create available coupons (not expired, status = available)
            for (let i = 0; i < availableCount; i++) {
              const couponId = `coupon-available-${i}-${Date.now()}-${Math.random()}`;
              createTestCoupon(couponId, futureDate);
              createTestUserCoupon(
                `uc-available-${i}-${Date.now()}-${Math.random()}`,
                userId,
                couponId,
                CouponStatus.AVAILABLE
              );
            }

            // Create used coupons
            for (let i = 0; i < usedCount; i++) {
              const couponId = `coupon-used-${i}-${Date.now()}-${Math.random()}`;
              createTestCoupon(couponId, futureDate);
              createTestUserCoupon(
                `uc-used-${i}-${Date.now()}-${Math.random()}`,
                userId,
                couponId,
                CouponStatus.USED
              );
            }

            // Create expired coupons (coupon end_time is in the past, but status is still 'available')
            // The service should compute the status as 'expired' based on end_time
            for (let i = 0; i < expiredCount; i++) {
              const couponId = `coupon-expired-${i}-${Date.now()}-${Math.random()}`;
              createTestCoupon(couponId, pastDate); // Expired coupon
              createTestUserCoupon(
                `uc-expired-${i}-${Date.now()}-${Math.random()}`,
                userId,
                couponId,
                CouponStatus.AVAILABLE // Status in DB is available, but should be computed as expired
              );
            }

            // Query coupons with status filter
            const result = await BenefitsService.getUserCoupons(userId, filterStatus, 1, 100);

            // Verify all returned coupons match the filter status
            for (const coupon of result.items) {
              expect(coupon.computedStatus).toBe(filterStatus);
            }

            // Verify the count matches expected
            let expectedCount = 0;
            if (filterStatus === CouponStatus.AVAILABLE) {
              expectedCount = availableCount;
            } else if (filterStatus === CouponStatus.USED) {
              expectedCount = usedCount;
            } else if (filterStatus === CouponStatus.EXPIRED) {
              expectedCount = expiredCount;
            }

            expect(result.items.length).toBe(expectedCount);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('coupon status should be correctly computed based on expiration', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate days until expiration (negative = expired, positive = not expired)
          fc.integer({ min: -30, max: 30 }),
          async (daysUntilExpiration) => {
            // Setup test user
            const userId = `user-exp-${Date.now()}-${Math.random()}`;
            createTestUser(userId);

            // Create a coupon with the specified expiration
            const now = new Date();
            const endTime = new Date(now.getTime() + daysUntilExpiration * 86400000);
            const couponId = `coupon-exp-${Date.now()}-${Math.random()}`;
            createTestCoupon(couponId, endTime);
            createTestUserCoupon(
              `uc-exp-${Date.now()}-${Math.random()}`,
              userId,
              couponId,
              CouponStatus.AVAILABLE
            );

            // Query all coupons (no filter)
            const result = await BenefitsService.getUserCoupons(userId, undefined, 1, 100);

            // Find our coupon
            const ourCoupon = result.items.find(c => c.couponId === couponId);
            expect(ourCoupon).toBeDefined();

            // Verify computed status
            if (daysUntilExpiration < 0) {
              // Coupon should be expired
              expect(ourCoupon!.computedStatus).toBe(CouponStatus.EXPIRED);
            } else {
              // Coupon should be available
              expect(ourCoupon!.computedStatus).toBe(CouponStatus.AVAILABLE);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('used coupons should always have USED status regardless of expiration', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate days until expiration (can be past or future)
          fc.integer({ min: -30, max: 30 }),
          async (daysUntilExpiration) => {
            // Setup test user
            const userId = `user-used-${Date.now()}-${Math.random()}`;
            createTestUser(userId);

            // Create a coupon
            const now = new Date();
            const endTime = new Date(now.getTime() + daysUntilExpiration * 86400000);
            const couponId = `coupon-used-${Date.now()}-${Math.random()}`;
            createTestCoupon(couponId, endTime);
            createTestUserCoupon(
              `uc-used-${Date.now()}-${Math.random()}`,
              userId,
              couponId,
              CouponStatus.USED // Already used
            );

            // Query all coupons
            const result = await BenefitsService.getUserCoupons(userId, undefined, 1, 100);

            // Find our coupon
            const ourCoupon = result.items.find(c => c.couponId === couponId);
            expect(ourCoupon).toBeDefined();

            // Used coupons should always show as USED
            expect(ourCoupon!.computedStatus).toBe(CouponStatus.USED);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
