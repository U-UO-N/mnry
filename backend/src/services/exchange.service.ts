import { ExchangeItemModel, ExchangeOrderModel, ExchangeItem, ExchangeOrder } from '../models/exchange.model';
import { UserModel } from '../models/user.model';
import { PointsRecordModel, RecordType } from '../models/benefits.model';

// Exchange result interface
export interface ExchangeResult {
  success: boolean;
  order?: ExchangeOrder;
  message: string;
}

// Paginated result
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export class ExchangeService {
  // Get all active exchange items
  static async getExchangeItems(): Promise<ExchangeItem[]> {
    return ExchangeItemModel.findActive();
  }

  // Get exchange item by id
  static async getExchangeItemById(itemId: string): Promise<ExchangeItem | null> {
    return ExchangeItemModel.findById(itemId);
  }

  // Perform exchange
  static async exchange(userId: string, itemId: string): Promise<ExchangeResult> {
    // Get user
    const user = await UserModel.findById(userId);
    if (!user) {
      return {
        success: false,
        message: 'User not found',
      };
    }

    // Get exchange item
    const item = await ExchangeItemModel.findById(itemId);
    if (!item) {
      return {
        success: false,
        message: 'Exchange item not found',
      };
    }

    // Check if item is active
    if (!item.isActive) {
      return {
        success: false,
        message: 'Exchange item is not available',
      };
    }

    // Check stock
    if (item.stock <= 0) {
      return {
        success: false,
        message: 'Exchange item is out of stock',
      };
    }

    // Check user points
    if (user.points < item.pointsCost) {
      return {
        success: false,
        message: 'Insufficient points',
      };
    }

    // Create exchange order
    const order = await ExchangeOrderModel.create({
      userId,
      itemId,
      itemName: item.name,
      pointsCost: item.pointsCost,
    });

    // Deduct points from user
    await PointsRecordModel.create(
      {
        userId,
        type: RecordType.EXCHANGE,
        points: -item.pointsCost,
        description: `兑换商品: ${item.name}`,
        relatedId: order.id,
      },
      user.points
    );

    // Update user points
    await UserModel.updatePoints(userId, -item.pointsCost);

    // Decrement item stock
    await ExchangeItemModel.decrementStock(itemId);

    return {
      success: true,
      order,
      message: 'Exchange successful',
    };
  }

  // Get user's exchange orders
  static async getUserExchangeOrders(
    userId: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<PaginatedResult<ExchangeOrder>> {
    const result = await ExchangeOrderModel.findByUser(userId, page, pageSize);

    return {
      items: result.items,
      total: result.total,
      page,
      pageSize,
      totalPages: Math.ceil(result.total / pageSize),
    };
  }
}
