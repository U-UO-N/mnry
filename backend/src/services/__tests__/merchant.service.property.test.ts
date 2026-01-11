/**
 * Property-Based Tests for Merchant Service
 * 
 * Feature: ecommerce-miniprogram
 * Property 23: Merchant Application Status Flow Correctness
 * Validates: Requirements 11.3, 11.4
 * 
 * For any merchant application, after approval the user should gain
 * the corresponding merchant permissions.
 */

import * as fc from 'fast-check';
import { MerchantType, ApplicationStatus } from '../../models/merchant.model';
import { MerchantService } from '../merchant.service';

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

const applications = new Map<string, {
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

      // Application by ID query
      if (sql.includes('SELECT * FROM merchant_applications WHERE id = ?')) {
        const id = params?.[0] as string;
        const app = applications.get(id);
        return app ? [app] : [];
      }


      // Application by user and type query (latest)
      if (sql.includes('SELECT * FROM merchant_applications WHERE user_id = ? AND type = ?') && 
          sql.includes('ORDER BY created_at DESC LIMIT 1')) {
        const userId = params?.[0] as string;
        const type = params?.[1] as MerchantType;
        let latestApp = null;
        let latestDate = new Date(0);
        for (const app of applications.values()) {
          if (app.user_id === userId && app.type === type && app.created_at > latestDate) {
            latestApp = app;
            latestDate = app.created_at;
          }
        }
        return latestApp ? [latestApp] : [];
      }

      // All applications by user query
      if (sql.includes('SELECT * FROM merchant_applications WHERE user_id = ?') && 
          sql.includes('ORDER BY created_at DESC') && !sql.includes('LIMIT 1')) {
        const userId = params?.[0] as string;
        const results: unknown[] = [];
        for (const app of applications.values()) {
          if (app.user_id === userId) {
            results.push(app);
          }
        }
        return results.sort((a: any, b: any) => b.created_at.getTime() - a.created_at.getTime());
      }

      // Count pending applications
      if (sql.includes('SELECT COUNT(*) as count FROM merchant_applications') && 
          sql.includes('status = ?')) {
        const userId = params?.[0] as string;
        const type = params?.[1] as MerchantType;
        const status = params?.[2] as ApplicationStatus;
        let count = 0;
        for (const app of applications.values()) {
          if (app.user_id === userId && app.type === type && app.status === status) {
            count++;
          }
        }
        return [{ count }];
      }

      // Count applications for pagination
      if (sql.includes('SELECT COUNT(*) as total FROM merchant_applications')) {
        let count = 0;
        for (const app of applications.values()) {
          count++;
        }
        return [{ total: count }];
      }

      // List applications with pagination
      if (sql.includes('SELECT * FROM merchant_applications') && sql.includes('LIMIT')) {
        const results: unknown[] = [];
        for (const app of applications.values()) {
          results.push(app);
        }
        return results;
      }

      return [];
    }),
    execute: jest.fn(async (sql: string, params?: unknown[]) => {
      // Insert application
      if (sql.includes('INSERT INTO merchant_applications')) {
        const [id, userId, type, companyName, contactName, contactPhone, businessLicense, address, description, status] = 
          params as [string, string, MerchantType, string, string, string, string | null, string | null, string | null, ApplicationStatus];
        const now = new Date();
        applications.set(id, {
          id,
          user_id: userId,
          type,
          company_name: companyName,
          contact_name: contactName,
          contact_phone: contactPhone,
          business_license: businessLicense,
          address,
          description,
          status,
          reject_reason: null,
          reviewed_at: null,
          reviewed_by: null,
          created_at: now,
          updated_at: now,
        });
        return { affectedRows: 1 };
      }

      // Update application status
      if (sql.includes('UPDATE merchant_applications SET')) {
        const status = params?.[0] as ApplicationStatus;
        const reviewedBy = params?.[1] as string;
        const id = params?.[params?.length ? params.length - 1 : 0] as string;
        const app = applications.get(id);
        if (app) {
          app.status = status;
          app.reviewed_at = new Date();
          app.reviewed_by = reviewedBy;
          // Check if reject_reason is in params
          if (status === ApplicationStatus.REJECTED && params && params.length > 3) {
            app.reject_reason = params[2] as string;
          }
          app.updated_at = new Date();
        }
        return { affectedRows: app ? 1 : 0 };
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

const createTestApplication = (
  id: string,
  userId: string,
  type: MerchantType,
  status: ApplicationStatus,
  companyName: string = 'Test Company'
) => {
  const now = new Date();
  applications.set(id, {
    id,
    user_id: userId,
    type,
    company_name: companyName,
    contact_name: 'Test Contact',
    contact_phone: '13800138000',
    business_license: null,
    address: null,
    description: null,
    status,
    reject_reason: status === ApplicationStatus.REJECTED ? 'Test rejection reason' : null,
    reviewed_at: status !== ApplicationStatus.PENDING ? now : null,
    reviewed_by: status !== ApplicationStatus.PENDING ? 'admin-1' : null,
    created_at: now,
    updated_at: now,
  });
};

describe('Merchant Service Property Tests', () => {
  beforeEach(() => {
    // Clear all stores before each test
    users.clear();
    applications.clear();
    jest.clearAllMocks();
  });

  /**
   * Property 23: Merchant Application Status Flow Correctness
   * 
   * For any merchant application:
   * 1. After approval, the user should be recognized as an approved merchant
   * 2. Status transitions should be valid (pending -> approved/rejected)
   * 3. Approved users should not be able to submit new applications of the same type
   * 
   * Validates: Requirements 11.3, 11.4
   */
  describe('Property 23: Merchant Application Status Flow Correctness', () => {
    it('approved application should grant merchant status', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate test scenario
          fc.record({
            merchantType: fc.constantFrom(MerchantType.STORE, MerchantType.SUPPLIER),
            companyName: fc.string({ minLength: 1, maxLength: 50 }),
            contactName: fc.string({ minLength: 1, maxLength: 20 }),
            contactPhone: fc.stringMatching(/^1[3-9]\d{9}$/),
          }),
          async ({ merchantType, companyName, contactName, contactPhone }) => {
            // Setup test user
            const userId = `user-${Date.now()}-${Math.random()}`;
            const adminId = `admin-${Date.now()}`;
            createTestUser(userId);

            // Create application
            const applyFn = merchantType === MerchantType.STORE 
              ? MerchantService.applyForStore 
              : MerchantService.applyForSupplier;

            const application = await applyFn({
              userId,
              companyName,
              contactName,
              contactPhone,
            });

            // Verify initial status is pending
            expect(application.status).toBe(ApplicationStatus.PENDING);

            // Approve the application
            const approvedApp = await MerchantService.reviewApplication(
              application.id,
              true,
              adminId
            );

            // Verify status changed to approved
            expect(approvedApp).not.toBeNull();
            expect(approvedApp!.status).toBe(ApplicationStatus.APPROVED);

            // Verify user is now recognized as approved merchant
            const isApproved = await MerchantService.isApprovedMerchant(userId, merchantType);
            expect(isApproved).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });


    it('rejected application should not grant merchant status', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate test scenario
          fc.record({
            merchantType: fc.constantFrom(MerchantType.STORE, MerchantType.SUPPLIER),
            companyName: fc.string({ minLength: 1, maxLength: 50 }),
            contactName: fc.string({ minLength: 1, maxLength: 20 }),
            contactPhone: fc.stringMatching(/^1[3-9]\d{9}$/),
            rejectReason: fc.string({ minLength: 1, maxLength: 200 }),
          }),
          async ({ merchantType, companyName, contactName, contactPhone, rejectReason }) => {
            // Setup test user
            const userId = `user-reject-${Date.now()}-${Math.random()}`;
            const adminId = `admin-${Date.now()}`;
            createTestUser(userId);

            // Create application
            const applyFn = merchantType === MerchantType.STORE 
              ? MerchantService.applyForStore 
              : MerchantService.applyForSupplier;

            const application = await applyFn({
              userId,
              companyName,
              contactName,
              contactPhone,
            });

            // Reject the application
            const rejectedApp = await MerchantService.reviewApplication(
              application.id,
              false,
              adminId,
              rejectReason
            );

            // Verify status changed to rejected
            expect(rejectedApp).not.toBeNull();
            expect(rejectedApp!.status).toBe(ApplicationStatus.REJECTED);

            // Verify user is NOT recognized as approved merchant
            const isApproved = await MerchantService.isApprovedMerchant(userId, merchantType);
            expect(isApproved).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('approved merchant cannot submit duplicate application of same type', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate test scenario
          fc.record({
            merchantType: fc.constantFrom(MerchantType.STORE, MerchantType.SUPPLIER),
            companyName: fc.string({ minLength: 1, maxLength: 50 }),
            contactName: fc.string({ minLength: 1, maxLength: 20 }),
            contactPhone: fc.stringMatching(/^1[3-9]\d{9}$/),
          }),
          async ({ merchantType, companyName, contactName, contactPhone }) => {
            // Setup test user with approved application
            const userId = `user-approved-${Date.now()}-${Math.random()}`;
            createTestUser(userId);
            createTestApplication(
              `app-approved-${Date.now()}-${Math.random()}`,
              userId,
              merchantType,
              ApplicationStatus.APPROVED,
              'Existing Company'
            );

            // Try to submit another application of the same type
            const applyFn = merchantType === MerchantType.STORE 
              ? MerchantService.applyForStore 
              : MerchantService.applyForSupplier;

            await expect(
              applyFn({
                userId,
                companyName,
                contactName,
                contactPhone,
              })
            ).rejects.toThrow(/already.*approved/i);
          }
        ),
        { numRuns: 100 }
      );
    });


    it('user with pending application cannot submit duplicate application of same type', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate test scenario
          fc.record({
            merchantType: fc.constantFrom(MerchantType.STORE, MerchantType.SUPPLIER),
            companyName: fc.string({ minLength: 1, maxLength: 50 }),
            contactName: fc.string({ minLength: 1, maxLength: 20 }),
            contactPhone: fc.stringMatching(/^1[3-9]\d{9}$/),
          }),
          async ({ merchantType, companyName, contactName, contactPhone }) => {
            // Setup test user with pending application
            const userId = `user-pending-${Date.now()}-${Math.random()}`;
            createTestUser(userId);
            createTestApplication(
              `app-pending-${Date.now()}-${Math.random()}`,
              userId,
              merchantType,
              ApplicationStatus.PENDING,
              'Pending Company'
            );

            // Try to submit another application of the same type
            const applyFn = merchantType === MerchantType.STORE 
              ? MerchantService.applyForStore 
              : MerchantService.applyForSupplier;

            await expect(
              applyFn({
                userId,
                companyName,
                contactName,
                contactPhone,
              })
            ).rejects.toThrow(/pending/i);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('application status should reflect in getApplicationStatus response', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate test scenario
          fc.record({
            hasStoreApp: fc.boolean(),
            hasSupplierApp: fc.boolean(),
            storeStatus: fc.constantFrom(ApplicationStatus.PENDING, ApplicationStatus.APPROVED, ApplicationStatus.REJECTED),
            supplierStatus: fc.constantFrom(ApplicationStatus.PENDING, ApplicationStatus.APPROVED, ApplicationStatus.REJECTED),
          }),
          async ({ hasStoreApp, hasSupplierApp, storeStatus, supplierStatus }) => {
            // Setup test user
            const userId = `user-status-${Date.now()}-${Math.random()}`;
            createTestUser(userId);

            // Create applications based on scenario
            if (hasStoreApp) {
              createTestApplication(
                `app-store-${Date.now()}-${Math.random()}`,
                userId,
                MerchantType.STORE,
                storeStatus,
                'Store Company'
              );
            }

            if (hasSupplierApp) {
              createTestApplication(
                `app-supplier-${Date.now()}-${Math.random()}`,
                userId,
                MerchantType.SUPPLIER,
                supplierStatus,
                'Supplier Company'
              );
            }

            // Get application status
            const status = await MerchantService.getApplicationStatus(userId);

            // Verify status reflects actual applications
            expect(status.hasStoreApplication).toBe(hasStoreApp);
            expect(status.hasSupplierApplication).toBe(hasSupplierApp);

            if (hasStoreApp) {
              expect(status.storeApplication).not.toBeNull();
              expect(status.storeApplication!.status).toBe(storeStatus);
            } else {
              expect(status.storeApplication).toBeNull();
            }

            if (hasSupplierApp) {
              expect(status.supplierApplication).not.toBeNull();
              expect(status.supplierApplication!.status).toBe(supplierStatus);
            } else {
              expect(status.supplierApplication).toBeNull();
            }
          }
        ),
        { numRuns: 100 }
      );
    });


    it('already reviewed application cannot be reviewed again', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate test scenario
          fc.record({
            merchantType: fc.constantFrom(MerchantType.STORE, MerchantType.SUPPLIER),
            initialApproval: fc.boolean(),
            secondApproval: fc.boolean(),
          }),
          async ({ merchantType, initialApproval, secondApproval }) => {
            // Setup test user
            const userId = `user-double-review-${Date.now()}-${Math.random()}`;
            const adminId = `admin-${Date.now()}`;
            createTestUser(userId);

            // Create application with already reviewed status
            const initialStatus = initialApproval ? ApplicationStatus.APPROVED : ApplicationStatus.REJECTED;
            const appId = `app-reviewed-${Date.now()}-${Math.random()}`;
            createTestApplication(
              appId,
              userId,
              merchantType,
              initialStatus,
              'Reviewed Company'
            );

            // Try to review again
            await expect(
              MerchantService.reviewApplication(
                appId,
                secondApproval,
                adminId,
                secondApproval ? undefined : 'Second rejection reason'
              )
            ).rejects.toThrow(/already.*reviewed/i);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('user can apply for both store and supplier independently', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate test scenario
          fc.record({
            companyName: fc.string({ minLength: 1, maxLength: 50 }),
            contactName: fc.string({ minLength: 1, maxLength: 20 }),
            contactPhone: fc.stringMatching(/^1[3-9]\d{9}$/),
          }),
          async ({ companyName, contactName, contactPhone }) => {
            // Setup test user
            const userId = `user-both-${Date.now()}-${Math.random()}`;
            createTestUser(userId);

            // Apply for store
            const storeApp = await MerchantService.applyForStore({
              userId,
              companyName: `Store ${companyName}`,
              contactName,
              contactPhone,
            });

            // Apply for supplier (should succeed independently)
            const supplierApp = await MerchantService.applyForSupplier({
              userId,
              companyName: `Supplier ${companyName}`,
              contactName,
              contactPhone,
            });

            // Verify both applications exist
            expect(storeApp).toBeDefined();
            expect(supplierApp).toBeDefined();
            expect(storeApp.type).toBe(MerchantType.STORE);
            expect(supplierApp.type).toBe(MerchantType.SUPPLIER);

            // Verify status shows both
            const status = await MerchantService.getApplicationStatus(userId);
            expect(status.hasStoreApplication).toBe(true);
            expect(status.hasSupplierApplication).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
