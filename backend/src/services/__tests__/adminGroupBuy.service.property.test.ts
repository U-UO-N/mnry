/**
 * Property-Based Tests for Admin Group Buy Service
 * 
 * Feature: ecommerce-miniprogram
 * 
 * Property 32: Group Buy Activity Data Persistence Correctness
 * Validates: Requirements 19.2, 19.3
 * For any group buy activity create or edit operation, querying after save should return the same data.
 * 
 * Property 33: Group Buy Statistics Data Correctness
 * Validates: Requirements 19.4
 * For any group buy activity, participant count, success rate, and sales should match actual order data.
 */

import * as fc from 'fast-check';
import { GroupBuyService } from '../groupBuy.service';
import { AdminGroupBuyService } from '../../controllers/adminGroupBuy.controller';
import {
  GroupBuyActivityModel,
  GroupBuyGroupModel,
  GroupBuyOrderModel,
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
        const hasProductId = sql.includes('product_id = ?');
        let status: string | undefined;
        let productId: string | undefined;
        let paramIndex = 0;
        
        if (hasStatus) {
          status = params?.[paramIndex++] as string;
        }
        if (hasProductId) {
          productId = params?.[paramIndex++] as string;
        }
        
        let count = 0;
        for (const activity of activities.values()) {
          if (status && activity.status !== status) continue;
          if (productId && activity.product_id !== productId) continue;
          count++;
        }
        return [{ total: count }];
      }

      if (sql.includes('SELECT * FROM group_buy_activities') && sql.includes('ORDER BY')) {
        const hasStatus = sql.includes('status = ?');
        const hasProductId = sql.includes('product_id = ?');
        let status: string | undefined;
        let productId: string | undefined;
        let paramIndex = 0;
        
        if (hasStatus) {
          status = params?.[paramIndex++] as string;
        }
        if (hasProductId) {
          productId = params?.[paramIndex++] as string;
        }
        
        const results: typeof activities extends Map<string, infer V> ? V[] : never = [];
        for (const activity of activities.values()) {
          if (status && activity.status !== status) continue;
          if (productId && activity.product_id !== productId) continue;
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

      // Update activity
      if (sql.includes('UPDATE group_buy_activities SET') && !sql.includes('status = ? WHERE')) {
        const id = params?.[params.length - 1] as string;
        const activity = activities.get(id);
        if (activity) {
          const setMatch = sql.match(/SET (.+) WHERE/);
          if (setMatch) {
            const setClauses = setMatch[1].split(', ');
            let paramIndex = 0;
            for (const clause of setClauses) {
              const field = clause.split(' = ')[0].trim();
              const value = params?.[paramIndex];
              switch (field) {
                case 'group_price':
                  activity.group_price = (value as number).toString();
                  break;
                case 'original_price':
                  activity.original_price = (value as number).toString();
                  break;
                case 'required_count':
                  activity.required_count = value as number;
                  break;
                case 'time_limit':
                  activity.time_limit = value as number;
                  break;
                case 'start_time':
                  activity.start_time = value as Date;
                  break;
                case 'end_time':
                  activity.end_time = value as Date;
                  break;
                case 'status':
                  activity.status = value as ActivityStatus;
                  break;
              }
              paramIndex++;
            }
          }
          activity.updated_at = new Date();
          return { affectedRows: 1 };
        }
        return { affectedRows: 0 };
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

// Helper to create test product
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

// Helper to create test group
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

// Helper to create test group buy order
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

describe('Admin Group Buy Service Property Tests', () => {
  beforeEach(() => {
    activities.clear();
    groups.clear();
    groupBuyOrders.clear();
    products.clear();
    idCounter = 0;
    jest.clearAllMocks();
  });

  /**
   * Property 32: Group Buy Activity Data Persistence Correctness
   * 
   * For any group buy activity create or edit operation, 
   * querying after save should return the same data (round-trip consistency).
   * 
   * Validates: Requirements 19.2, 19.3
   */
  describe('Property 32: Group Buy Activity Data Persistence Correctness', () => {
    it('created activity should be retrievable with same data (round-trip)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            groupPrice: fc.double({ min: 0.01, max: 500, noNaN: true, noDefaultInfinity: true }),
            priceDiff: fc.double({ min: 0.01, max: 500, noNaN: true, noDefaultInfinity: true }),
            requiredCount: fc.integer({ min: 2, max: 100 }),
            timeLimit: fc.integer({ min: 1, max: 168 }), // 1 hour to 1 week
            daysFromNow: fc.integer({ min: 1, max: 30 }),
            durationDays: fc.integer({ min: 1, max: 30 }),
          }),
          async (data) => {
            // Clear stores
            activities.clear();
            products.clear();
            
            const groupPrice = Math.round(data.groupPrice * 100) / 100;
            const originalPrice = Math.round((data.groupPrice + data.priceDiff) * 100) / 100;
            
            const productId = generateId();
            createTestProduct(productId, originalPrice);
            
            const now = new Date();
            const startTime = new Date(now.getTime() + data.daysFromNow * 24 * 60 * 60 * 1000);
            const endTime = new Date(startTime.getTime() + data.durationDays * 24 * 60 * 60 * 1000);
            
            // Create activity
            const created = await GroupBuyService.createActivity({
              productId,
              groupPrice,
              originalPrice,
              requiredCount: data.requiredCount,
              timeLimit: data.timeLimit,
              startTime,
              endTime,
            });
            
            // Retrieve activity
            const retrieved = await GroupBuyActivityModel.findById(created.id);
            
            // Verify round-trip consistency
            expect(retrieved).not.toBeNull();
            expect(retrieved!.id).toBe(created.id);
            expect(retrieved!.productId).toBe(productId);
            expect(retrieved!.groupPrice).toBeCloseTo(groupPrice, 2);
            expect(retrieved!.originalPrice).toBeCloseTo(originalPrice, 2);
            expect(retrieved!.requiredCount).toBe(data.requiredCount);
            expect(retrieved!.timeLimit).toBe(data.timeLimit);
            expect(retrieved!.startTime.getTime()).toBe(startTime.getTime());
            expect(retrieved!.endTime.getTime()).toBe(endTime.getTime());
            expect(retrieved!.status).toBe(ActivityStatus.NOT_STARTED);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('updated activity should reflect all changes (round-trip)', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Initial data
          fc.record({
            groupPrice: fc.double({ min: 0.01, max: 250, noNaN: true, noDefaultInfinity: true }),
            priceDiff: fc.double({ min: 0.01, max: 250, noNaN: true, noDefaultInfinity: true }),
            requiredCount: fc.integer({ min: 2, max: 50 }),
            timeLimit: fc.integer({ min: 1, max: 72 }),
          }),
          // Update data
          fc.record({
            newGroupPrice: fc.double({ min: 0.01, max: 250, noNaN: true, noDefaultInfinity: true }),
            newPriceDiff: fc.double({ min: 0.01, max: 250, noNaN: true, noDefaultInfinity: true }),
            newRequiredCount: fc.integer({ min: 2, max: 50 }),
            newTimeLimit: fc.integer({ min: 1, max: 72 }),
          }),
          async (initialData, updateData) => {
            // Clear stores
            activities.clear();
            products.clear();
            
            const initialGroupPrice = Math.round(initialData.groupPrice * 100) / 100;
            const initialOriginalPrice = Math.round((initialData.groupPrice + initialData.priceDiff) * 100) / 100;
            
            const productId = generateId();
            createTestProduct(productId, initialOriginalPrice);
            
            const now = new Date();
            const startTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            const endTime = new Date(startTime.getTime() + 7 * 24 * 60 * 60 * 1000);
            
            // Create initial activity
            const created = await GroupBuyService.createActivity({
              productId,
              groupPrice: initialGroupPrice,
              originalPrice: initialOriginalPrice,
              requiredCount: initialData.requiredCount,
              timeLimit: initialData.timeLimit,
              startTime,
              endTime,
            });
            
            // Prepare update data
            const newGroupPrice = Math.round(updateData.newGroupPrice * 100) / 100;
            const newOriginalPrice = Math.round((updateData.newGroupPrice + updateData.newPriceDiff) * 100) / 100;
            
            // Update activity
            await GroupBuyService.updateActivity(created.id, {
              groupPrice: newGroupPrice,
              originalPrice: newOriginalPrice,
              requiredCount: updateData.newRequiredCount,
              timeLimit: updateData.newTimeLimit,
            });
            
            // Retrieve updated activity
            const retrieved = await GroupBuyActivityModel.findById(created.id);
            
            // Verify update was persisted correctly
            expect(retrieved).not.toBeNull();
            expect(retrieved!.groupPrice).toBeCloseTo(newGroupPrice, 2);
            expect(retrieved!.originalPrice).toBeCloseTo(newOriginalPrice, 2);
            expect(retrieved!.requiredCount).toBe(updateData.newRequiredCount);
            expect(retrieved!.timeLimit).toBe(updateData.newTimeLimit);
            
            // Original fields should be preserved
            expect(retrieved!.productId).toBe(productId);
            expect(retrieved!.startTime.getTime()).toBe(startTime.getTime());
            expect(retrieved!.endTime.getTime()).toBe(endTime.getTime());
          }
        ),
        { numRuns: 100 }
      );
    });

    it('activity status update should be persisted correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            groupPrice: fc.double({ min: 0.01, max: 500, noNaN: true, noDefaultInfinity: true }),
            priceDiff: fc.double({ min: 0.01, max: 500, noNaN: true, noDefaultInfinity: true }),
          }),
          fc.constantFrom(ActivityStatus.NOT_STARTED, ActivityStatus.ACTIVE, ActivityStatus.ENDED),
          async (data, newStatus) => {
            // Clear stores
            activities.clear();
            products.clear();
            
            const groupPrice = Math.round(data.groupPrice * 100) / 100;
            const originalPrice = Math.round((data.groupPrice + data.priceDiff) * 100) / 100;
            
            const productId = generateId();
            createTestProduct(productId, originalPrice);
            
            const now = new Date();
            const startTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
            const endTime = new Date(startTime.getTime() + 7 * 24 * 60 * 60 * 1000);
            
            // Create activity
            const created = await GroupBuyService.createActivity({
              productId,
              groupPrice,
              originalPrice,
              requiredCount: 3,
              timeLimit: 24,
              startTime,
              endTime,
            });
            
            // Verify initial status
            expect(created.status).toBe(ActivityStatus.NOT_STARTED);
            
            // Update status
            await GroupBuyService.updateActivity(created.id, { status: newStatus });
            
            // Retrieve and verify
            const retrieved = await GroupBuyActivityModel.findById(created.id);
            expect(retrieved).not.toBeNull();
            expect(retrieved!.status).toBe(newStatus);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('activity list should contain all created activities', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              groupPrice: fc.double({ min: 0.01, max: 500, noNaN: true, noDefaultInfinity: true }),
              priceDiff: fc.double({ min: 0.01, max: 500, noNaN: true, noDefaultInfinity: true }),
              requiredCount: fc.integer({ min: 2, max: 20 }),
            }),
            { minLength: 1, maxLength: 10 }
          ),
          async (activitiesData) => {
            // Clear stores
            activities.clear();
            products.clear();
            
            const createdIds: string[] = [];
            
            for (const data of activitiesData) {
              const groupPrice = Math.round(data.groupPrice * 100) / 100;
              const originalPrice = Math.round((data.groupPrice + data.priceDiff) * 100) / 100;
              
              const productId = generateId();
              createTestProduct(productId, originalPrice);
              
              const now = new Date();
              const startTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
              const endTime = new Date(startTime.getTime() + 7 * 24 * 60 * 60 * 1000);
              
              const created = await GroupBuyService.createActivity({
                productId,
                groupPrice,
                originalPrice,
                requiredCount: data.requiredCount,
                timeLimit: 24,
                startTime,
                endTime,
              });
              
              createdIds.push(created.id);
            }
            
            // Get all activities
            const result = await GroupBuyService.getAllActivities({
              page: 1,
              pageSize: 100,
            });
            
            // Verify all created activities are in the list
            expect(result.total).toBe(activitiesData.length);
            for (const id of createdIds) {
              const found = result.items.some(a => a.id === id);
              expect(found).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});


/**
 * Property 33: Group Buy Statistics Data Correctness
 * 
 * For any group buy activity, participant count, success rate, and sales 
 * should match actual order data.
 * 
 * Validates: Requirements 19.4
 */
describe('Property 33: Group Buy Statistics Data Correctness', () => {
  beforeEach(() => {
    activities.clear();
    groups.clear();
    groupBuyOrders.clear();
    products.clear();
    idCounter = 0;
    jest.clearAllMocks();
  });

  it('total participants should equal sum of all group participants', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            participantCount: fc.integer({ min: 1, max: 5 }),
            status: fc.constantFrom(GroupBuyStatus.IN_PROGRESS, GroupBuyStatus.SUCCESS, GroupBuyStatus.FAILED),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        async (groupsData) => {
          // Clear stores
          activities.clear();
          groups.clear();
          groupBuyOrders.clear();
          products.clear();
          
          const productId = generateId();
          createTestProduct(productId, 100);
          
          const now = new Date();
          const startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Started yesterday
          const endTime = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          
          // Create activity
          const activity = await GroupBuyService.createActivity({
            productId,
            groupPrice: 50,
            originalPrice: 100,
            requiredCount: 5,
            timeLimit: 24,
            startTime,
            endTime,
          });
          
          // Create groups with participants
          let expectedTotalParticipants = 0;
          
          for (let i = 0; i < groupsData.length; i++) {
            const data = groupsData[i];
            const groupId = generateId();
            const initiatorId = `initiator-${i}`;
            
            createTestGroup(groupId, activity.id, initiatorId, data.participantCount, data.status);
            expectedTotalParticipants += data.participantCount;
            
            // Create orders for participants
            for (let j = 0; j < data.participantCount; j++) {
              const orderId = generateId();
              const userId = j === 0 ? initiatorId : `participant-${i}-${j}`;
              createTestGroupBuyOrder(orderId, groupId, userId, activity.id, data.status);
            }
          }
          
          // Get statistics
          const stats = await AdminGroupBuyService.getActivityStats(activity.id);
          
          // Verify total participants
          expect(stats.totalParticipants).toBe(expectedTotalParticipants);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('success rate should equal successful groups divided by total groups', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          successCount: fc.integer({ min: 0, max: 10 }),
          failedCount: fc.integer({ min: 0, max: 10 }),
          inProgressCount: fc.integer({ min: 0, max: 10 }),
        }).filter(data => data.successCount + data.failedCount + data.inProgressCount > 0),
        async (data) => {
          // Clear stores
          activities.clear();
          groups.clear();
          groupBuyOrders.clear();
          products.clear();
          
          const productId = generateId();
          createTestProduct(productId, 100);
          
          const now = new Date();
          const startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          const endTime = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          
          // Create activity
          const activity = await GroupBuyService.createActivity({
            productId,
            groupPrice: 50,
            originalPrice: 100,
            requiredCount: 3,
            timeLimit: 24,
            startTime,
            endTime,
          });
          
          // Create groups with different statuses
          let groupIndex = 0;
          
          for (let i = 0; i < data.successCount; i++) {
            const groupId = generateId();
            createTestGroup(groupId, activity.id, `initiator-${groupIndex++}`, 3, GroupBuyStatus.SUCCESS);
          }
          
          for (let i = 0; i < data.failedCount; i++) {
            const groupId = generateId();
            createTestGroup(groupId, activity.id, `initiator-${groupIndex++}`, 1, GroupBuyStatus.FAILED);
          }
          
          for (let i = 0; i < data.inProgressCount; i++) {
            const groupId = generateId();
            createTestGroup(groupId, activity.id, `initiator-${groupIndex++}`, 2, GroupBuyStatus.IN_PROGRESS);
          }
          
          // Get statistics
          const stats = await AdminGroupBuyService.getActivityStats(activity.id);
          
          // Calculate expected success rate
          const totalGroups = data.successCount + data.failedCount + data.inProgressCount;
          const expectedSuccessRate = Math.round((data.successCount / totalGroups) * 100 * 100) / 100;
          
          // Verify counts
          expect(stats.totalGroups).toBe(totalGroups);
          expect(stats.successGroups).toBe(data.successCount);
          expect(stats.failedGroups).toBe(data.failedCount);
          expect(stats.inProgressGroups).toBe(data.inProgressCount);
          expect(stats.successRate).toBeCloseTo(expectedSuccessRate, 2);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('total sales should equal successful groups times required count times group price', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          groupPrice: fc.double({ min: 0.01, max: 500, noNaN: true, noDefaultInfinity: true }),
          priceDiff: fc.double({ min: 0.01, max: 500, noNaN: true, noDefaultInfinity: true }),
          requiredCount: fc.integer({ min: 2, max: 10 }),
          successCount: fc.integer({ min: 0, max: 10 }),
          failedCount: fc.integer({ min: 0, max: 5 }),
        }),
        async (data) => {
          // Clear stores
          activities.clear();
          groups.clear();
          groupBuyOrders.clear();
          products.clear();
          
          const groupPrice = Math.round(data.groupPrice * 100) / 100;
          const originalPrice = Math.round((data.groupPrice + data.priceDiff) * 100) / 100;
          
          const productId = generateId();
          createTestProduct(productId, originalPrice);
          
          const now = new Date();
          const startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          const endTime = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          
          // Create activity
          const activity = await GroupBuyService.createActivity({
            productId,
            groupPrice,
            originalPrice,
            requiredCount: data.requiredCount,
            timeLimit: 24,
            startTime,
            endTime,
          });
          
          // Create successful groups
          for (let i = 0; i < data.successCount; i++) {
            const groupId = generateId();
            createTestGroup(groupId, activity.id, `initiator-success-${i}`, data.requiredCount, GroupBuyStatus.SUCCESS);
          }
          
          // Create failed groups
          for (let i = 0; i < data.failedCount; i++) {
            const groupId = generateId();
            createTestGroup(groupId, activity.id, `initiator-failed-${i}`, 1, GroupBuyStatus.FAILED);
          }
          
          // Get statistics
          const stats = await AdminGroupBuyService.getActivityStats(activity.id);
          
          // Calculate expected sales (only successful groups contribute to sales)
          const expectedSales = Math.round(data.successCount * data.requiredCount * groupPrice * 100) / 100;
          
          // Verify sales
          expect(stats.totalSales).toBeCloseTo(expectedSales, 2);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('statistics should be consistent with actual group data', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            participantCount: fc.integer({ min: 1, max: 5 }),
            status: fc.constantFrom(GroupBuyStatus.IN_PROGRESS, GroupBuyStatus.SUCCESS, GroupBuyStatus.FAILED),
          }),
          { minLength: 1, maxLength: 15 }
        ),
        async (groupsData) => {
          // Clear stores
          activities.clear();
          groups.clear();
          groupBuyOrders.clear();
          products.clear();
          
          const groupPrice = 50;
          const originalPrice = 100;
          const requiredCount = 5;
          
          const productId = generateId();
          createTestProduct(productId, originalPrice);
          
          const now = new Date();
          const startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          const endTime = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
          
          // Create activity
          const activity = await GroupBuyService.createActivity({
            productId,
            groupPrice,
            originalPrice,
            requiredCount,
            timeLimit: 24,
            startTime,
            endTime,
          });
          
          // Track expected values
          let expectedTotalGroups = 0;
          let expectedSuccessGroups = 0;
          let expectedFailedGroups = 0;
          let expectedInProgressGroups = 0;
          let expectedTotalParticipants = 0;
          
          // Create groups
          for (let i = 0; i < groupsData.length; i++) {
            const data = groupsData[i];
            const groupId = generateId();
            const initiatorId = `initiator-${i}`;
            
            createTestGroup(groupId, activity.id, initiatorId, data.participantCount, data.status);
            
            expectedTotalGroups++;
            expectedTotalParticipants += data.participantCount;
            
            switch (data.status) {
              case GroupBuyStatus.SUCCESS:
                expectedSuccessGroups++;
                break;
              case GroupBuyStatus.FAILED:
                expectedFailedGroups++;
                break;
              case GroupBuyStatus.IN_PROGRESS:
                expectedInProgressGroups++;
                break;
            }
          }
          
          // Get statistics
          const stats = await AdminGroupBuyService.getActivityStats(activity.id);
          
          // Verify all statistics match expected values
          expect(stats.activityId).toBe(activity.id);
          expect(stats.totalGroups).toBe(expectedTotalGroups);
          expect(stats.successGroups).toBe(expectedSuccessGroups);
          expect(stats.failedGroups).toBe(expectedFailedGroups);
          expect(stats.inProgressGroups).toBe(expectedInProgressGroups);
          expect(stats.totalParticipants).toBe(expectedTotalParticipants);
          
          // Verify success rate calculation
          const expectedSuccessRate = expectedTotalGroups > 0 
            ? Math.round((expectedSuccessGroups / expectedTotalGroups) * 100 * 100) / 100 
            : 0;
          expect(stats.successRate).toBeCloseTo(expectedSuccessRate, 2);
          
          // Verify sales calculation
          const expectedSales = Math.round(expectedSuccessGroups * requiredCount * groupPrice * 100) / 100;
          expect(stats.totalSales).toBeCloseTo(expectedSales, 2);
        }
      ),
      { numRuns: 100 }
    );
  });
});
