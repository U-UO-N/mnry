import { Request, Response, NextFunction } from 'express';
import {
  ShippingTemplateModel,
  ShippingRegionModel,
  DeliveryAreaModel,
  ShippingTemplateDTO,
  ShippingRegionDTO,
} from '../models/shipping.model';
import { BadRequestError, NotFoundError } from '../middlewares/errorHandler';

// 中国所有省份
const CHINA_PROVINCES = [
  '北京市', '天津市', '上海市', '重庆市',
  '河北省', '山西省', '辽宁省', '吉林省', '黑龙江省',
  '江苏省', '浙江省', '安徽省', '福建省', '江西省', '山东省',
  '河南省', '湖北省', '湖南省', '广东省', '海南省',
  '四川省', '贵州省', '云南省', '陕西省', '甘肃省', '青海省',
  '台湾省', '内蒙古自治区', '广西壮族自治区', '西藏自治区',
  '宁夏回族自治区', '新疆维吾尔自治区', '香港特别行政区', '澳门特别行政区'
];

export class AdminShippingController {
  // GET /api/admin/shipping/templates - Get all shipping templates
  static async getTemplates(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const templates = await ShippingTemplateModel.findAll();
      
      // Get regions for each template
      const templatesWithRegions = await Promise.all(
        templates.map(async (template) => {
          const regions = await ShippingRegionModel.findByTemplateId(template.id);
          return { ...template, regions };
        })
      );

      res.json({
        success: true,
        data: templatesWithRegions,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/admin/shipping/templates/:id - Get shipping template by ID
  static async getTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const template = await ShippingTemplateModel.findById(id);

      if (!template) {
        throw new NotFoundError('Shipping template not found');
      }

      const regions = await ShippingRegionModel.findByTemplateId(id);

      res.json({
        success: true,
        data: { ...template, regions },
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/admin/shipping/templates - Create shipping template
  static async createTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, isFree, freeAmount, isDefault, regions } = req.body;

      console.log('Creating template:', { name, isFree, freeAmount, isDefault, regions });

      if (!name) {
        throw new BadRequestError('Template name is required');
      }

      const templateData: ShippingTemplateDTO = {
        name,
        isFree: isFree || false,
        freeAmount: freeAmount || 0,
        isDefault: isDefault || false,
        regions: Array.isArray(regions) ? regions : [],
      };

      const template = await ShippingTemplateModel.create(templateData);
      const templateRegions = await ShippingRegionModel.findByTemplateId(template.id);

      res.status(201).json({
        success: true,
        data: { ...template, regions: templateRegions },
      });
    } catch (error) {
      console.error('Create template error:', error);
      next(error);
    }
  }

  // PUT /api/admin/shipping/templates/:id - Update shipping template
  static async updateTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { name, isFree, freeAmount, isDefault, regions } = req.body;

      console.log('Updating template:', id, { name, isFree, freeAmount, isDefault, regions });

      const template = await ShippingTemplateModel.update(id, {
        name,
        isFree,
        freeAmount,
        isDefault,
      });

      if (!template) {
        throw new NotFoundError('Shipping template not found');
      }

      // Update regions if provided
      if (regions !== undefined) {
        // Delete existing regions
        await ShippingRegionModel.deleteByTemplateId(id);
        
        // Create new regions
        if (Array.isArray(regions)) {
          for (const region of regions) {
            console.log('Creating region:', region);
            await ShippingRegionModel.create(id, region);
          }
        }
      }

      const templateRegions = await ShippingRegionModel.findByTemplateId(id);

      res.json({
        success: true,
        data: { ...template, regions: templateRegions },
      });
    } catch (error) {
      console.error('Update template error:', error);
      next(error);
    }
  }

  // DELETE /api/admin/shipping/templates/:id - Delete shipping template
  static async deleteTemplate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const success = await ShippingTemplateModel.delete(id);

      if (!success) {
        throw new NotFoundError('Shipping template not found');
      }

      res.json({
        success: true,
        message: 'Shipping template deleted',
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/admin/shipping/provinces - Get all provinces with delivery status
  static async getProvinces(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const deliveryAreas = await DeliveryAreaModel.findAll();
      
      // Create a map of enabled provinces
      const enabledProvinces = new Set<string>();
      for (const area of deliveryAreas) {
        if (area.isEnabled && !area.city && !area.district) {
          enabledProvinces.add(area.province);
        }
      }

      // Return all provinces with their enabled status
      const provinces = CHINA_PROVINCES.map(province => ({
        name: province,
        isEnabled: enabledProvinces.has(province),
      }));

      res.json({
        success: true,
        data: provinces,
      });
    } catch (error) {
      next(error);
    }
  }

  // PUT /api/admin/shipping/provinces - Batch update province delivery status
  static async updateProvinces(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { provinces } = req.body;

      if (!Array.isArray(provinces)) {
        throw new BadRequestError('Provinces must be an array');
      }

      for (const item of provinces) {
        if (item.name && typeof item.isEnabled === 'boolean') {
          await DeliveryAreaModel.setProvinceEnabled(item.name, item.isEnabled);
        }
      }

      res.json({
        success: true,
        message: 'Provinces updated',
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/admin/shipping/delivery-areas - Get all delivery areas
  static async getDeliveryAreas(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const areas = await DeliveryAreaModel.findAll();

      res.json({
        success: true,
        data: areas,
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/admin/shipping/delivery-areas - Create or update delivery area
  static async upsertDeliveryArea(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { province, city, district, isEnabled } = req.body;

      if (!province) {
        throw new BadRequestError('Province is required');
      }

      const area = await DeliveryAreaModel.upsert({
        province,
        city,
        district,
        isEnabled: isEnabled !== false,
      });

      res.json({
        success: true,
        data: area,
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/admin/shipping/all-provinces - Get list of all China provinces
  static async getAllProvinces(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.json({
        success: true,
        data: CHINA_PROVINCES,
      });
    } catch (error) {
      next(error);
    }
  }
}
