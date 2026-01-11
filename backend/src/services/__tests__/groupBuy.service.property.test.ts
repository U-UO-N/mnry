/**
 * Property-Based Tests for Group Buy Service
 * 
 * Feature: ecommerce-miniprogram
 * 
 * Property 9: Group Buy Price Display Correctness
 * Validates: Requirements 6.1
 * 
 * For any group buy product, both the group price and original price must be displayed,
 * and the group price must be less than the original price.
 * 
 * Property 10: Group Buy Participant Count Correctness
 * Validates: Requirements 6.3, 6.4
 * 
 * For any group buy group, the participant count should equal the actual number of participants;
 * when the participant count reaches the required number, the group status should become success.
 * 
 * Property 11: Group Buy Timeout Handling Correctness
 * Validates: Requirements 6.5
 * 
 * For any group that times out without reaching the required count, the status should become failed,
 * and all participants should receive refunds.
 */

import * as fc from 'fast-check';
import { GroupBuyService } from '../groupBuy.service';
import {
  GroupBuyActivityModel,
  GroupBuyGroupModel,
  GroupBuyOrderModel,
  GroupBuyActivity,
  GroupBuyGroup,
  GroupBuyOrder,
  ActivityStatus,
  GroupBuyStatus,
} from '../../models/groupBuy.model';

// In-memory stores for testing
const activities = new Map<string, {
  id: string;
  product_id: string;
  group_price: string;
  original_price: string;
  required_count: number;
  time_limit: number;
  start_time: Date;
  end_time: Date;
  status: ActivityStatus;
  created_at: Date;
  updated_at: Date;
}>();

const groups = new Map<string, {
  id: string;
  activity_id: string;
  initiator_id: string;
  status: GroupBuyStatus;
  current_count: number;
  expire_time: Date;
  created_at: Date;
  updated_at: Date;
}>();

const groupBuyOrders = new Map<string, {
  id: string;
  group_id: string;
  user_id: string;
  activity_id: string;
  order_id: string | null;
  status: GroupBuyStatus;
  created_at: Date;
  updated_at: Date;
}>();

const products = new Map<string, {
  id: string;
  name: string;
  price: string;
  original_price: string | null;
  main_image: string;
  images: string | null;
  category_id: string | null;
  description: string | null;
  detail_images: string | null;
  stock: number;
  sales: number;
  status: string;
  sort: number;
  created_at: Date;
  updated_at: Date;
}>();

let idCounter = 0;
const generateId = () => `test-id-${++idCounter}`;


