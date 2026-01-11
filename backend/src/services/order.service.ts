import {
  OrderModel,
  OrderItemModel,
  LogisticsModel,
  Order,
  OrderDetail,
  OrderStatus,
  CreateOrderDTO,
  OrderQuery,
  AddressSnapshot,
  CreateLogisticsDTO,
} from '../models/order.model';
import { CartModel, CartItemWithProduct } from '../models/cart.model';
import { ProductModel, ProductSKUModel, ProductStatus } from '../models/product.model';
import { UserModel } from '../models/user.model';
import { AddressModel } from '../models/address.model';
import { BusinessError } from '../middlewares/errorHandler';
import { BusinessErrorCode, PaginatedResult } from '../types';

// DTO for creating order from cart
export interface CreateOrderFromCartDTO {
  cartItemIds: string[];
  addressSnapshot: AddressSnapshot;
  couponId?: string;
  pointsUsed?: number;
  balanceUsed?: number;
  remark?: string;
}

// DTO for creating order directly (for group buy)
export interface CreateOrderDirectDTO {
  items: { productId: string; quantity: number }[];
  addressId: string;
  couponId?: string;
  pointsUsed?: number;
  balanceUsed?: number;
  remark?: string;
  groupBuyGroupId?: string;
  groupBuyPrice?: number;
}

// Discount calculation result
export interface DiscountCalculation {
  totalAmount: number;
  pointsDiscount: number;
  balanceDiscount: number;
  couponDiscount: number;
  discountAmount: number;
  payAmount: number;
}


export class OrderService {
  // Calculate discount for order
  static calculateDiscount(
    totalAmount: number,
    pointsUsed: number = 0,
    balanceUsed: number = 0,
    couponDiscount: number = 0
  ): DiscountCalculation {
    // Points conversion: 100 points = 1 yuan
    const pointsDiscount = Math.floor(pointsUsed) / 100;
    
    // Calculate total discount
    const discountAmount = pointsDiscount + balanceUsed + couponDiscount;
    
    // Calculate pay amount (cannot be negative)
    const payAmount = Math.max(0, totalAmount - discountAmount);
    
    return {
      totalAmount: Math.round(totalAmount * 100) / 100,
      pointsDiscount: Math.round(pointsDiscount * 100) / 100,
      balanceDiscount: Math.round(balanceUsed * 100) / 100,
      couponDiscount: Math.round(couponDiscount * 100) / 100,
      discountAmount: Math.round(discountAmount * 100) / 100,
      payAmount: Math.round(payAmount * 100) / 100,
    };
  }

  // Validate and get cart items for order
  private static async validateCartItems(
    userId: string,
    cartItemIds: string[]
  ): Promise<CartItemWithProduct[]> {
    const allCartItems = await CartModel.findByUserId(userId);
    const selectedItems = allCartItems.filter(item => cartItemIds.includes(item.id));

    if (selectedItems.length === 0) {
      throw new BusinessError('No valid cart items selected', BusinessErrorCode.ORDER_STATUS_INVALID);
    }

    // Validate each item
    for (const item of selectedItems) {
      // Check product status
      if (item.productStatus !== ProductStatus.ON_SALE) {
        throw new BusinessError(
          `Product "${item.productName}" is not available`,
          BusinessErrorCode.PRODUCT_OFF_SALE
        );
      }

      // Check stock
      if (item.quantity > item.stock) {
        throw new BusinessError(
          `Insufficient stock for "${item.productName}"`,
          BusinessErrorCode.PRODUCT_STOCK_INSUFFICIENT
        );
      }
    }

    return selectedItems;
  }


  // Create order from cart items
  static async createOrder(userId: string, data: CreateOrderFromCartDTO): Promise<Order> {
    // Validate cart items
    const cartItems = await this.validateCartItems(userId, data.cartItemIds);

    // Calculate total amount
    const totalAmount = cartItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    // Validate user balance and points if used
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new BusinessError('User not found', BusinessErrorCode.USER_NOT_FOUND);
    }

    // Validate points
    const pointsUsed = data.pointsUsed || 0;
    if (pointsUsed > 0 && pointsUsed > user.points) {
      throw new BusinessError('Insufficient points', BusinessErrorCode.POINTS_INSUFFICIENT);
    }

    // Validate balance
    const balanceUsed = data.balanceUsed || 0;
    if (balanceUsed > 0 && balanceUsed > user.balance) {
      throw new BusinessError('Insufficient balance', BusinessErrorCode.BALANCE_INSUFFICIENT);
    }

    // Calculate discount (coupon discount would be calculated here if implemented)
    const discount = this.calculateDiscount(totalAmount, pointsUsed, balanceUsed, 0);

    // Deduct stock for each item
    for (const item of cartItems) {
      if (item.skuId) {
        await ProductSKUModel.updateStock(item.skuId, -item.quantity);
      } else {
        await ProductModel.updateStock(item.productId, -item.quantity);
      }
      // Increment sales
      await ProductModel.incrementSales(item.productId, item.quantity);
    }

