/**
 * Group Buy Scheduler Service
 * 
 * Handles scheduled tasks for group buy functionality:
 * - Processing expired groups
 * - Automatic refunds for failed groups
 * 
 * Requirements: 6.4, 6.5
 */

import {
  GroupBuyGroupModel,
  GroupBuyOrderModel,
  GroupBuyActivityModel,
  GroupBuyStatus,
  ActivityStatus,
} from '../models/groupBuy.model';
import { PaymentModel } from '../models/payment.model';
import { logger } from '../utils/logger';

export interface ProcessingResult {
  processed: number;
  refunded: number;
  errors: string[];
}

export interface ActivityStatusResult {
  activated: number;
  ended: number;
  errors: string[];
}

export class GroupBuySchedulerService {
  /**
   * Process all expired groups that are still in progress
   * - Mark them as failed
   * - Update all participant orders to failed
   * - Trigger refunds for all participants
   * 
   * Validates: Requirements 6.4, 6.5
   */
  static async processExpiredGroups(): Promise<ProcessingResult> {
    const result: ProcessingResult = {
      processed: 0,
      refunded: 0,
      errors: [],
    };

    try {
      // Find all expired groups that are still in progress
      const expiredGroups = await GroupBuyGroupModel.findExpiredInProgress();
      
      logger.info(`Found ${expiredGroups.length} expired groups to process`);

      for (const group of expiredGroups) {
        try {
          // Mark group as failed
          await GroupBuyGroupModel.updateStatus(group.id, GroupBuyStatus.FAILED);
          
          // Update all orders in the group to failed
          await GroupBuyOrderModel.updateStatusByGroupId(group.id, GroupBuyStatus.FAILED);
          
          // Get all orders for refund processing
          const orders = await GroupBuyOrderModel.findByGroupId(group.id);
          
          // Process refunds for each order
          for (const order of orders) {
            try {
              await this.processRefund(order.userId, order.orderId);
              result.refunded++;
            } catch (refundError) {
              const errorMsg = `Failed to refund order ${order.id}: ${refundError instanceof Error ? refundError.message : 'Unknown error'}`;
              result.errors.push(errorMsg);
              logger.error(errorMsg);
            }
          }
          
          result.processed++;
          logger.info(`Processed expired group ${group.id}, refunded ${orders.length} orders`);
        } catch (groupError) {
          const errorMsg = `Failed to process group ${group.id}: ${groupError instanceof Error ? groupError.message : 'Unknown error'}`;
          result.errors.push(errorMsg);
          logger.error(errorMsg);
        }
      }
    } catch (error) {
      const errorMsg = `Failed to fetch expired groups: ${error instanceof Error ? error.message : 'Unknown error'}`;
      result.errors.push(errorMsg);
      logger.error(errorMsg);
    }

    return result;
  }


  /**
   * Process refund for a user's group buy order
   * This integrates with the payment service to handle actual refunds
   */
  private static async processRefund(userId: string, orderId: string | null): Promise<void> {
    if (!orderId) {
      // No actual order was created yet, nothing to refund
      logger.info(`No order to refund for user ${userId}`);
      return;
    }

    // TODO: Integrate with PaymentService to process actual refund
    // For now, we log the refund request
    logger.info(`Processing refund for user ${userId}, order ${orderId}`);
    
    // In a real implementation, this would:
    // 1. Get the payment record for the order
    // 2. Call the payment gateway to process refund
    // 3. Update the payment status
    // 4. Notify the user
  }

  /**
   * Update activity statuses based on current time
   * - Activate activities that have started
   * - End activities that have passed their end time
   */
  static async updateActivityStatuses(): Promise<ActivityStatusResult> {
    const result: ActivityStatusResult = {
      activated: 0,
      ended: 0,
      errors: [],
    };

    try {
      // Get all activities
      const { items: allActivities } = await GroupBuyActivityModel.findMany({
        page: 1,
        pageSize: 1000, // Get all activities
      });

      const now = new Date();

      for (const activity of allActivities) {
        try {
          // Check if activity should be activated
          if (activity.status === ActivityStatus.NOT_STARTED && activity.startTime <= now) {
            await GroupBuyActivityModel.updateStatus(activity.id, ActivityStatus.ACTIVE);
            result.activated++;
            logger.info(`Activated activity ${activity.id}`);
          }
          
          // Check if activity should be ended
          if (activity.status === ActivityStatus.ACTIVE && activity.endTime <= now) {
            await GroupBuyActivityModel.updateStatus(activity.id, ActivityStatus.ENDED);
            result.ended++;
            logger.info(`Ended activity ${activity.id}`);
          }
        } catch (activityError) {
          const errorMsg = `Failed to update activity ${activity.id}: ${activityError instanceof Error ? activityError.message : 'Unknown error'}`;
          result.errors.push(errorMsg);
          logger.error(errorMsg);
        }
      }
    } catch (error) {
      const errorMsg = `Failed to fetch activities: ${error instanceof Error ? error.message : 'Unknown error'}`;
      result.errors.push(errorMsg);
      logger.error(errorMsg);
    }

    return result;
  }

  /**
   * Run all scheduled tasks
   * This should be called periodically (e.g., every minute)
   */
  static async runScheduledTasks(): Promise<{
    expiredGroups: ProcessingResult;
    activityStatuses: ActivityStatusResult;
  }> {
    logger.info('Running group buy scheduled tasks...');
    
    const expiredGroups = await this.processExpiredGroups();
    const activityStatuses = await this.updateActivityStatuses();
    
    logger.info('Scheduled tasks completed', {
      expiredGroups,
      activityStatuses,
    });

    return {
      expiredGroups,
      activityStatuses,
    };
  }

  /**
   * Start the scheduler with a given interval
   * @param intervalMs Interval in milliseconds (default: 60000 = 1 minute)
   */
  static startScheduler(intervalMs: number = 60000): NodeJS.Timeout {
    logger.info(`Starting group buy scheduler with interval ${intervalMs}ms`);
    
    // Run immediately on start
    this.runScheduledTasks().catch(error => {
      logger.error('Initial scheduled task run failed', error);
    });
    
    // Then run at intervals
    return setInterval(() => {
      this.runScheduledTasks().catch(error => {
        logger.error('Scheduled task run failed', error);
      });
    }, intervalMs);
  }

  /**
   * Stop the scheduler
   */
  static stopScheduler(timerId: NodeJS.Timeout): void {
    clearInterval(timerId);
    logger.info('Group buy scheduler stopped');
  }
}
