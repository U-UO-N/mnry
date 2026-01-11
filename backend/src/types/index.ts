import { Request } from 'express';

// Extend Express Request to include user info
export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    openid?: string;
  };
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: number;
    message: string;
  };
}

// Pagination types
export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Business error codes
export enum BusinessErrorCode {
  // User related 1xxx
  USER_NOT_FOUND = 1001,
  USER_DISABLED = 1002,

  // Product related 2xxx
  PRODUCT_NOT_FOUND = 2001,
  PRODUCT_OFF_SALE = 2002,
  PRODUCT_STOCK_INSUFFICIENT = 2003,

  // Order related 3xxx
  ORDER_NOT_FOUND = 3001,
  ORDER_STATUS_INVALID = 3002,
  ORDER_PAYMENT_TIMEOUT = 3003,

  // Group buy related 4xxx
  GROUP_BUY_NOT_FOUND = 4001,
  GROUP_BUY_FULL = 4002,
  GROUP_BUY_EXPIRED = 4003,

  // Payment related 5xxx
  PAYMENT_FAILED = 5001,
  BALANCE_INSUFFICIENT = 5002,
  POINTS_INSUFFICIENT = 5003,

  // Benefits related 6xxx
  COUPON_NOT_FOUND = 6001,
  COUPON_EXPIRED = 6002,
  COUPON_USED = 6003,
  ALREADY_CHECKED_IN = 6004,

  // Category related 7xxx
  CATEGORY_NOT_FOUND = 7001,
  CATEGORY_HAS_PRODUCTS = 7002,
  CATEGORY_HAS_CHILDREN = 7003,
  CATEGORY_DELETE_FAILED = 7004,
}