// Mock the database module
jest.mock('../../database/mysql', () => {
  return {
    query: jest.fn(async (sql: string, params?: unknown[]) => {
      // Activity queries
      if (sql.includes('SELECT * FROM group_buy_activities WHERE id = ?')) {
        const id = params?.[0] as string;
        const activity = activities.get(id);
        return activity ? [activity] : [];
      }

      if (sql.includes('SELECT COUNT(*) as total FROM group_buy_activities')) {
        const hasStatus = sql.includes('status = ?');
        const status = hasStatus ? params?.[0] as string : undefined;
        
        let count = 0;
        for (const activity of activities.values()) {
          if (status && activity.status !== status) continue;
          count++;
        }
        return [{ total: count }];
      }

      if (sql.includes('SELECT * FROM group_buy_activities') && sql.includes('ORDER BY')) {
        const hasStatus = sql.includes('status = ?');
        const status = hasStatus ? params?.[0] as string : undefined;
        
        const results: typeof activities extends Map<string, infer V> ? V[] : never = [];
        for (const activity of activities.values()) {
          if (status && activity.status !== status) continue;
          results.push(activity);
        }
        results.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
        return results;
      }

      // Group queries
      if (sql.includes('SELECT * FROM group_buy_groups WHERE id = ?')) {
        const id = params?.[0] as string;
        const group = groups.get(id);
        return group ? [group] : [];
      }

      if (sql.includes('SELECT * FROM group_buy_groups WHERE activity_id = ?') && sql.includes('status = ?')) {
        const activityId = params?.[0] as string;
        const status = params?.[1] as string;
        const results: typeof groups extends Map<string, infer V> ? V[] : never = [];
        for (const group of groups.values()) {
          if (group.activity_id === activityId && group.status === status && group.expire_time > new Date()) {
            results.push(group);
          }
        }
        return results;
      }

      if (sql.includes('SELECT * FROM group_buy_groups WHERE activity_id = ?')) {
        const activityId = params?.[0] as string;
        const results: typeof groups extends Map<string, infer V> ? V[] : never = [];
        for (const group of groups.values()) {
          if (group.activity_id === activityId) results.push(group);
        }
        return results;
      }

      if (sql.includes('SELECT * FROM group_buy_groups') && sql.includes('status = ?') && sql.includes('expire_time <= NOW()')) {
        const status = params?.[0] as string;
        const now = new Date();
        const results: typeof groups extends Map<string, infer V> ? V[] : never = [];
        for (const group of groups.values()) {
          if (group.status === status && group.expire_time <= now) {
            results.push(group);
          }
        }
        return results;
      }

      // Group buy order queries
      if (sql.includes('SELECT * FROM group_buy_orders WHERE id = ?')) {
        const id = params?.[0] as string;
        const order = groupBuyOrders.get(id);
        return order ? [order] : [];
      }

      if (sql.includes('SELECT * FROM group_buy_orders WHERE group_id = ?')) {
        const groupId = params?.[0] as string;
        const results: typeof groupBuyOrders extends Map<string, infer V> ? V[] : never = [];
        for (const order of groupBuyOrders.values()) {
          if (order.group_id === groupId) results.push(order);
        }
        results.sort((a, b) => a.created_at.getTime() - b.created_at.getTime());
        return results;
      }

      if (sql.includes('SELECT * FROM group_buy_orders WHERE user_id = ?')) {
        const userId = params?.[0] as string;
        const hasStatus = sql.includes('AND status = ?');
        const status = hasStatus ? params?.[1] as string : undefined;
        
        const results: typeof groupBuyOrders extends Map<string, infer V> ? V[] : never = [];
        for (const order of groupBuyOrders.values()) {
          if (order.user_id !== userId) continue;
          if (status && order.status !== status) continue;
          results.push(order);
        }
        results.sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
        return results;
      }

      if (sql.includes('SELECT * FROM group_buy_orders WHERE user_id = ? AND group_id = ?')) {
        const userId = params?.[0] as string;
        const groupId = params?.[1] as string;
        for (const order of groupBuyOrders.values()) {
          if (order.user_id === userId && order.group_id === groupId) return [order];
        }
        return [];
      }

      // Product queries
      if (sql.includes('SELECT * FROM products WHERE id = ?')) {
        const id = params?.[0] as string;
        const product = products.get(id);
        return product ? [product] : [];
      }

      // User queries
      if (sql.includes('SELECT * FROM users WHERE id = ?')) {
        const id = params?.[0] as string;
        return [{
          id,
          openid: `openid-${id}`,
          nickname: `User ${id}`,
          avatar: 'https://example.com/avatar.jpg',
          phone: null,
          member_level: 'normal',
          balance: '0',
          points: 0,
          created_at: new Date(),
          updated_at: new Date(),
        }];
      }

      return [];
    }),


    execute: jest.fn(async (sql: string, params?: unknown[]) => {
      // Insert activity
      if (sql.includes('INSERT INTO group_buy_activities')) {
        const [id, productId, groupPrice, originalPrice, requiredCount, timeLimit, startTime, endTime, status] = 
          params as [string, string, number, number, number, number, Date, Date, ActivityStatus];
        const now = new Date();
        activities.set(id, {
          id,
          product_id: productId,
          group_price: groupPrice.toString(),
          original_price: originalPrice.toString(),
          required_count: requiredCount,
          time_limit: timeLimit,
          start_time: startTime,
          end_time: endTime,
          status,
          created_at: now,
          updated_at: now,
        });
        return { affectedRows: 1 };
      }

      // Update activity status
      if (sql.includes('UPDATE group_buy_activities SET status = ?')) {
        const status = params?.[0] as ActivityStatus;
        const id = params?.[1] as string;
        const activity = activities.get(id);
        if (activity) {
          activity.status = status;
          activity.updated_at = new Date();
          return { affectedRows: 1 };
        }
        return { affectedRows: 0 };
      }

      // Insert group
      if (sql.includes('INSERT INTO group_buy_groups')) {
        const [id, activityId, initiatorId, status, currentCount, expireTime] = 
          params as [string, string, string, GroupBuyStatus, number, Date];
        const now = new Date();
        groups.set(id, {
          id,
          activity_id: activityId,
          initiator_id: initiatorId,
          status,
          current_count: currentCount,
          expire_time: expireTime,
          created_at: now,
          updated_at: now,
        });
        return { affectedRows: 1 };
      }

      // Update group count
      if (sql.includes('UPDATE group_buy_groups SET current_count = current_count + 1')) {
        const id = params?.[0] as string;
        const group = groups.get(id);
        if (group) {
          group.current_count += 1;
          group.updated_at = new Date();
          return { affectedRows: 1 };
        }
        return { affectedRows: 0 };
      }

      // Update group status
      if (sql.includes('UPDATE group_buy_groups SET status = ?')) {
        const status = params?.[0] as GroupBuyStatus;
        const id = params?.[1] as string;
        const group = groups.get(id);
        if (group) {
          group.status = status;
          group.updated_at = new Date();
          return { affectedRows: 1 };
        }
        return { affectedRows: 0 };
      }

      // Insert group buy order
      if (sql.includes('INSERT INTO group_buy_orders')) {
        const [id, groupId, userId, activityId, orderId, status] = 
          params as [string, string, string, string, string | null, GroupBuyStatus];
        const now = new Date();
        groupBuyOrders.set(id, {
          id,
          group_id: groupId,
          user_id: userId,
          activity_id: activityId,
          order_id: orderId,
          status,
          created_at: now,
          updated_at: now,
        });
        return { affectedRows: 1 };
      }

      // Update group buy order status
      if (sql.includes('UPDATE group_buy_orders SET status = ? WHERE id = ?')) {
        const status = params?.[0] as GroupBuyStatus;
        const id = params?.[1] as string;
        const order = groupBuyOrders.get(id);
        if (order) {
          order.status = status;
          order.updated_at = new Date();
          return { affectedRows: 1 };
        }
        return { affectedRows: 0 };
      }

      // Update group buy orders status by group ID
      if (sql.includes('UPDATE group_buy_orders SET status = ? WHERE group_id = ?')) {
        const status = params?.[0] as GroupBuyStatus;
        const groupId = params?.[1] as string;
        let affected = 0;
        for (const order of groupBuyOrders.values()) {
          if (order.group_id === groupId) {
            order.status = status;
            order.updated_at = new Date();
            affected++;
          }
        }
        return { affectedRows: affected };
      }

      return { affectedRows: 0 };
    }),
    getPool: jest.fn(),
    closePool: jest.fn(),
  };
});

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => generateId()),
}));

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
const createTestProduct = (id: string, price: number): void => {
  const now = new Date();
  products.set(id, {
    id,
    name: `Test Product ${id}`,
    price: price.toString(),
    original_price: null,
    main_image: 'https://example.com/image.jpg',
    images: null,
    category_id: null,
    description: 'Test description',
    detail_images: null,
    stock: 100,
    sales: 0,
    status: 'on_sale',
    sort: 0,
    created_at: now,
    updated_at: now,
  });
};

