import { UserModel } from '../models/user.model';
import {
  MerchantApplicationModel,
  MerchantApplication,
  MerchantType,
  ApplicationStatus,
  CreateStoreApplicationDTO,
  CreateSupplierApplicationDTO,
} from '../models/merchant.model';

// Application status response
export interface ApplicationStatusResponse {
  hasStoreApplication: boolean;
  storeApplication: MerchantApplication | null;
  hasSupplierApplication: boolean;
  supplierApplication: MerchantApplication | null;
}

// Paginated result
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export class MerchantService {
  // Apply for store partnership
  static async applyForStore(
    data: Omit<CreateStoreApplicationDTO, 'userId'> & { userId: string }
  ): Promise<MerchantApplication> {
    const user = await UserModel.findById(data.userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Check if user already has a pending store application
    const hasPending = await MerchantApplicationModel.hasPendingApplication(
      data.userId,
      MerchantType.STORE
    );
    if (hasPending) {
      throw new Error('You already have a pending store application');
    }

    // Check if user is already an approved store
    const isApproved = await MerchantApplicationModel.isApprovedMerchant(
      data.userId,
      MerchantType.STORE
    );
    if (isApproved) {
      throw new Error('You are already an approved store partner');
    }

    return MerchantApplicationModel.createStoreApplication(data);
  }


  // Apply for supplier partnership
  static async applyForSupplier(
    data: Omit<CreateSupplierApplicationDTO, 'userId'> & { userId: string }
  ): Promise<MerchantApplication> {
    const user = await UserModel.findById(data.userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Check if user already has a pending supplier application
    const hasPending = await MerchantApplicationModel.hasPendingApplication(
      data.userId,
      MerchantType.SUPPLIER
    );
    if (hasPending) {
      throw new Error('You already have a pending supplier application');
    }

    // Check if user is already an approved supplier
    const isApproved = await MerchantApplicationModel.isApprovedMerchant(
      data.userId,
      MerchantType.SUPPLIER
    );
    if (isApproved) {
      throw new Error('You are already an approved supplier partner');
    }

    return MerchantApplicationModel.createSupplierApplication(data);
  }

  // Get application status for a user
  static async getApplicationStatus(userId: string): Promise<ApplicationStatusResponse> {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const storeApplication = await MerchantApplicationModel.findByUserAndType(
      userId,
      MerchantType.STORE
    );
    const supplierApplication = await MerchantApplicationModel.findByUserAndType(
      userId,
      MerchantType.SUPPLIER
    );

    return {
      hasStoreApplication: storeApplication !== null,
      storeApplication,
      hasSupplierApplication: supplierApplication !== null,
      supplierApplication,
    };
  }

  // Get all applications for a user
  static async getUserApplications(userId: string): Promise<MerchantApplication[]> {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    return MerchantApplicationModel.findByUser(userId);
  }


  // Review application (admin function)
  static async reviewApplication(
    applicationId: string,
    approved: boolean,
    reviewedBy: string,
    rejectReason?: string
  ): Promise<MerchantApplication | null> {
    const application = await MerchantApplicationModel.findById(applicationId);
    if (!application) {
      throw new Error('Application not found');
    }

    if (application.status !== ApplicationStatus.PENDING) {
      throw new Error('Application has already been reviewed');
    }

    const newStatus = approved ? ApplicationStatus.APPROVED : ApplicationStatus.REJECTED;

    return MerchantApplicationModel.updateStatus(
      applicationId,
      newStatus,
      reviewedBy,
      rejectReason
    );
  }

  // Get all applications with pagination (admin function)
  static async getAllApplications(
    type?: MerchantType,
    status?: ApplicationStatus,
    page: number = 1,
    pageSize: number = 20
  ): Promise<PaginatedResult<MerchantApplication>> {
    const result = await MerchantApplicationModel.findAll({
      type,
      status,
      page,
      pageSize,
    });

    return {
      items: result.items,
      total: result.total,
      page,
      pageSize,
      totalPages: Math.ceil(result.total / pageSize),
    };
  }

  // Get application by ID
  static async getApplicationById(id: string): Promise<MerchantApplication | null> {
    return MerchantApplicationModel.findById(id);
  }

  // Check if user is approved merchant
  static async isApprovedMerchant(
    userId: string,
    type: MerchantType
  ): Promise<boolean> {
    return MerchantApplicationModel.isApprovedMerchant(userId, type);
  }
}
