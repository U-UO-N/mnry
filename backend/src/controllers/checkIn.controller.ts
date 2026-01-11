import { Response, NextFunction } from 'express';
import { CheckInService } from '../services/checkIn.service';
import { AuthenticatedRequest, BusinessErrorCode } from '../types';
import { BadRequestError, NotFoundError, BusinessError } from '../middlewares/errorHandler';

export class CheckInController {
  // GET /api/check-in/status - Get check-in status
  static async getStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new BadRequestError('User ID not found');
      }

      const status = await CheckInService.getCheckInStatus(userId);
      if (!status) {
        throw new NotFoundError('User not found', BusinessErrorCode.USER_NOT_FOUND);
      }

      res.json({
        success: true,
        data: status,
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/check-in - Perform check-in
  static async checkIn(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new BadRequestError('User ID not found');
      }

      const result = await CheckInService.checkIn(userId);

      if (!result.success) {
        if (result.message === 'User not found') {
          throw new NotFoundError('User not found', BusinessErrorCode.USER_NOT_FOUND);
        }
        if (result.message === 'Already checked in today') {
          throw new BusinessError('Already checked in today', BusinessErrorCode.ALREADY_CHECKED_IN);
        }
      }

      res.json({
        success: true,
        data: {
          checkIn: result.checkIn,
          pointsEarned: result.pointsEarned,
          bonusPoints: result.bonusPoints,
          totalPoints: result.pointsEarned + result.bonusPoints,
          consecutiveDays: result.consecutiveDays,
          milestone: result.milestone,
        },
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/check-in/calendar - Get check-in calendar
  static async getCalendar(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new BadRequestError('User ID not found');
      }

      const year = parseInt(req.query.year as string) || new Date().getFullYear();
      const month = parseInt(req.query.month as string) || new Date().getMonth() + 1;

      if (month < 1 || month > 12) {
        throw new BadRequestError('Invalid month');
      }

      const checkIns = await CheckInService.getCheckInCalendar(userId, year, month);

      res.json({
        success: true,
        data: {
          year,
          month,
          checkIns,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