const createTestActivity = (
  id: string,
  productId: string,
  groupPrice: number,
  originalPrice: number,
  requiredCount: number = 3,
  status: ActivityStatus = ActivityStatus.ACTIVE
): void => {
  const now = new Date();
  const endTime = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
  activities.set(id, {
    id,
    product_id: productId,
    group_price: groupPrice.toString(),
    original_price: originalPrice.toString(),
    required_count: requiredCount,
    time_limit: 24,
    start_time: now,
    end_time: endTime,
    status,
    created_at: now,
    updated_at: now,
  });
};

const createTestGroup = (
  id: string,
  activityId: string,
  initiatorId: string,
  currentCount: number = 1,
  status: GroupBuyStatus = GroupBuyStatus.IN_PROGRESS,
  expireTime?: Date
): void => {
  const now = new Date();
  groups.set(id, {
    id,
    activity_id: activityId,
    initiator_id: initiatorId,
    status,
    current_count: currentCount,
    expire_time: expireTime || new Date(now.getTime() + 24 * 60 * 60 * 1000),
    created_at: now,
    updated_at: now,
  });
};

const createTestGroupBuyOrder = (
  id: string,
  groupId: string,
  userId: string,
  activityId: string,
  status: GroupBuyStatus = GroupBuyStatus.IN_PROGRESS
): void => {
  const now = new Date();
  groupBuyOrders.set(id, {
    id,
    group_id: groupId,
    user_id: userId,
    activity_id: activityId,
    order_id: null,
    status,
    created_at: now,
    updated_at: now,
  });
};