    // Deduct user points and balance
    if (pointsUsed > 0) {
      await UserModel.updatePoints(userId, -pointsUsed);
    }
    if (balanceUsed > 0) {
      await UserModel.updateBalance(userId, -balanceUsed);
    }

    // Create order
    const orderData: CreateOrderDTO = {
      userId,
      items: cartItems.map(item => ({
        productId: item.productId,
        skuId: item.skuId || undefined,
        productName: item.productName,
        productImage: item.productImage,
        specValues: item.specValues || undefined,
        price: item.price,
        quantity: item.quantity,
      })),
      addressSnapshot: data.addressSnapshot,
      couponId: data.couponId,
      pointsUsed,
      balanceUsed,
      remark: data.remark,
    };

    const order = await OrderModel.create(orderData);

    // Remove items from cart
    for (const item of cartItems) {
      await CartModel.delete(item.id);
    }

    return order;
  }

  // Create order directly (for group buy, without cart)
  static async createOrderDirect(userId: string, data: CreateOrderDirectDTO): Promise<Order> {
    // Get address
    const address = await AddressModel.findById(data.addressId);
    if (!address || address.userId !== userId) {
      throw new BusinessError('Address not found', BusinessErrorCode.ADDRESS_NOT_FOUND);
    }

    // Validate and get product info
    const orderItems: { productId: string; productName: string; productImage: string; price: number; quantity: number }[] = [];
    let totalAmount = 0;

    for (const item of data.items) {
      const product = await ProductModel.findById(item.productId);
      if (!product) {
        throw new BusinessError('Product not found', BusinessErrorCode.PRODUCT_NOT_FOUND);
      }
      if (product.status !== ProductStatus.ON_SALE) {
        throw new BusinessError(`Product "${product.name}" is not available`, BusinessErrorCode.PRODUCT_OFF_SALE);
      }
      if (item.quantity > product.stock) {
        throw new BusinessError(`Insufficient stock for "${product.name}"`, BusinessErrorCode.PRODUCT_STOCK_INSUFFICIENT);
      }

      // Use group buy price if provided, otherwise use product price
      const price = data.groupBuyPrice !== undefined ? data.groupBuyPrice : product.price;
      
      orderItems.push({
        productId: item.productId,
        productName: product.name,
        productImage: product.mainImage,
        price,
        quantity: item.quantity,
      });
      
      totalAmount += price * item.quantity;
    }

    // Validate user
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new BusinessError('User not found', BusinessErrorCode.USER_NOT_FOUND);
    }

    // Calculate discount
    const pointsUsed = data.pointsUsed || 0;
    const balanceUsed = data.balanceUsed || 0;
    const discount = this.calculateDiscount(totalAmount, pointsUsed, balanceUsed, 0);

    // Deduct stock
    for (const item of data.items) {
      await ProductModel.updateStock(item.productId, -item.quantity);
      await ProductModel.incrementSales(item.productId, item.quantity);
    }

    // Deduct user points and balance
    if (pointsUsed > 0) {
      await UserModel.updatePoints(userId, -pointsUsed);
    }
    if (balanceUsed > 0) {
      await UserModel.updateBalance(userId, -balanceUsed);
    }

    // Create order
    const orderData: CreateOrderDTO = {
      userId,
      items: orderItems.map(item => ({
        productId: item.productId,
        productName: item.productName,
        productImage: item.productImage,
        price: item.price,
        quantity: item.quantity,
      })),
      addressSnapshot: {
        name: address.name,
        phone: address.phone,
        province: address.province || '',
        city: address.city || '',
        district: address.district || '',
        address: address.detail || '',
      },
      couponId: data.couponId,
      pointsUsed,
      balanceUsed,
      remark: data.remark,
    };

    const order = await OrderModel.create(orderData);
    return order;
  }


  // Get orders for a user with pagination
  static async getOrders(
    userId: string,
    status?: OrderStatus,
    page: number = 1,
    pageSize: number = 20
  ): Promise<PaginatedResult<Order>> {
    const query: OrderQuery = {
      userId,
      status,
      page,
      pageSize,
    };

    const result = await OrderModel.findMany(query);

    return {
      items: result.items,
      total: result.total,
      page,
      pageSize,
      totalPages: Math.ceil(result.total / pageSize),
    };
  }

  // Get order detail
  static async getOrderDetail(orderId: string, userId?: string): Promise<OrderDetail> {
    const order = await OrderModel.getDetail(orderId);
    if (!order) {
      throw new BusinessError('Order not found', BusinessErrorCode.ORDER_NOT_FOUND);
    }

    // Verify ownership if userId provided
    if (userId && order.userId !== userId) {
      throw new BusinessError('Order not found', BusinessErrorCode.ORDER_NOT_FOUND);
    }

    return order;
  }

  // Cancel order
  static async cancelOrder(orderId: string, userId: string): Promise<Order> {
    const order = await OrderModel.findById(orderId);
    if (!order) {
      throw new BusinessError('Order not found', BusinessErrorCode.ORDER_NOT_FOUND);
    }

    // Verify ownership
    if (order.userId !== userId) {
      throw new BusinessError('Order not found', BusinessErrorCode.ORDER_NOT_FOUND);
    }

    // Only pending_payment orders can be cancelled
    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new BusinessError(
        'Only pending payment orders can be cancelled',
        BusinessErrorCode.ORDER_STATUS_INVALID
      );
    }

    // Restore stock
    const items = await OrderItemModel.findByOrderId(orderId);
    for (const item of items) {
      if (item.skuId) {
        await ProductSKUModel.updateStock(item.skuId, item.quantity);
      } else {
        await ProductModel.updateStock(item.productId, item.quantity);
      }
      // Decrement sales
      await ProductModel.incrementSales(item.productId, -item.quantity);
    }

    // Restore user points and balance
    if (order.pointsUsed > 0) {
      await UserModel.updatePoints(userId, order.pointsUsed);
    }
    if (order.balanceUsed > 0) {
      await UserModel.updateBalance(userId, order.balanceUsed);
    }

    const cancelled = await OrderModel.cancel(orderId);
    if (!cancelled) {
      throw new Error('Failed to cancel order');
    }
    return cancelled;
  }


  // Confirm receipt
  static async confirmReceipt(orderId: string, userId: string): Promise<Order> {
    const order = await OrderModel.findById(orderId);
    if (!order) {
      throw new BusinessError('Order not found', BusinessErrorCode.ORDER_NOT_FOUND);
    }

    // Verify ownership
    if (order.userId !== userId) {
      throw new BusinessError('Order not found', BusinessErrorCode.ORDER_NOT_FOUND);
    }

    // Only shipped orders can be confirmed
    if (order.status !== OrderStatus.SHIPPED) {
      throw new BusinessError(
        'Only shipped orders can be confirmed',
        BusinessErrorCode.ORDER_STATUS_INVALID
      );
    }

    const completed = await OrderModel.updateStatus(orderId, OrderStatus.COMPLETED);
    if (!completed) {
      throw new Error('Failed to confirm receipt');
    }
    return completed;
  }

  // Apply for refund
  static async applyRefund(orderId: string, userId: string): Promise<Order> {
    const order = await OrderModel.findById(orderId);
    if (!order) {
      throw new BusinessError('Order not found', BusinessErrorCode.ORDER_NOT_FOUND);
    }

    // Verify ownership
    if (order.userId !== userId) {
      throw new BusinessError('Order not found', BusinessErrorCode.ORDER_NOT_FOUND);
    }

    // Only completed orders can apply for refund
    if (order.status !== OrderStatus.COMPLETED) {
      throw new BusinessError(
        'Only completed orders can apply for refund',
        BusinessErrorCode.ORDER_STATUS_INVALID
      );
    }

    const refunding = await OrderModel.updateStatus(orderId, OrderStatus.REFUNDING);
    if (!refunding) {
      throw new Error('Failed to apply for refund');
    }
    return refunding;
  }

  // Ship order (admin)
  static async shipOrder(orderId: string, logistics: CreateLogisticsDTO): Promise<Order> {
    const order = await OrderModel.findById(orderId);
    if (!order) {
      throw new BusinessError('Order not found', BusinessErrorCode.ORDER_NOT_FOUND);
    }

    // Only pending_shipment orders can be shipped
    if (order.status !== OrderStatus.PENDING_SHIPMENT) {
      throw new BusinessError(
        'Only pending shipment orders can be shipped',
        BusinessErrorCode.ORDER_STATUS_INVALID
      );
    }

    // Create logistics record
    await LogisticsModel.create({
      orderId,
      company: logistics.company,
      trackingNo: logistics.trackingNo,
    });

    const shipped = await OrderModel.updateStatus(orderId, OrderStatus.SHIPPED);
    if (!shipped) {
      throw new Error('Failed to ship order');
    }
    return shipped;
  }

  // Get allowed operations for order status
  static getAllowedOperations(status: OrderStatus): string[] {
    switch (status) {
      case OrderStatus.PENDING_PAYMENT:
        return ['pay', 'cancel'];
      case OrderStatus.PENDING_SHIPMENT:
        return [];
      case OrderStatus.SHIPPED:
        return ['confirm'];
      case OrderStatus.COMPLETED:
        return ['refund', 'review'];
      case OrderStatus.CANCELLED:
        return [];
      case OrderStatus.REFUNDING:
        return [];
      case OrderStatus.REFUNDED:
        return [];
      default:
        return [];
    }
  }
}
