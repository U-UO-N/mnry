import {
  CartModel,
  CartItem,
  CartItemWithProduct,
  AddToCartDTO,
  UpdateCartItemDTO,
} from '../models/cart.model';
import { ProductModel, ProductSKUModel, ProductStatus } from '../models/product.model';
import { BusinessError } from '../middlewares/errorHandler';
import { BusinessErrorCode } from '../types';

// Cart summary for display
export interface CartSummary {
  items: CartItemWithProduct[];
  totalQuantity: number;
  selectedQuantity: number;
  totalPrice: number;
  selectedPrice: number;
}

export class CartService {
  // Get cart items for a user with summary
  static async getCart(userId: string): Promise<CartSummary> {
    const items = await CartModel.findByUserId(userId);

    let totalQuantity = 0;
    let selectedQuantity = 0;
    let totalPrice = 0;
    let selectedPrice = 0;

    for (const item of items) {
      totalQuantity += item.quantity;
      totalPrice += item.price * item.quantity;

      if (item.selected) {
        selectedQuantity += item.quantity;
        selectedPrice += item.price * item.quantity;
      }
    }

    return {
      items,
      totalQuantity,
      selectedQuantity,
      totalPrice: Math.round(totalPrice * 100) / 100,
      selectedPrice: Math.round(selectedPrice * 100) / 100,
    };
  }

  // Get cart item count
  static async getCartCount(userId: string): Promise<number> {
    return CartModel.getCount(userId);
  }

  // Add item to cart
  static async addToCart(userId: string, data: AddToCartDTO): Promise<CartItem> {
    // Validate product exists and is on sale
    const product = await ProductModel.findById(data.productId);
    if (!product) {
      throw new BusinessError('Product not found', BusinessErrorCode.PRODUCT_NOT_FOUND);
    }
    if (product.status !== ProductStatus.ON_SALE) {
      throw new BusinessError('Product is not available', BusinessErrorCode.PRODUCT_OFF_SALE);
    }

    // Validate SKU if provided
    let availableStock = product.stock;
    if (data.skuId) {
      const sku = await ProductSKUModel.findById(data.skuId);
      if (!sku || sku.productId !== data.productId) {
        throw new BusinessError('Invalid SKU', BusinessErrorCode.PRODUCT_NOT_FOUND);
      }
      availableStock = sku.stock;
    }


    // Check if item already exists in cart
    const existingItem = await CartModel.findByUserProductSku(
      userId,
      data.productId,
      data.skuId || null
    );

    if (existingItem) {
      // Update quantity of existing item
      const newQuantity = existingItem.quantity + data.quantity;

      // Check stock
      if (newQuantity > availableStock) {
        throw new BusinessError(
          'Insufficient stock',
          BusinessErrorCode.PRODUCT_STOCK_INSUFFICIENT
        );
      }

      const updated = await CartModel.updateQuantity(existingItem.id, newQuantity);
      if (!updated) {
        throw new Error('Failed to update cart item');
      }
      return updated;
    }

    // Check stock for new item
    if (data.quantity > availableStock) {
      throw new BusinessError(
        'Insufficient stock',
        BusinessErrorCode.PRODUCT_STOCK_INSUFFICIENT
      );
    }

    // Create new cart item
    return CartModel.create(userId, data);
  }

  // Update cart item quantity
  static async updateCartItem(
    userId: string,
    itemId: string,
    data: UpdateCartItemDTO
  ): Promise<CartItem> {
    // Verify cart item belongs to user
    const cartItem = await CartModel.findById(itemId);
    if (!cartItem || cartItem.userId !== userId) {
      throw new BusinessError('Cart item not found', BusinessErrorCode.PRODUCT_NOT_FOUND);
    }

    // If updating quantity, validate stock
    if (data.quantity !== undefined) {
      if (data.quantity <= 0) {
        throw new BusinessError('Quantity must be greater than 0', BusinessErrorCode.PRODUCT_STOCK_INSUFFICIENT);
      }

      let availableStock: number;
      if (cartItem.skuId) {
        const sku = await ProductSKUModel.findById(cartItem.skuId);
        availableStock = sku?.stock || 0;
      } else {
        const product = await ProductModel.findById(cartItem.productId);
        availableStock = product?.stock || 0;
      }

      if (data.quantity > availableStock) {
        throw new BusinessError(
          'Insufficient stock',
          BusinessErrorCode.PRODUCT_STOCK_INSUFFICIENT
        );
      }
    }

    const updated = await CartModel.update(itemId, data);
    if (!updated) {
      throw new Error('Failed to update cart item');
    }
    return updated;
  }

  // Remove item from cart
  static async removeCartItem(userId: string, itemId: string): Promise<boolean> {
    // Verify cart item belongs to user
    const cartItem = await CartModel.findById(itemId);
    if (!cartItem || cartItem.userId !== userId) {
      throw new BusinessError('Cart item not found', BusinessErrorCode.PRODUCT_NOT_FOUND);
    }

    return CartModel.delete(itemId);
  }

  // Clear cart
  static async clearCart(userId: string): Promise<boolean> {
    return CartModel.clearByUserId(userId);
  }

  // Select/deselect all items
  static async selectAll(userId: string, selected: boolean): Promise<boolean> {
    return CartModel.selectAll(userId, selected);
  }

  // Get selected cart items for checkout
  static async getSelectedItems(userId: string): Promise<CartItemWithProduct[]> {
    const items = await CartModel.findByUserId(userId);
    return items.filter(item => item.selected);
  }

  // Calculate total price for selected items
  static calculateTotalPrice(items: CartItemWithProduct[]): number {
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    return Math.round(total * 100) / 100;
  }
}
