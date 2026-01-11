import { Router } from 'express';
import { AdminShippingController } from '../controllers/adminShipping.controller';

const router = Router();

// Shipping Templates
router.get('/templates', AdminShippingController.getTemplates);
router.get('/templates/:id', AdminShippingController.getTemplate);
router.post('/templates', AdminShippingController.createTemplate);
router.put('/templates/:id', AdminShippingController.updateTemplate);
router.delete('/templates/:id', AdminShippingController.deleteTemplate);

// Provinces and Delivery Areas
router.get('/all-provinces', AdminShippingController.getAllProvinces);
router.get('/provinces', AdminShippingController.getProvinces);
router.put('/provinces', AdminShippingController.updateProvinces);
router.get('/delivery-areas', AdminShippingController.getDeliveryAreas);
router.post('/delivery-areas', AdminShippingController.upsertDeliveryArea);

export default router;
