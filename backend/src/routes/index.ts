import { Router } from 'express';
import userRoutes from './user.routes';
import categoryRoutes from './category.routes';
import productRoutes from './product.routes';
import homeRoutes from './home.routes';
import cartRoutes from './cart.routes';
import orderRoutes from './order.routes';
import paymentRoutes from './payment.routes';
import refundRoutes from './refund.routes';
import groupBuyRoutes from './groupBuy.routes';
import benefitsRoutes from './benefits.routes';
import checkInRoutes from './checkIn.routes';
import exchangeRoutes from './exchange.routes';
import userBehaviorRoutes from './userBehavior.routes';
import distributionRoutes from './distribution.routes';
import shareRoutes from './share.routes';
import merchantRoutes from './merchant.routes';
import addressRoutes from './address.routes';
import adminProductRoutes from './adminProduct.routes';
import adminCategoryRoutes from './adminCategory.routes';
import adminHomeRoutes from './adminHome.routes';
import adminOrderRoutes from './adminOrder.routes';
import adminFinanceRoutes from './adminFinance.routes';
import adminUserRoutes from './adminUser.routes';
import adminMerchantRoutes from './adminMerchant.routes';
import adminGroupBuyRoutes from './adminGroupBuy.routes';
import adminMaterialRoutes from './adminMaterial.routes';
import adminShippingRoutes from './adminShipping.routes';
import adminDashboardRoutes from './adminDashboard.routes';
import uploadRoutes from './upload.routes';

const router = Router();

// Register routes
router.use('/user', userRoutes);
router.use('/user', benefitsRoutes); // Benefits routes under /user path
router.use('/user', userBehaviorRoutes); // User behavior routes under /user path
router.use('/user', distributionRoutes); // Distribution routes under /user path
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/home', homeRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', orderRoutes);
router.use('/payments', paymentRoutes);
router.use('/refunds', refundRoutes);
router.use('/group-buy', groupBuyRoutes);
router.use('/check-in', checkInRoutes);
router.use('/exchange', exchangeRoutes);
router.use('/share', shareRoutes);
router.use('/merchant', merchantRoutes); // Merchant application routes
router.use('/address', addressRoutes); // User address routes
router.use('/admin/products', adminProductRoutes); // Admin product management routes
router.use('/admin/categories', adminCategoryRoutes); // Admin category management routes
router.use('/admin/home', adminHomeRoutes); // Admin home page configuration routes
router.use('/admin/orders', adminOrderRoutes); // Admin order management routes
router.use('/admin/finance', adminFinanceRoutes); // Admin finance management routes
router.use('/admin/users', adminUserRoutes); // Admin user management routes
router.use('/admin/merchant', adminMerchantRoutes); // Admin merchant application routes
router.use('/admin/group-buy', adminGroupBuyRoutes); // Admin group buy management routes
router.use('/admin/materials', adminMaterialRoutes); // Admin material center routes
router.use('/admin/shipping', adminShippingRoutes); // Admin shipping management routes
router.use('/admin/dashboard', adminDashboardRoutes); // Admin dashboard routes
router.use('/upload', uploadRoutes); // File upload routes

// API info endpoint
router.get('/', (_req, res) => {
  res.json({
    name: 'E-commerce Mini Program API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      api: '/api',
    },
  });
});

export default router;
