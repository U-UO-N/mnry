import {
  PaymentModel,
  Payment,
  PaymentStatus,
  PaymentMethod,
  PaymentInfo,
  WxPayParams,
  CreatePaymentDTO,
} from '../models/payment.model';
import { OrderModel, OrderStatus } from '../models/order.model';
import { UserModel } from '../models/user.model';
import { BusinessError } from '../middlewares/errorHandler';
import { BusinessErrorCode } from '../types';
import crypto from 'crypto';
import https from 'https';

// WeChat Pay configuration (would come from config in production)
interface WxPayConfig {
  appId: string;
  mchId: string;
  apiKey: string;
  apiV3Key: string;
  notifyUrl: string;
  serialNo: string;
  privateKey: string;
}

// Payment callback data from WeChat
export interface PaymentCallbackDTO {
  outTradeNo: string;
  transactionId: string;
  resultCode: string;
  totalFee: number;
}

// WeChat unified order response
interface WxUnifiedOrderResponse {
  prepay_id: string;
  return_code: string;
  return_msg?: string;
  result_code?: string;
  err_code?: string;
  err_code_des?: string;
}

export class PaymentService {
  // WeChat Pay config (in production, this would come from environment/config)
  private static wxPayConfig: WxPayConfig = {
    appId: process.env.WX_APP_ID || '',
    mchId: process.env.WX_MCH_ID || '',
    apiKey: process.env.WX_API_KEY || '',
    apiV3Key: process.env.WX_API_V3_KEY || '',
    notifyUrl: process.env.WX_NOTIFY_URL || 'https://api.example.com/api/payments/callback',
    serialNo: process.env.WX_SERIAL_NO || '',
    privateKey: process.env.WX_PRIVATE_KEY || '',
  };