describe('Group Buy Service Property Tests', () => {
  beforeEach(() => {
    activities.clear();
    groups.clear();
    groupBuyOrders.clear();
    products.clear();
    idCounter = 0;
    jest.clearAllMocks();
  });

  /**
   * Property 9: Group Buy Price Display Correctness
   * 
   * For any group buy product, both the group price and original price must be displayed,
   * and the group price must be less than the original price.
   * 
   * Validates: Requirements 6.1
   */
  describe('Property 9: Group Buy Price Display Correctness', () => {
    it('group price should always be less than original price', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            groupPrice: fc.double({ min: 0.01, max: 999, noNaN: true, noDefaultInfinity: true }),
            originalPrice: fc.double({ min: 1, max: 1000, noNaN: true, noDefaultInfinity: true }),
          }),
          async (data) => {
            const groupPrice = Math.round(data.groupPrice * 100) / 100;
            const originalPrice = Math.round(data.originalPrice * 100) / 100;
            
            // Validate the price relationship
            const isValid = GroupBuyService.validateGroupPrice(groupPrice, originalPrice);
            
            // Property: If group price < original price, validation should pass
            // If group price >= original price, validation should fail
            if (groupPrice < originalPrice && groupPrice > 0 && originalPrice > 0) {
              expect(isValid).toBe(true);
            } else {
              expect(isValid).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('activity detail should contain both group price and original price', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            groupPrice: fc.double({ min: 0.01, max: 500, noNaN: true, noDefaultInfinity: true }),
            priceDiff: fc.double({ min: 0.01, max: 500, noNaN: true, noDefaultInfinity: true }),
          }),
          async (data) => {
            // Clear stores
            activities.clear();
            products.clear();
            
            const groupPrice = Math.round(data.groupPrice * 100) / 100;
            const originalPrice = Math.round((data.groupPrice + data.priceDiff) * 100) / 100;
            
            const productId = generateId();
            const activityId = generateId();
            
            createTestProduct(productId, originalPrice);
            createTestActivity(activityId, productId, groupPrice, originalPrice);
            
            const detail = await GroupBuyService.getActivityDetail(activityId);
            
            // Verify: Both prices should be present
            expect(detail.groupPrice).toBeDefined();
            expect(detail.originalPrice).toBeDefined();
            expect(typeof detail.groupPrice).toBe('number');
            expect(typeof detail.originalPrice).toBe('number');
            
            // Verify: Group price should be less than original price
            expect(detail.groupPrice).toBeLessThan(detail.originalPrice);
            
            // Verify: Prices should match what we set
            expect(detail.groupPrice).toBeCloseTo(groupPrice, 2);
            expect(detail.originalPrice).toBeCloseTo(originalPrice, 2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('activities list should show correct prices for all items', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              groupPrice: fc.double({ min: 0.01, max: 500, noNaN: true, noDefaultInfinity: true }),
              priceDiff: fc.double({ min: 0.01, max: 500, noNaN: true, noDefaultInfinity: true }),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          async (activitiesData) => {
            // Clear stores
            activities.clear();
            products.clear();
            
            // Create activities
            for (const data of activitiesData) {
              const groupPrice = Math.round(data.groupPrice * 100) / 100;
              const originalPrice = Math.round((data.groupPrice + data.priceDiff) * 100) / 100;
              
              const productId = generateId();
              const activityId = generateId();
              
              createTestProduct(productId, originalPrice);
              createTestActivity(activityId, productId, groupPrice, originalPrice);
            }
            
            const result = await GroupBuyService.getActivities(1, 100);
            
            // Verify: All activities should have valid prices
            for (const activity of result.items) {
              expect(activity.groupPrice).toBeDefined();
              expect(activity.originalPrice).toBeDefined();
              expect(activity.groupPrice).toBeLessThan(activity.originalPrice);
              expect(activity.groupPrice).toBeGreaterThan(0);
              expect(activity.originalPrice).toBeGreaterThan(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});


/**
 * Property 10: Group Buy Participant Count Correctness
 * 
 * For any group buy group, the participant count should equal the actual number of participants;
 * when the participant count reaches the required number, the group status should become success.
 * 
 * Validates: Requirements 6.3, 6.4
 */
describe('Property 10: Group Buy Participant Count Correctness', () => {
  beforeEach(() => {
    activities.clear();
    groups.clear();
    groupBuyOrders.clear();
    products.clear();
    idCounter = 0;
    jest.clearAllMocks();
  });

  it('participant count should equal actual number of participants', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          participantCount: fc.integer({ min: 1, max: 10 }),
        }),
        async (data) => {
          // Clear stores
          activities.clear();
          groups.clear();
          groupBuyOrders.clear();
          products.clear();
          
          const productId = generateId();
          const activityId = generateId();
          const groupId = generateId();
          const initiatorId = 'initiator-user';
          
          createTestProduct(productId, 100);
          createTestActivity(activityId, productId, 50, 100, 10); // Required count: 10
          createTestGroup(groupId, activityId, initiatorId, data.participantCount);
          
          // Create orders for each participant
          for (let i = 0; i < data.participantCount; i++) {
            const orderId = generateId();
            const userId = i === 0 ? initiatorId : `participant-${i}`;
            createTestGroupBuyOrder(orderId, groupId, userId, activityId);
          }
          
          const detail = await GroupBuyService.getGroupDetail(groupId);
          
          // Verify: Current count should match actual participants
          expect(detail.currentCount).toBe(data.participantCount);
          expect(detail.participants?.length).toBe(data.participantCount);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('group should become success when participant count reaches required count', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          requiredCount: fc.integer({ min: 2, max: 5 }),
        }),
        async (data) => {
          // Clear stores
          activities.clear();
          groups.clear();
          groupBuyOrders.clear();
          products.clear();
          
          const productId = generateId();
          const activityId = generateId();
          const initiatorId = 'initiator-user';
          
          createTestProduct(productId, 100);
          createTestActivity(activityId, productId, 50, 100, data.requiredCount);
          
          // Initiate group buy
          const group = await GroupBuyService.initiateGroupBuy(initiatorId, activityId);
          
          // Join with remaining participants
          for (let i = 1; i < data.requiredCount; i++) {
            const userId = `participant-${i}`;
            await GroupBuyService.joinGroupBuy(userId, group.id);
          }
          
          // Get updated group detail
          const updatedGroup = await GroupBuyService.getGroupDetail(group.id);
          
          // Verify: Group should be successful when count reaches required
          expect(updatedGroup.currentCount).toBe(data.requiredCount);
          expect(updatedGroup.status).toBe(GroupBuyStatus.SUCCESS);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('group should remain in progress when participant count is below required', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          requiredCount: fc.integer({ min: 3, max: 10 }),
          currentCount: fc.integer({ min: 1, max: 2 }),
        }),
        async (data) => {
          // Ensure current count is less than required
          if (data.currentCount >= data.requiredCount) return;
          
          // Clear stores
          activities.clear();
          groups.clear();
          groupBuyOrders.clear();
          products.clear();
          
          const productId = generateId();
          const activityId = generateId();
          const initiatorId = 'initiator-user';
          
          createTestProduct(productId, 100);
          createTestActivity(activityId, productId, 50, 100, data.requiredCount);
          
          // Initiate group buy
          const group = await GroupBuyService.initiateGroupBuy(initiatorId, activityId);
          
          // Join with some participants (but not enough)
          for (let i = 1; i < data.currentCount; i++) {
            const userId = `participant-${i}`;
            await GroupBuyService.joinGroupBuy(userId, group.id);
          }
          
          // Get updated group detail
          const updatedGroup = await GroupBuyService.getGroupDetail(group.id);
          
          // Verify: Group should still be in progress
          expect(updatedGroup.currentCount).toBe(data.currentCount);
          expect(updatedGroup.status).toBe(GroupBuyStatus.IN_PROGRESS);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('joining a full group should throw error', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          requiredCount: fc.integer({ min: 2, max: 5 }),
        }),
        async (data) => {
          // Clear stores
          activities.clear();
          groups.clear();
          groupBuyOrders.clear();
          products.clear();
          
          const productId = generateId();
          const activityId = generateId();
          const groupId = generateId();
          const initiatorId = 'initiator-user';
          
          createTestProduct(productId, 100);
          createTestActivity(activityId, productId, 50, 100, data.requiredCount);
          createTestGroup(groupId, activityId, initiatorId, data.requiredCount, GroupBuyStatus.SUCCESS);
          
          // Create orders for all participants
          for (let i = 0; i < data.requiredCount; i++) {
            const orderId = generateId();
            const userId = i === 0 ? initiatorId : `participant-${i}`;
            createTestGroupBuyOrder(orderId, groupId, userId, activityId, GroupBuyStatus.SUCCESS);
          }
          
          // Try to join the full group
          const newUserId = 'new-user';
          await expect(
            GroupBuyService.joinGroupBuy(newUserId, groupId)
          ).rejects.toThrow();
        }
      ),
      { numRuns: 100 }
    );
  });
});


/**
 * Property 11: Group Buy Timeout Handling Correctness
 * 
 * For any group that times out without reaching the required count, 
 * the status should become failed, and all participants should receive refunds.
 * 
 * Validates: Requirements 6.5
 */
describe('Property 11: Group Buy Timeout Handling Correctness', () => {
  beforeEach(() => {
    activities.clear();
    groups.clear();
    groupBuyOrders.clear();
    products.clear();
    idCounter = 0;
    jest.clearAllMocks();
  });

  it('expired groups should be marked as failed', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          groupCount: fc.integer({ min: 1, max: 5 }),
          participantsPerGroup: fc.integer({ min: 1, max: 3 }),
        }),
        async (data) => {
          // Clear stores
          activities.clear();
          groups.clear();
          groupBuyOrders.clear();
          products.clear();
          
          const productId = generateId();
          const activityId = generateId();
          
          createTestProduct(productId, 100);
          createTestActivity(activityId, productId, 50, 100, 10); // Required count: 10
          
          // Create expired groups (expire time in the past)
          const expiredTime = new Date(Date.now() - 1000); // 1 second ago
          const groupIds: string[] = [];
          
          for (let g = 0; g < data.groupCount; g++) {
            const groupId = generateId();
            groupIds.push(groupId);
            const initiatorId = `initiator-${g}`;
            
            createTestGroup(groupId, activityId, initiatorId, data.participantsPerGroup, GroupBuyStatus.IN_PROGRESS, expiredTime);
            
            // Create orders for participants
            for (let p = 0; p < data.participantsPerGroup; p++) {
              const orderId = generateId();
              const userId = p === 0 ? initiatorId : `participant-${g}-${p}`;
              createTestGroupBuyOrder(orderId, groupId, userId, activityId);
            }
          }
          
          // Process expired groups
          const result = await GroupBuyService.processExpiredGroups();
          
          // Verify: All groups should be processed
          expect(result.processed).toBe(data.groupCount);
          
          // Verify: All groups should now be failed
          for (const groupId of groupIds) {
            const group = groups.get(groupId);
            expect(group?.status).toBe(GroupBuyStatus.FAILED);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('all participant orders should be marked as failed when group expires', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          participantCount: fc.integer({ min: 1, max: 5 }),
        }),
        async (data) => {
          // Clear stores
          activities.clear();
          groups.clear();
          groupBuyOrders.clear();
          products.clear();
          
          const productId = generateId();
          const activityId = generateId();
          const groupId = generateId();
          const initiatorId = 'initiator-user';
          
          createTestProduct(productId, 100);
          createTestActivity(activityId, productId, 50, 100, 10); // Required count: 10
          
          // Create expired group
          const expiredTime = new Date(Date.now() - 1000);
          createTestGroup(groupId, activityId, initiatorId, data.participantCount, GroupBuyStatus.IN_PROGRESS, expiredTime);
          
          // Create orders for participants
          const orderIds: string[] = [];
          for (let i = 0; i < data.participantCount; i++) {
            const orderId = generateId();
            orderIds.push(orderId);
            const userId = i === 0 ? initiatorId : `participant-${i}`;
            createTestGroupBuyOrder(orderId, groupId, userId, activityId);
          }
          
          // Process expired groups
          await GroupBuyService.processExpiredGroups();
          
          // Verify: All orders should be marked as failed
          for (const orderId of orderIds) {
            const order = groupBuyOrders.get(orderId);
            expect(order?.status).toBe(GroupBuyStatus.FAILED);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('refund count should match participant count for expired groups', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          groupCount: fc.integer({ min: 1, max: 3 }),
          participantsPerGroup: fc.integer({ min: 1, max: 4 }),
        }),
        async (data) => {
          // Clear stores
          activities.clear();
          groups.clear();
          groupBuyOrders.clear();
          products.clear();
          
          const productId = generateId();
          const activityId = generateId();
          
          createTestProduct(productId, 100);
          createTestActivity(activityId, productId, 50, 100, 10);
          
          // Create expired groups
          const expiredTime = new Date(Date.now() - 1000);
          let totalParticipants = 0;
          
          for (let g = 0; g < data.groupCount; g++) {
            const groupId = generateId();
            const initiatorId = `initiator-${g}`;
            
            createTestGroup(groupId, activityId, initiatorId, data.participantsPerGroup, GroupBuyStatus.IN_PROGRESS, expiredTime);
            
            for (let p = 0; p < data.participantsPerGroup; p++) {
              const orderId = generateId();
              const userId = p === 0 ? initiatorId : `participant-${g}-${p}`;
              createTestGroupBuyOrder(orderId, groupId, userId, activityId);
              totalParticipants++;
            }
          }
          
          // Process expired groups
          const result = await GroupBuyService.processExpiredGroups();
          
          // Verify: Refund count should match total participants
          expect(result.refunded).toBe(totalParticipants);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('non-expired groups should not be affected', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          expiredCount: fc.integer({ min: 1, max: 3 }),
          activeCount: fc.integer({ min: 1, max: 3 }),
        }),
        async (data) => {
          // Clear stores
          activities.clear();
          groups.clear();
          groupBuyOrders.clear();
          products.clear();
          
          const productId = generateId();
          const activityId = generateId();
          
          createTestProduct(productId, 100);
          createTestActivity(activityId, productId, 50, 100, 10);
          
          const expiredTime = new Date(Date.now() - 1000);
          const futureTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
          
          const expiredGroupIds: string[] = [];
          const activeGroupIds: string[] = [];
          
          // Create expired groups
          for (let i = 0; i < data.expiredCount; i++) {
            const groupId = generateId();
            expiredGroupIds.push(groupId);
            createTestGroup(groupId, activityId, `expired-initiator-${i}`, 2, GroupBuyStatus.IN_PROGRESS, expiredTime);
            createTestGroupBuyOrder(generateId(), groupId, `expired-initiator-${i}`, activityId);
          }
          
          // Create active groups (not expired)
          for (let i = 0; i < data.activeCount; i++) {
            const groupId = generateId();
            activeGroupIds.push(groupId);
            createTestGroup(groupId, activityId, `active-initiator-${i}`, 2, GroupBuyStatus.IN_PROGRESS, futureTime);
            createTestGroupBuyOrder(generateId(), groupId, `active-initiator-${i}`, activityId);
          }
          
          // Process expired groups
          const result = await GroupBuyService.processExpiredGroups();
          
          // Verify: Only expired groups should be processed
          expect(result.processed).toBe(data.expiredCount);
          
          // Verify: Expired groups should be failed
          for (const groupId of expiredGroupIds) {
            const group = groups.get(groupId);
            expect(group?.status).toBe(GroupBuyStatus.FAILED);
          }
          
          // Verify: Active groups should still be in progress
          for (const groupId of activeGroupIds) {
            const group = groups.get(groupId);
            expect(group?.status).toBe(GroupBuyStatus.IN_PROGRESS);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
