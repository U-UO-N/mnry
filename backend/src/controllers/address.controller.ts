import { Response, NextFunction } from 'express';
import { AddressModel, AddressDTO } from '../models/address.model';
import { DeliveryAreaModel } from '../models/shipping.model';
import { AuthenticatedRequest } from '../types';
import { BadRequestError, NotFoundError, UnauthorizedError } from '../middlewares/errorHandler';

export class AddressController {
  // GET /api/address - Get all addresses for current user
  static async getAddresses(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new UnauthorizedError('User not authenticated');
      }

      const addresses = await AddressModel.findByUserId(userId);

      res.json({
        success: true,
        data: addresses,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/address/default - Get default address
  static async getDefaultAddress(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new UnauthorizedError('User not authenticated');
      }

      const address = await AddressModel.findDefaultByUserId(userId);

      res.json({
        success: true,
        data: address,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/address/:id - Get address by ID
  static async getAddress(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new UnauthorizedError('User not authenticated');
      }

      const { id } = req.params;
      const address = await AddressModel.findById(id);

      if (!address || address.userId !== userId) {
        throw new NotFoundError('Address not found');
      }

      res.json({
        success: true,
        data: address,
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/address - Create new address
  static async createAddress(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new UnauthorizedError('User not authenticated');
      }

      const { name, phone, province, city, district, detail, isDefault } = req.body;

      if (!name || !phone || !province || !city || !district || !detail) {
        throw new BadRequestError('Missing required fields');
      }

      // Check if delivery area is enabled
      const isEnabled = await DeliveryAreaModel.isAreaEnabled(province, city, district);
      if (!isEnabled) {
        throw new BadRequestError('该地区暂不支持配送');
      }

      const addressData: AddressDTO = {
        name,
        phone,
        province,
        city,
        district,
        detail,
        isDefault: isDefault || false,
      };

      const address = await AddressModel.create(userId, addressData);

      res.status(201).json({
        success: true,
        data: address,
      });
    } catch (error) {
      next(error);
    }
  }

  // PUT /api/address/:id - Update address
  static async updateAddress(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new UnauthorizedError('User not authenticated');
      }

      const { id } = req.params;
      const { name, phone, province, city, district, detail, isDefault } = req.body;

      // If changing location, check if delivery area is enabled
      if (province || city || district) {
        const existing = await AddressModel.findById(id);
        if (existing) {
          const checkProvince = province || existing.province;
          const checkCity = city || existing.city;
          const checkDistrict = district || existing.district;
          
          const isEnabled = await DeliveryAreaModel.isAreaEnabled(checkProvince, checkCity, checkDistrict);
          if (!isEnabled) {
            throw new BadRequestError('该地区暂不支持配送');
          }
        }
      }

      const address = await AddressModel.update(id, userId, {
        name,
        phone,
        province,
        city,
        district,
        detail,
        isDefault,
      });

      if (!address) {
        throw new NotFoundError('Address not found');
      }

      res.json({
        success: true,
        data: address,
      });
    } catch (error) {
      next(error);
    }
  }

  // PUT /api/address/:id/default - Set address as default
  static async setDefaultAddress(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new UnauthorizedError('User not authenticated');
      }

      const { id } = req.params;
      const success = await AddressModel.setDefault(id, userId);

      if (!success) {
        throw new NotFoundError('Address not found');
      }

      res.json({
        success: true,
        message: 'Default address updated',
      });
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/address/:id - Delete address
  static async deleteAddress(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new UnauthorizedError('User not authenticated');
      }

      const { id } = req.params;
      const success = await AddressModel.delete(id, userId);

      if (!success) {
        throw new NotFoundError('Address not found');
      }

      res.json({
        success: true,
        message: 'Address deleted',
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/address/delivery-areas - Get enabled delivery areas (for miniprogram)
  static async getDeliveryAreas(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const areas = await DeliveryAreaModel.findEnabled();
      
      // Group by province
      const grouped: Record<string, string[]> = {};
      for (const area of areas) {
        if (!grouped[area.province]) {
          grouped[area.province] = [];
        }
      }

      res.json({
        success: true,
        data: {
          areas,
          provinces: Object.keys(grouped),
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