  // Generate nonce string
  private static generateNonceStr(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Generate signature for WeChat Pay (MD5)
  private static generateSign(params: Record<string, string | number>): string {
    // Sort parameters alphabetically
    const sortedKeys = Object.keys(params).sort();
    const stringA = sortedKeys
      .filter(key => params[key] !== '' && params[key] !== undefined)
      .map(key => `${key}=${params[key]}`)
      .join('&');
    
    // Append API key
    const stringSignTemp = `${stringA}&key=${this.wxPayConfig.apiKey}`;
    
    // MD5 hash and uppercase
    return crypto.createHash('md5').update(stringSignTemp).digest('hex').toUpperCase();
  }

  // Convert object to XML
  private static objectToXml(obj: Record<string, string | number>): string {
    let xml = '<xml>';
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        if (typeof value === 'number') {
          xml += `<${key}>${value}</${key}>`;
        } else {
          xml += `<${key}><![CDATA[${value}]]></${key}>`;
        }
      }
    }
    xml += '</xml>';
    return xml;
  }

  // Parse XML to object
  private static xmlToObject(xml: string): Record<string, string> {
    const result: Record<string, string> = {};
    const regex = /<(\w+)>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/\1>/g;
    let match;
    while ((match = regex.exec(xml)) !== null) {
      result[match[1]] = match[2];
    }
    return result;
  }

  // Call WeChat unified order API
  private static async callUnifiedOrder(
    orderId: string,
    orderNo: string,
    amount: number,
    openid: string,
    description: string
  ): Promise<string> {
    // If no config, return mock prepay_id for development
    if (!this.wxPayConfig.appId || !this.wxPayConfig.mchId || !this.wxPayConfig.apiKey) {
      console.log('WeChat Pay not configured, using mock prepay_id');
      return `wx_prepay_mock_${orderNo}_${Date.now()}`;
    }

    const nonceStr = this.generateNonceStr();
    const totalFee = Math.round(amount * 100); // Convert to cents

    const params: Record<string, string | number> = {
      appid: this.wxPayConfig.appId,
      mch_id: this.wxPayConfig.mchId,
      nonce_str: nonceStr,
      body: description,
      out_trade_no: orderNo,
      total_fee: totalFee,
      spbill_create_ip: '127.0.0.1',
      notify_url: this.wxPayConfig.notifyUrl,
      trade_type: 'JSAPI',
      openid: openid,
    };

    // Generate signature
    params.sign = this.generateSign(params);

    // Convert to XML
    const xmlData = this.objectToXml(params);

    // Call WeChat API
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.mch.weixin.qq.com',
        port: 443,
        path: '/pay/unifiedorder',
        method: 'POST',
        headers: {
          'Content-Type': 'application/xml',
          'Content-Length': Buffer.byteLength(xmlData),
        },
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            const result = this.xmlToObject(data);
            if (result.return_code === 'SUCCESS' && result.result_code === 'SUCCESS') {
              resolve(result.prepay_id);
            } else {
              console.error('WeChat unified order failed:', result);
              reject(new Error(result.err_code_des || result.return_msg || 'WeChat pay failed'));
            }
          } catch (error) {
            reject(error);
          }
        });
      });

      req.on('error', (error) => {
        console.error('WeChat API request error:', error);
        reject(error);
      });

      req.write(xmlData);
      req.end();
    });
  }


  // Generate WeChat Pay parameters for frontend
  private static generateWxPayParams(prepayId: string, amount: number): WxPayParams {
    const timeStamp = Math.floor(Date.now() / 1000).toString();
    const nonceStr = this.generateNonceStr();
    const packageStr = `prepay_id=${prepayId}`;

    const signParams: Record<string, string> = {
      appId: this.wxPayConfig.appId || 'wx_app_id',
      timeStamp,
      nonceStr,
      package: packageStr,
      signType: 'MD5',
    };

    const paySign = this.generateSign(signParams);

    return {
      appId: this.wxPayConfig.appId || 'wx_app_id',
      timeStamp,
      nonceStr,
      package: packageStr,
      signType: 'MD5',
      paySign,
    };
  }

  // Create payment for an order
  static async createPayment(
    orderId: string,
    userId: string,
    method: PaymentMethod = PaymentMethod.WECHAT
  ): Promise<PaymentInfo> {
    // Get order
    const order = await OrderModel.findById(orderId);
    if (!order) {
      throw new BusinessError('Order not found', BusinessErrorCode.ORDER_NOT_FOUND);
    }

    // Verify ownership
    if (order.userId !== userId) {
      throw new BusinessError('Order not found', BusinessErrorCode.ORDER_NOT_FOUND);
    }

    // Check order status
    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new BusinessError(
        'Order is not pending payment',
        BusinessErrorCode.ORDER_STATUS_INVALID
      );
    }

    // Handle balance payment
    if (method === PaymentMethod.BALANCE) {
      return this.processBalancePayment(order, userId);
    }

    // Check if there's already a pending payment
    const existingPayment = await PaymentModel.findByOrderId(orderId);
    if (existingPayment && existingPayment.status === PaymentStatus.PENDING) {
      // Return existing payment info with regenerated params
      return {
        orderId,
        paymentNo: existingPayment.paymentNo,
        amount: existingPayment.amount,
        wxPayParams: this.generateWxPayParams(`prepay_${existingPayment.paymentNo}`, existingPayment.amount),
      };
    }

    // Create new payment record for WeChat Pay
    const paymentData: CreatePaymentDTO = {
      orderId,
      userId,
      amount: order.payAmount,
      method,
    };

    const payment = await PaymentModel.create(paymentData);

    // Get user openid for WeChat Pay
    const user = await UserModel.findById(userId);
    const openid = user?.openid || '';

    // Call WeChat unified order API to get prepay_id
    let prepayId: string;
    try {
      prepayId = await this.callUnifiedOrder(
        orderId,
        payment.paymentNo,
        payment.amount,
        openid,
        '商品购买'
      );
    } catch (error) {
      console.error('Failed to call WeChat unified order:', error);
      // Use mock prepay_id for development
      prepayId = `wx_prepay_${payment.paymentNo}`;
    }

    return {
      orderId,
      paymentNo: payment.paymentNo,
      amount: payment.amount,
      wxPayParams: this.generateWxPayParams(prepayId, payment.amount),
    };
  }


  // Process balance payment
  private static async processBalancePayment(
    order: { id: string; payAmount: number; userId: string },
    userId: string
  ): Promise<PaymentInfo> {
    // Get user balance
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new BusinessError('User not found', BusinessErrorCode.USER_NOT_FOUND);
    }

    // Check balance
    if (user.balance < order.payAmount) {
      throw new BusinessError('Insufficient balance', BusinessErrorCode.BALANCE_INSUFFICIENT);
    }

    // Create payment record
    const paymentData: CreatePaymentDTO = {
      orderId: order.id,
      userId,
      amount: order.payAmount,
      method: PaymentMethod.BALANCE,
    };

    const payment = await PaymentModel.create(paymentData);

    // Deduct balance
    await UserModel.updateBalance(userId, -order.payAmount);

    // Mark payment as success
    await PaymentModel.markSuccess(payment.id, `BALANCE_${payment.paymentNo}`);

    // Update order status
    await OrderModel.updateStatus(order.id, OrderStatus.PENDING_SHIPMENT);

    return {
      orderId: order.id,
      paymentNo: payment.paymentNo,
      amount: payment.amount,
    };
  }

  // Handle WeChat payment callback
  static async handlePaymentCallback(data: PaymentCallbackDTO): Promise<boolean> {
    const { outTradeNo, transactionId, resultCode } = data;

    // Find payment by payment number
    const payment = await PaymentModel.findByPaymentNo(outTradeNo);
    if (!payment) {
      throw new BusinessError('Payment not found', BusinessErrorCode.PAYMENT_FAILED);
    }

    // Check if already processed
    if (payment.status !== PaymentStatus.PENDING) {
      return payment.status === PaymentStatus.SUCCESS;
    }

    if (resultCode === 'SUCCESS') {
      // Mark payment as success
      await PaymentModel.markSuccess(payment.id, transactionId);

      // Update order status
      await OrderModel.updateStatus(payment.orderId, OrderStatus.PENDING_SHIPMENT);

      return true;
    } else {
      // Mark payment as failed
      await PaymentModel.markFailed(payment.id);
      return false;
    }
  }

  // Handle WeChat payment callback from XML
  static async handleWxPayCallback(xmlData: string): Promise<{ success: boolean; responseXml: string }> {
    try {
      const data = this.xmlToObject(xmlData);
      
      // Verify signature
      const sign = data.sign;
      delete data.sign;
      const calculatedSign = this.generateSign(data as Record<string, string | number>);
      
      if (sign !== calculatedSign && this.wxPayConfig.apiKey) {
        console.error('WeChat callback signature verification failed');
        return {
          success: false,
          responseXml: '<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[签名验证失败]]></return_msg></xml>',
        };
      }

      const callbackData: PaymentCallbackDTO = {
        outTradeNo: data.out_trade_no,
        transactionId: data.transaction_id,
        resultCode: data.result_code,
        totalFee: parseInt(data.total_fee) || 0,
      };

      const success = await this.handlePaymentCallback(callbackData);

      return {
        success,
        responseXml: '<xml><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[OK]]></return_msg></xml>',
      };
    } catch (error) {
      console.error('Handle WeChat callback error:', error);
      return {
        success: false,
        responseXml: '<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[处理失败]]></return_msg></xml>',
      };
    }
  }

  // Verify payment status with WeChat (query order)
  static async queryWxPayOrder(paymentNo: string): Promise<{ success: boolean; transactionId?: string }> {
    if (!this.wxPayConfig.appId || !this.wxPayConfig.mchId || !this.wxPayConfig.apiKey) {
      console.log('WeChat Pay not configured, skipping query');
      return { success: false };
    }

    const nonceStr = this.generateNonceStr();
    const params: Record<string, string> = {
      appid: this.wxPayConfig.appId,
      mch_id: this.wxPayConfig.mchId,
      out_trade_no: paymentNo,
      nonce_str: nonceStr,
    };

    params.sign = this.generateSign(params);
    const xmlData = this.objectToXml(params);

    return new Promise((resolve) => {
      const options = {
        hostname: 'api.mch.weixin.qq.com',
        port: 443,
        path: '/pay/orderquery',
        method: 'POST',
        headers: {
          'Content-Type': 'application/xml',
          'Content-Length': Buffer.byteLength(xmlData),
        },
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            const result = this.xmlToObject(data);
            if (result.return_code === 'SUCCESS' && result.result_code === 'SUCCESS' && result.trade_state === 'SUCCESS') {
              resolve({ success: true, transactionId: result.transaction_id });
            } else {
              resolve({ success: false });
            }
          } catch (error) {
            resolve({ success: false });
          }
        });
      });

      req.on('error', () => {
        resolve({ success: false });
      });

      req.write(xmlData);
      req.end();
    });
  }

  // Get payment by order ID
  static async getPaymentByOrderId(orderId: string): Promise<Payment | null> {
    return PaymentModel.findByOrderId(orderId);
  }

  // Get payment by payment number
  static async getPaymentByPaymentNo(paymentNo: string): Promise<Payment | null> {
    return PaymentModel.findByPaymentNo(paymentNo);
  }

  // Close payment (when order is cancelled)
  static async closePayment(orderId: string): Promise<void> {
    const payment = await PaymentModel.findByOrderId(orderId);
    if (payment && payment.status === PaymentStatus.PENDING) {
      await PaymentModel.close(payment.id);
    }
  }
}


