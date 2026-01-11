import { Request, Response, NextFunction } from 'express';
import { AdminUserService } from '../services/adminUser.service';
import { NotFoundError, ValidationError } from '../middlewares/errorHandler';
import { MemberLevel } from '../models/user.model';
import { ApplicationStatus, MerchantType } from '../models/merchant.model';
import { AuthenticatedRequest } from '../types';

export class AdminUserController {
  // GET /api/admin/users - Get user list
  static async getUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        keyword,
        memberLevel,
        page = '1',
        pageSize = '20',
      } = req.query;

      // Validate memberLevel if provided
      if (memberLevel && !Object.values(MemberLevel).includes(memberLevel as MemberLevel)) {
        throw new ValidationError('Invalid member level');
      }

      const result = await AdminUserService.getUsers({
        keyword: keyword as string | undefined,
        memberLevel: memberLevel as MemberLevel | undefined,
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

  // GET /api/admin/users/:id - Get user detail
  static async getUserDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      const user = await AdminUserService.getUserDetail(id);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  // PUT /api/admin/users/:id/points - Adjust user points
  static async adjustPoints(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { points, reason } = req.body;
      const adminId = req.user?.userId || 'admin';

      // Validate points
      if (typeof points !== 'number' || !Number.isInteger(points)) {
        throw new ValidationError('Points must be an integer');
      }

      // Validate reason
      if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
        throw new ValidationError('Reason is required');
      }

      const result = await AdminUserService.adjustPoints(id, {
        points,
        reason: reason.trim(),
        adminId,
      });

      res.json({
        success: true,
        data: {
          user: result.user,
          record: result.record,
        },
        message: `Points adjusted by ${points >= 0 ? '+' : ''}${points}`,
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'User not found') {
        return next(new NotFoundError('User not found'));
      }
      next(error);
    }
  }

  // PUT /api/admin/users/:id/balance - Adjust user balance
  static async adjustBalance(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { amount, reason } = req.body;
      const adminId = req.user?.userId || 'admin';

      // Validate amount
      if (typeof amount !== 'number' || isNaN(amount)) {
        throw new ValidationError('Amount must be a number');
      }

      // Validate reason
      if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
        throw new ValidationError('Reason is required');
      }

      const result = await AdminUserService.adjustBalance(id, {
        amount,
        reason: reason.trim(),
        adminId,
      });

      res.json({
        success: true,
        data: {
          user: result.user,
          record: result.record,
        },
        message: `Balance adjusted by ${amount >= 0 ? '+' : ''}${amount.toFixed(2)}`,
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'User not found') {
        return next(new NotFoundError('User not found'));
      }
      next(error);
    }
  }

  // PUT /api/admin/users/:id/member-level - Adjust user member level
  static async adjustMemberLevel(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { memberLevel, reason } = req.body;

      // Validate memberLevel
      if (!memberLevel || !Object.values(MemberLevel).includes(memberLevel as MemberLevel)) {
        throw new ValidationError('Invalid member level');
      }

      // Validate reason
      if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
        throw new ValidationError('Reason is required');
      }

      const user = await AdminUserService.adjustMemberLevel(id, memberLevel as MemberLevel);

      res.json({
        success: true,
        data: user,
        message: `Member level updated to ${memberLevel}`,
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'User not found') {
        return next(new NotFoundError('User not found'));
      }
      next(error);
    }
  }

  // GET /api/admin/merchant/applications - Get merchant applications list
  static async getMerchantApplications(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        type,
        status,
        page = '1',
        pageSize = '20',
      } = req.query;

      // Validate type if provided
      if (type && !Object.values(MerchantType).includes(type as MerchantType)) {
        throw new ValidationError('Invalid merchant type');
      }

      // Validate status if provided
      if (status && !Object.values(ApplicationStatus).includes(status as ApplicationStatus)) {
        throw new ValidationError('Invalid application status');
      }

      const result = await AdminUserService.getMerchantApplications({
        type: type as MerchantType | undefined,
        status: status as ApplicationStatus | undefined,
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

  // POST /api/admin/merchant/applications/:id/review - Review merchant application
  static async reviewApplication(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { approved, rejectReason } = req.body;
      const reviewedBy = req.user?.userId || 'admin';

      // Validate approved field
      if (typeof approved !== 'boolean') {
        throw new ValidationError('Approved field must be a boolean');
      }

      // Validate rejectReason if not approved
      if (!approved && (!rejectReason || typeof rejectReason !== 'string')) {
        throw new ValidationError('Reject reason is required when rejecting application');
      }

      const application = await AdminUserService.reviewApplication(
        id,
        approved,
        reviewedBy,
        rejectReason
      );

      res.json({
        success: true,
        data: application,
        message: approved ? 'Application approved successfully' : 'Application rejected',
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Application not found') {
          return next(new NotFoundError('Application not found'));
        }
        if (error.message === 'Application is not in pending status') {
          return next(new ValidationError('Application is not in pending status'));
        }
      }
      next(error);
    }
  }
}
