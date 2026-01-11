import { Request, Response, NextFunction } from 'express';
import { GroupBuyService } from '../services/groupBuy.service';
import { NotFoundError, ValidationError } from '../middlewares/errorHandler';
import { BusinessErrorCode, PaginatedResult } from '../types';
import {
  ActivityStatus,
  GroupBuyActivityModel,
  GroupBuyGroupModel,
  GroupBuyOrderModel,
  GroupBuyStatus,
} from '../models/groupBuy.model';

// Statistics interface for group buy activity
export interface GroupBuyActivityStats {
  activityId: string;
  totalGroups: number;
  successGroups: number;
  failedGroups: number;
  inProgressGroups: number;
  totalParticipants: number;
  successRate: number;
  totalSales: number;
}

// Admin Group Buy Service for admin-specific operations
export class AdminGroupBuyService {
  // Get activity statistics
  static async getActivityStats(activityId: string): Promise<GroupBuyActivityStats> {
    const activity = await GroupBuyActivityModel.findById(activityId);
    if (!activity) {
      throw new NotFoundError('Group buy activity not found', BusinessErrorCode.GROUP_BUY_NOT_FOUND);
    }

    const groups = await GroupBuyGroupModel.findByActivityId(activityId);

    let totalGroups = 0;
    let successGroups = 0;
    let failedGroups = 0;
    let inProgressGroups = 0;
    let totalParticipants = 0;

    for (const group of groups) {
      totalGroups++;
      totalParticipants += group.currentCount;

      switch (group.status) {
        case GroupBuyStatus.SUCCESS:
          successGroups++;
          break;
        case GroupBuyStatus.FAILED:
          failedGroups++;
          break;
        case GroupBuyStatus.IN_PROGRESS:
          inProgressGroups++;
          break;
      }
    }

    const successRate = totalGroups > 0 ? (successGroups / totalGroups) * 100 : 0;
    const totalSales = successGroups * activity.requiredCount * activity.groupPrice;

    return {
      activityId,
      totalGroups,
      successGroups,
      failedGroups,
      inProgressGroups,
      totalParticipants,
      successRate: Math.round(successRate * 100) / 100,
      totalSales: Math.round(totalSales * 100) / 100,
    };
  }
}

export class AdminGroupBuyController {
  // GET /api/admin/group-buy/activities - Get activity list with filters
  static async getActivities(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        status,
        productId,
        page = '1',
        pageSize = '20',
      } = req.query;

      // Validate status if provided
      if (status && !Object.values(ActivityStatus).includes(status as ActivityStatus)) {
        throw new ValidationError('Invalid activity status');
      }

