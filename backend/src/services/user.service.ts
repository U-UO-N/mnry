import axios from 'axios';
import { config } from '../config';
import { UserModel, User, UpdateUserDTO } from '../models/user.model';
import { generateToken } from '../middlewares/auth';
import { logger } from '../utils/logger';

// WeChat code2session response
interface WechatSessionResponse {
  openid: string;
  session_key: string;
  unionid?: string;
  errcode?: number;
  errmsg?: string;
}

// Login result
export interface LoginResult {
  token: string;
  user: User;
  isNew: boolean;
}

// User info response
export interface UserInfo {
  id: string;
  nickname: string | null;
  avatar: string | null;
  phone: string | null;
  memberLevel: string;
  balance: number;
  points: number;
}

export class UserService {
  // WeChat login - exchange code for session and create/update user
  static async wechatLogin(code: string): Promise<LoginResult> {
    // Call WeChat API to get openid
    const sessionData = await this.code2Session(code);
    
    // Find or create user
    const { user, isNew } = await UserModel.findOrCreate({
      openid: sessionData.openid,
    });

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      openid: user.openid,
    });

    return { token, user, isNew };
  }

  // Call WeChat code2session API
  private static async code2Session(code: string): Promise<WechatSessionResponse> {
    const url = 'https://api.weixin.qq.com/sns/jscode2session';
    
    try {
      const response = await axios.get<WechatSessionResponse>(url, {
        params: {
          appid: config.wechat.appId,
          secret: config.wechat.secret,
          js_code: code,
          grant_type: 'authorization_code',
        },
      });

      if (response.data.errcode) {
        logger.error('WeChat code2session error', {
          errcode: response.data.errcode,
          errmsg: response.data.errmsg,
        });
        throw new Error(`WeChat login failed: ${response.data.errmsg}`);
      }

      return response.data;
    } catch (error) {
      logger.error('WeChat API call failed', error);
      throw new Error('WeChat login failed');
    }
  }

  // Get user info by ID
  static async getUserInfo(userId: string): Promise<UserInfo | null> {
    const user = await UserModel.findById(userId);
    if (!user) return null;

    return {
      id: user.id,
      nickname: user.nickname,
      avatar: user.avatar,
      phone: user.phone,
      memberLevel: user.memberLevel,
      balance: user.balance,
      points: user.points,
    };
  }

  // Update user info
  static async updateUserInfo(userId: string, data: UpdateUserDTO): Promise<UserInfo | null> {
    const user = await UserModel.update(userId, data);
    if (!user) return null;

    return {
      id: user.id,
      nickname: user.nickname,
      avatar: user.avatar,
      phone: user.phone,
      memberLevel: user.memberLevel,
      balance: user.balance,
      points: user.points,
    };
  }

  // Get user by ID (full user object)
  static async getUser(userId: string): Promise<User | null> {
    return UserModel.findById(userId);
  }
}
