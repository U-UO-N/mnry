// Re-export services with explicit naming to avoid duplicate exports
export { UserService } from './user.service';
export { CategoryService } from './category.service';
export { ProductService } from './product.service';
export { HomeService } from './home.service';
export { CartService } from './cart.service';
export { OrderService } from './order.service';
export { PaymentService } from './payment.service';
export { GroupBuyService } from './groupBuy.service';
export { GroupBuySchedulerService } from './groupBuyScheduler.service';
export { BenefitsService } from './benefits.service';
export { CheckInService } from './checkIn.service';
export { ExchangeService } from './exchange.service';
export { UserBehaviorService } from './userBehavior.service';
export { DistributionService } from './distribution.service';
export { MerchantService } from './merchant.service';
export { AdminFinanceService } from './adminFinance.service';
export { AdminUserService } from './adminUser.service';
export { AdminMaterialService } from './adminMaterial.service';

// Export PaginatedResult from types to avoid duplicate exports
export type { PaginatedResult } from '../types';