// DTO for creating refund request
export interface CreateRefundRequestDTO {
  orderId: string;
  reason?: string;
}

export class RefundService {
  // Create refund request
  static async createRefund(
    orderId: string,
    userId: string,
    reason?: string
  ): Promise<import('../models/payment.model').Refund> {
    const { RefundModel, RefundStatus } = await import('../models/payment.model');
    
    // Get order
    const order = await OrderModel.findById(orderId);
    if (!order) {
      throw new BusinessError('Order not found', BusinessErrorCode.ORDER_NOT_FOUND);
    }

    // Verify ownership
    if (order.userId !== userId) {
      throw new BusinessError('Order not found', BusinessErrorCode.ORDER_NOT_FOUND);
    }

    // Check order status - only completed or refunding orders can request refund
    if (order.status !== OrderStatus.COMPLETED && order.status !== OrderStatus.REFUNDING) {
      throw new BusinessError(
        'Order cannot be refunded in current status',
        BusinessErrorCode.ORDER_STATUS_INVALID
      );
    }

    // Get payment for this order
    const payment = await PaymentModel.findByOrderId(orderId);
    if (!payment) {
      throw new BusinessError('Payment not found for this order', BusinessErrorCode.PAYMENT_FAILED);
    }

    // Check if payment was successful
    if (payment.status !== PaymentStatus.SUCCESS) {
      throw new BusinessError('Payment was not successful', BusinessErrorCode.PAYMENT_FAILED);
    }

    // Check if there's already a pending refund
    const existingRefunds = await RefundModel.findByOrderId(orderId);
    const pendingRefund = existingRefunds.find(
      r => r.status === RefundStatus.PENDING || r.status === RefundStatus.PROCESSING
    );
    if (pendingRefund) {
      throw new BusinessError('A refund request is already pending', BusinessErrorCode.ORDER_STATUS_INVALID);
    }

    // Create refund record
    const refund = await RefundModel.create({
      paymentId: payment.id,
      orderId,
      userId,
      amount: payment.amount,
      reason,
    });

    // Update order status to refunding
    await OrderModel.updateStatus(orderId, OrderStatus.REFUNDING);

    return refund;
  }

