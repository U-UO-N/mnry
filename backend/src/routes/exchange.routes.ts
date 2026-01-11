import { Router } from 'express';
import { ExchangeController } from '../controllers/exchange.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

// GET /api/exchange/items - Get exchange items list (public)
router.get('/items', ExchangeController.getItems);

// GET /api/exchange/items/:id - Get exchange item detail (public)
router.get('/items/:id', ExchangeController.getItemDetail);

// POST /api/exchange - Perform exchange (requires auth)
router.post('/', authenticate, ExchangeController.exchange);

// GET /api/exchange/orders - Get user's exchange orders (requires auth)
router.get('/orders', authenticate, ExchangeController.getOrders);

export default router;
