import { Response, NextFunction } from 'express';
import { MerchantService } from '../services/merchant.service';
import { MerchantType, ApplicationStatus } from '../models/merchant.model';
import { AuthenticatedRequest, BusinessErrorCode } from '../types';
import { BadRequestError, NotFoundError } from '../middlewares/errorHandler';

export class MerchantController {
  // POST /api/merchant/apply/store - Apply for store partnership
  static async applyForStore(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new BadRequestError('User ID not found');
      }

      const { companyName, contactName, contactPhone, businessLicense, address, description } =
        req.body;

      // Validate required fields
      if (!companyName || !contactName || !contactPhone) {
        throw new BadRequestError('Company name, contact name, and contact phone are required');
      }

      const application = await MerchantService.applyForStore({
        userId,
        companyName,
        contactName,
        contactPhone,
        businessLicense,
        address,
        description,
      });

      res.status(201).json({
        success: true,
        data: application,
        message: 'Store application submitted successfully. Please wait for review.',
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/merchant/apply/supplier - Apply for supplier partnership
  static async applyForSupplier(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new BadRequestError('User ID not found');
      }

      const { companyName, contactName, contactPhone, businessLicense, address, description } =
        req.body;

      // Validate required fields
      if (!companyName || !contactName || !contactPhone) {
        throw new BadRequestError('Company name, contact name, and contact phone are required');
      }

      const application = await MerchantService.applyForSupplier({
        userId,
        companyName,
        contactName,
        contactPhone,
        businessLicense,
        address,
        description,
      });

      res.status(201).json({
        success: true,
        data: application,
        message: 'Supplier application submitted successfully. Please wait for review.',
      });
    } catch (error) {
      next(error);
    }
  }


  // GET /api/merchant/application/status - Get application status
  static async getApplicationStatus(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new BadRequestError('User ID not found');
      }

      const status = await MerchantService.getApplicationStatus(userId);

      res.json({
        success: true,
        data: status,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/merchant/applications - Get user's applications
  static async getUserApplications(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new BadRequestError('User ID not found');
      }

      const applications = await MerchantService.getUserApplications(userId);

      res.json({
        success: true,
        data: applications,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/admin/merchant/applications - Get all applications (admin)
  static async getAllApplications(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const type = req.query.type as MerchantType | undefined;
      const status = req.query.status as ApplicationStatus | undefined;
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 20;

      const result = await MerchantService.getAllApplications(type, status, page, pageSize);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }


  // GET /api/admin/merchant/applications/:id - Get application by ID (admin)
  static async getApplicationById(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        throw new BadRequestError('Application ID is required');
      }

      const application = await MerchantService.getApplicationById(id);
      if (!application) {
        throw new NotFoundError('Application not found');
      }

      res.json({
        success: true,
        data: application,
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/admin/merchant/applications/:id/review - Review application (admin)
  static async reviewApplication(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const adminUserId = req.user?.userId;
      if (!adminUserId) {
        throw new BadRequestError('Admin user ID not found');
      }

      const { id } = req.params;
      if (!id) {
        throw new BadRequestError('Application ID is required');
      }

      const { approved, rejectReason } = req.body;
      if (typeof approved !== 'boolean') {
        throw new BadRequestError('Approved status is required');
      }

      if (!approved && !rejectReason) {
        throw new BadRequestError('Reject reason is required when rejecting an application');
      }

      const application = await MerchantService.reviewApplication(
        id,
        approved,
        adminUserId,
        rejectReason
      );

      if (!application) {
        throw new NotFoundError('Application not found');
      }

      res.json({
        success: true,
        data: application,
        message: approved
          ? 'Application approved successfully'
          : 'Application rejected successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}