  // Process refund (admin action)
  static async processRefund(
    refundId: string,
    approved: boolean
  ): Promise<import('../models/payment.model').Refund> {
    const { RefundModel, RefundStatus } = await import('../models/payment.model');
    
    const refund = await RefundModel.findById(refundId);
    if (!refund) {
      throw new BusinessError('Refund not found', BusinessErrorCode.ORDER_NOT_FOUND);
    }

    if (refund.status !== RefundStatus.PENDING) {
      throw new BusinessError('Refund is not pending', BusinessErrorCode.ORDER_STATUS_INVALID);
    }

    if (approved) {
      // Mark as processing
      await RefundModel.markProcessing(refundId);

      // In production, this would call WeChat refund API
      // For now, we simulate successful refund
      const transactionId = `REFUND_${refund.refundNo}_${Date.now()}`;
      await RefundModel.markSuccess(refundId, transactionId);

      // Update order status to refunded
      await OrderModel.updateStatus(refund.orderId, OrderStatus.REFUNDED);

      // Restore user balance if paid with balance
      const payment = await PaymentModel.findById(refund.paymentId);
      if (payment && payment.method === PaymentMethod.BALANCE) {
        await UserModel.updateBalance(refund.userId, refund.amount);
      }

      const updatedRefund = await RefundModel.findById(refundId);
      if (!updatedRefund) {
        throw new Error('Failed to get updated refund');
      }
      return updatedRefund;
    } else {
      // Mark as failed
      await RefundModel.markFailed(refundId);

      // Restore order status to completed
      await OrderModel.updateStatus(refund.orderId, OrderStatus.COMPLETED);

      const updatedRefund = await RefundModel.findById(refundId);
      if (!updatedRefund) {
        throw new Error('Failed to get updated refund');
      }
      return updatedRefund;
    }
  }

  // Get refunds by order ID
  static async getRefundsByOrderId(orderId: string): Promise<import('../models/payment.model').Refund[]> {
    const { RefundModel } = await import('../models/payment.model');
    return RefundModel.findByOrderId(orderId);
  }

  // Get refund by ID
  static async getRefundById(refundId: string): Promise<import('../models/payment.model').Refund | null> {
    const { RefundModel } = await import('../models/payment.model');
    return RefundModel.findById(refundId);
  }
}
