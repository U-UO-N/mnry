import { Router } from 'express';
import { AddressController } from '../controllers/address.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

// All address routes require authentication
router.use(authenticate);

// GET /api/address - Get all addresses
router.get('/', AddressController.getAddresses);

// GET /api/address/default - Get default address
router.get('/default', AddressController.getDefaultAddress);

// GET /api/address/delivery-areas - Get enabled delivery areas
router.get('/delivery-areas', AddressController.getDeliveryAreas);

// GET /api/address/:id - Get address by ID
router.get('/:id', AddressController.getAddress);

// POST /api/address - Create new address
router.post('/', AddressController.createAddress);

// PUT /api/address/:id - Update address
router.put('/:id', AddressController.updateAddress);

// PUT /api/address/:id/default - Set address as default
router.put('/:id/default', AddressController.setDefaultAddress);

// DELETE /api/address/:id - Delete address
router.delete('/:id', AddressController.deleteAddress);

export default router;
