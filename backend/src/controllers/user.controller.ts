import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user.service';
import { UserModel } from '../models/user.model';
import { generateToken } from '../middlewares/auth';
import { AuthenticatedRequest, BusinessErrorCode } from '../types';
import { BadRequestError, NotFoundError } from '../middlewares/errorHandler';

export class UserController {
  // POST /api/user/login - WeChat login
  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { code } = req.body;

      if (!code) {
        throw new BadRequestError('WeChat code is required');
      }

      const result = await UserService.wechatLogin(code);

      res.json({
        success: true,
        data: {
          token: result.token,
          user: {
            id: result.user.id,
            nickname: result.user.nickname,
            avatar: result.user.avatar,
            memberLevel: result.user.memberLevel,
          },
          isNew: result.isNew,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/user/dev-login - Development mode login (no WeChat required)
  static async devLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Only allow in development mode
      if (process.env.NODE_ENV === 'production') {
        throw new BadRequestError('Dev login not available in production');
      }

      const { phone } = req.body;
      const devOpenid = `dev_${phone || 'test_user'}`;

      // Find or create dev user
      const { user, isNew } = await UserModel.findOrCreate({
        openid: devOpenid,
        nickname: phone ? `用户${phone.slice(-4)}` : '测试用户',
      });

      // Generate JWT token
      const token = generateToken({
        userId: user.id,
        openid: user.openid,
      });

      res.json({
        success: true,
        data: {
          token,
          user: {
            id: user.id,
            nickname: user.nickname,
            avatar: user.avatar,
            memberLevel: user.memberLevel,
            balance: user.balance,
            points: user.points,
          },
          isNew,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/user/info - Get current user info
  static async getInfo(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        throw new BadRequestError('User ID not found');
      }

      const userInfo = await UserService.getUserInfo(userId);

      if (!userInfo) {
        throw new NotFoundError('User not found', BusinessErrorCode.USER_NOT_FOUND);
      }

      res.json({
        success: true,
        data: userInfo,
      });
    } catch (error) {
      next(error);
    }
  }

  // PUT /api/user/info - Update current user info
  static async updateInfo(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        throw new BadRequestError('User ID not found');
      }

      const { nickname, avatar, phone } = req.body;

      const userInfo = await UserService.updateUserInfo(userId, {
        nickname,
        avatar,
        phone,
      });

      if (!userInfo) {
        throw new NotFoundError('User not found', BusinessErrorCode.USER_NOT_FOUND);
      }

      res.json({
        success: true,
        data: userInfo,
      });
    } catch (error) {
      next(error);
    }
  }
}
