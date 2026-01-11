import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller';
import { authenticate } from '../middlewares/auth';
import express from 'express';

const router = Router();

// Parse raw body for XML callback
router.use('/callback', express.raw({ type: 'application/xml' }));
router.use('/callback', express.text({ type: 'text/xml' }));

// POST /api/payments - Create payment (requires auth)
router.post('/', authenticate, PaymentController.createPayment);

// POST /api/payments/callback - WeChat payment callback (no auth - called by WeChat)
router.post('/callback', PaymentController.handleCallback);

// GET /api/payments/:paymentNo - Get payment status (requires auth)
router.get('/:paymentNo', authenticate, PaymentController.getPaymentStatus);

// POST /api/payments/:paymentNo/query - Query payment status from WeChat (requires auth)
router.post('/:paymentNo/query', authenticate, PaymentController.queryPaymentStatus);

export default router;