      const result = await GroupBuyService.getAllActivities({
        status: status as ActivityStatus | undefined,
        productId: productId as string | undefined,
        page: parseInt(page as string, 10),
        pageSize: parseInt(pageSize as string, 10),
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/admin/group-buy/activities/:id - Get activity detail
  static async getActivityDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const activity = await GroupBuyService.getActivityDetail(id);

      res.json({
        success: true,
        data: activity,
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/admin/group-buy/activities - Create new activity
  static async createActivity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { productId, groupPrice, originalPrice, requiredCount, timeLimit, startTime, endTime } = req.body;

      // Validate required fields
      if (!productId || typeof productId !== 'string') {
        throw new ValidationError('Product ID is required');
      }
      if (groupPrice === undefined || typeof groupPrice !== 'number' || groupPrice <= 0) {
        throw new ValidationError('Valid group price is required');
      }
      if (originalPrice === undefined || typeof originalPrice !== 'number' || originalPrice <= 0) {
        throw new ValidationError('Valid original price is required');
      }
      if (groupPrice >= originalPrice) {
        throw new ValidationError('Group price must be less than original price');
      }
      if (!requiredCount || typeof requiredCount !== 'number' || requiredCount < 2) {
        throw new ValidationError('Required count must be at least 2');
      }
      if (!timeLimit || typeof timeLimit !== 'number' || timeLimit < 1) {
        throw new ValidationError('Time limit must be at least 1 hour');
      }
      if (!startTime) {
        throw new ValidationError('Start time is required');
      }
      if (!endTime) {
        throw new ValidationError('End time is required');
      }

      const startDate = new Date(startTime);
      const endDate = new Date(endTime);

      if (isNaN(startDate.getTime())) {
        throw new ValidationError('Invalid start time format');
      }
      if (isNaN(endDate.getTime())) {
        throw new ValidationError('Invalid end time format');
      }
      if (endDate <= startDate) {
        throw new ValidationError('End time must be after start time');
      }

      const activity = await GroupBuyService.createActivity({
        productId,
        groupPrice,
        originalPrice,
        requiredCount,
        timeLimit,
        startTime: startDate,
        endTime: endDate,
      });

      res.status(201).json({
        success: true,
        data: activity,
      });
    } catch (error) {
      next(error);
    }
  }

  // PUT /api/admin/group-buy/activities/:id - Update activity
  static async updateActivity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { groupPrice, originalPrice, requiredCount, timeLimit, startTime, endTime, status } = req.body;

      // Check if activity exists
      const existingActivity = await GroupBuyActivityModel.findById(id);
      if (!existingActivity) {
        throw new NotFoundError('Group buy activity not found', BusinessErrorCode.GROUP_BUY_NOT_FOUND);
      }

      // Validate fields if provided
      if (groupPrice !== undefined && (typeof groupPrice !== 'number' || groupPrice <= 0)) {
        throw new ValidationError('Group price must be a positive number');
      }
      if (originalPrice !== undefined && (typeof originalPrice !== 'number' || originalPrice <= 0)) {
        throw new ValidationError('Original price must be a positive number');
      }

      // Validate price relationship
      const newGroupPrice = groupPrice ?? existingActivity.groupPrice;
      const newOriginalPrice = originalPrice ?? existingActivity.originalPrice;
      if (newGroupPrice >= newOriginalPrice) {
        throw new ValidationError('Group price must be less than original price');
      }

      if (requiredCount !== undefined && (typeof requiredCount !== 'number' || requiredCount < 2)) {
        throw new ValidationError('Required count must be at least 2');
      }
      if (timeLimit !== undefined && (typeof timeLimit !== 'number' || timeLimit < 1)) {
        throw new ValidationError('Time limit must be at least 1 hour');
      }
      if (status !== undefined && !Object.values(ActivityStatus).includes(status)) {
        throw new ValidationError('Invalid activity status');
      }

      let startDate: Date | undefined;
      let endDate: Date | undefined;

      if (startTime) {
        startDate = new Date(startTime);
        if (isNaN(startDate.getTime())) {
          throw new ValidationError('Invalid start time format');
        }
      }
      if (endTime) {
        endDate = new Date(endTime);
        if (isNaN(endDate.getTime())) {
          throw new ValidationError('Invalid end time format');
        }
      }

      // Validate time relationship
      const newStartTime = startDate ?? existingActivity.startTime;
      const newEndTime = endDate ?? existingActivity.endTime;
      if (newEndTime <= newStartTime) {
        throw new ValidationError('End time must be after start time');
      }

      const activity = await GroupBuyService.updateActivity(id, {
        groupPrice,
        originalPrice,
        requiredCount,
        timeLimit,
        startTime: startDate,
        endTime: endDate,
        status,
      });

      res.json({
        success: true,
        data: activity,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/admin/group-buy/activities/:id/stats - Get activity statistics
  static async getActivityStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const stats = await AdminGroupBuyService.getActivityStats(id);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/admin/group-buy/activities/:id/start - Manually start activity
  static async startActivity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const activity = await GroupBuyService.startActivity(id);

      res.json({
        success: true,
        data: activity,
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/admin/group-buy/activities/:id/end - Manually end activity
  static async endActivity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const activity = await GroupBuyService.endActivity(id);

      res.json({
        success: true,
        data: activity,
      });
    } catch (error) {
      next(error);
    }
  }
}
