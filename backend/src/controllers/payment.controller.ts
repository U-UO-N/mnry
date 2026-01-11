import { Response, NextFunction, Request } from 'express';
import { PaymentService, PaymentCallbackDTO } from '../services/payment.service';
import { PaymentMethod } from '../models/payment.model';
import { AuthenticatedRequest } from '../types';
import { BadRequestError, UnauthorizedError } from '../middlewares/errorHandler';

export class PaymentController {
  // POST /api/payments - Create payment
  static async createPayment(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new UnauthorizedError('User not authenticated');
      }

      const { orderId, method } = req.body;

      if (!orderId) {
        throw new BadRequestError('Order ID is required');
      }

      // Validate payment method
      let paymentMethod: PaymentMethod = PaymentMethod.WECHAT;
      if (method) {
        if (!Object.values(PaymentMethod).includes(method as PaymentMethod)) {
          throw new BadRequestError('Invalid payment method');
        }
        paymentMethod = method as PaymentMethod;
      }

      const paymentInfo = await PaymentService.createPayment(orderId, userId, paymentMethod);

      res.status(201).json({
        success: true,
        data: paymentInfo,
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/payments/callback - WeChat payment callback (XML format)
  static async handleCallback(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Check if request is XML (from WeChat)
      const contentType = req.headers['content-type'] || '';
      
      if (contentType.includes('xml') || typeof req.body === 'string') {
        // Handle XML callback from WeChat
        let xmlData = '';
        if (typeof req.body === 'string') {
          xmlData = req.body;
        } else if (req.body && req.body.xml) {
          // Some parsers convert XML to object with 'xml' key
          xmlData = req.body.xml;
        } else {
          // Raw body
          xmlData = req.body.toString();
        }

        const result = await PaymentService.handleWxPayCallback(xmlData);
        res.set('Content-Type', 'application/xml');
        res.send(result.responseXml);
        return;
      }

      // Handle JSON callback (for testing)
      const { outTradeNo, transactionId, resultCode, totalFee } = req.body;

      if (!outTradeNo || !transactionId || !resultCode) {
        throw new BadRequestError('Invalid callback data');
      }

      const callbackData: PaymentCallbackDTO = {
        outTradeNo,
        transactionId,
        resultCode,
        totalFee: totalFee || 0,
      };

      const success = await PaymentService.handlePaymentCallback(callbackData);

      res.json({
        success: true,
        data: {
          return_code: success ? 'SUCCESS' : 'FAIL',
          return_msg: success ? 'OK' : 'Payment processing failed',
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/payments/:paymentNo - Get payment status
  static async getPaymentStatus(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new UnauthorizedError('User not authenticated');
      }

      const { paymentNo } = req.params;

      const payment = await PaymentService.getPaymentByPaymentNo(paymentNo);

      if (!payment || payment.userId !== userId) {
        throw new BadRequestError('Payment not found');
      }

      res.json({
        success: true,
        data: {
          paymentNo: payment.paymentNo,
          orderId: payment.orderId,
          amount: payment.amount,
          method: payment.method,
          status: payment.status,
          paidAt: payment.paidAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/payments/:paymentNo/query - Query payment status from WeChat
  static async queryPaymentStatus(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new UnauthorizedError('User not authenticated');
      }

      const { paymentNo } = req.params;

      const payment = await PaymentService.getPaymentByPaymentNo(paymentNo);

      if (!payment || payment.userId !== userId) {
        throw new BadRequestError('Payment not found');
      }

      // Query WeChat for payment status
      const wxResult = await PaymentService.queryWxPayOrder(paymentNo);

      if (wxResult.success && wxResult.transactionId) {
        // Update payment status if WeChat confirms success
        const callbackData: PaymentCallbackDTO = {
          outTradeNo: paymentNo,
          transactionId: wxResult.transactionId,
          resultCode: 'SUCCESS',
          totalFee: Math.round(payment.amount * 100),
        };
        await PaymentService.handlePaymentCallback(callbackData);
      }

      // Get updated payment
      const updatedPayment = await PaymentService.getPaymentByPaymentNo(paymentNo);

      res.json({
        success: true,
        data: {
          paymentNo: updatedPayment?.paymentNo,
          orderId: updatedPayment?.orderId,
          amount: updatedPayment?.amount,
          method: updatedPayment?.method,
          status: updatedPayment?.status,
          paidAt: updatedPayment?.paidAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
