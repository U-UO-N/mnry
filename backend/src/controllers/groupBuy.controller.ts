import { Response, NextFunction } from 'express';
import { GroupBuyService } from '../services/groupBuy.service';
import { GroupBuyStatus } from '../models/groupBuy.model';
import { AuthenticatedRequest } from '../types';
import { BadRequestError, UnauthorizedError } from '../middlewares/errorHandler';

export class GroupBuyController {
  // GET /api/group-buy/activities - Get active group buy activities
  static async getActivities(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { page, pageSize } = req.query;

      const result = await GroupBuyService.getActivities(
        page ? parseInt(page as string, 10) : 1,
        pageSize ? parseInt(pageSize as string, 10) : 20
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/group-buy/activities/:id - Get activity detail
  static async getActivityDetail(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
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

  // GET /api/group-buy/activities/:id/groups - Get available groups for an activity
  static async getAvailableGroups(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;

      const groups = await GroupBuyService.getAvailableGroups(id);

      res.json({
        success: true,
        data: groups,
      });
    } catch (error) {
      next(error);
    }
  }


  // POST /api/group-buy/initiate - Initiate a new group buy
  static async initiateGroupBuy(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new UnauthorizedError('User not authenticated');
      }

      const { activityId } = req.body;
      if (!activityId) {
        throw new BadRequestError('Activity ID is required');
      }

      const group = await GroupBuyService.initiateGroupBuy(userId, activityId);

      res.status(201).json({
        success: true,
        data: group,
        message: 'Group buy initiated successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/group-buy/join/:groupId - Join an existing group
  static async joinGroupBuy(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new UnauthorizedError('User not authenticated');
      }

      const { groupId } = req.params;

      const group = await GroupBuyService.joinGroupBuy(userId, groupId);

      res.json({
        success: true,
        data: group,
        message: 'Joined group buy successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/group-buy/my - Get user's group buy orders
  static async getMyGroupBuys(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new UnauthorizedError('User not authenticated');
      }

      const { status } = req.query;

      // Validate status if provided
      let groupBuyStatus: GroupBuyStatus | undefined;
      if (status && typeof status === 'string') {
        if (!Object.values(GroupBuyStatus).includes(status as GroupBuyStatus)) {
          throw new BadRequestError('Invalid group buy status');
        }
        groupBuyStatus = status as GroupBuyStatus;
      }

      const orders = await GroupBuyService.getMyGroupBuys(userId, groupBuyStatus);

      res.json({
        success: true,
        data: orders,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/group-buy/groups/:groupId - Get group detail
  static async getGroupDetail(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { groupId } = req.params;

      const group = await GroupBuyService.getGroupDetail(groupId);

      res.json({
        success: true,
        data: group,
      });
    } catch (error) {
      next(error);
    }
  }
}
