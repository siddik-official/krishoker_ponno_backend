const express = require('express');
const router = express.Router();

const adminController = require('../controllers/adminController');
const { validate, schemas } = require('../middlewares/validation');
const { requireAdmin } = require('../middlewares/auth');
const { uploadSingle, processAndUploadImage } = require('../middlewares/upload');

// Apply admin requirement to all routes
router.use(requireAdmin);

/**
 * User Management Routes
 */
router.get('/users', adminController.getAllUsers);
router.get('/users/:id', adminController.getUser);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);
router.put('/users/:id/activate', adminController.activateUser);
router.put('/users/:id/deactivate', adminController.deactivateUser);

/**
 * Product Management Routes
 */
router.get('/products', adminController.getAllProducts);
router.delete('/products/:id', adminController.deleteProduct);

/**
 * Order Management Routes
 */
router.get('/orders', adminController.getAllOrders);
router.put('/orders/:id', adminController.updateOrder);
router.delete('/orders/:id', adminController.deleteOrder);

/**
 * District Management Routes
 */
router.get('/districts', adminController.getAllDistricts);
router.post('/districts', validate(schemas.districtCreate), adminController.createDistrict);
router.put('/districts/:id', validate(schemas.districtCreate), adminController.updateDistrict);
router.delete('/districts/:id', adminController.deleteDistrict);

/**
 * Analytics and Stats Routes
 */
router.get('/stats/overview', adminController.getOverviewStats);
router.get('/stats/users', adminController.getUserStats);
router.get('/stats/products', adminController.getProductStats);
router.get('/stats/orders', adminController.getOrderStats);

module.exports = router;
