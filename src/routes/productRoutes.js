const express = require('express');
const router = express.Router();

const productController = require('../controllers/productController');
const { validate, schemas } = require('../middlewares/validation');
const { authenticateUser, requireFarmerAccess } = require('../middlewares/auth');
const { uploadProductImage } = require('../middlewares/uploadEnhanced');

/**
 * @route GET /api/v1/products
 * @desc Get all products with filtering and pagination
 * @access Public
 */
router.get('/', productController.getProducts);

/**
 * @route GET /api/v1/products/:id
 * @desc Get single product by ID
 * @access Public
 */
router.get('/:id', productController.getProduct);

/**
 * @route POST /api/v1/products
 * @desc Create new product (Farmer only)
 * @access Private (Farmer/Admin)
 */
router.post('/',
    authenticateUser,
    requireFarmerAccess,
    ...uploadProductImage('image'),
    validate(schemas.productCreate),
    productController.createProduct
);

/**
 * @route PUT /api/v1/products/:id
 * @desc Update product (Farmer can update own products, Admin can update any)
 * @access Private (Farmer/Admin)
 */
router.put('/:id',
    authenticateUser,
    requireFarmerAccess,
    ...uploadProductImage('image'),
    validate(schemas.productUpdate),
    productController.updateProduct
);

/**
 * @route DELETE /api/v1/products/:id
 * @desc Delete product (Farmer can delete own products, Admin can delete any)
 * @access Private (Farmer/Admin)
 */
router.delete('/:id',
    authenticateUser,
    requireFarmerAccess,
    productController.deleteProduct
);

/**
 * @route GET /api/v1/products/farmer/my-products
 * @desc Get farmer's own products
 * @access Private (Farmer/Admin)
 */
router.get('/farmer/my-products',
    authenticateUser,
    requireFarmerAccess,
    productController.getMyProducts
);

module.exports = router;
