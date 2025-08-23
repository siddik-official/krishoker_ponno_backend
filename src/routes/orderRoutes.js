const express = require('express');
const router = express.Router();

const orderController = require('../controllers/orderController');
const { validate, schemas } = require('../middlewares/validation');
const { requireCustomerAccess, requireAgentAccess, requireRole } = require('../middlewares/auth');

/**
 * @route POST /api/v1/orders
 * @desc Create new order
 * @access Private (Customer/Admin)
 */
router.post('/',
    requireCustomerAccess,
    validate(schemas.orderCreate),
    orderController.createOrder
);

/**
 * @route GET /api/v1/orders
 * @desc Get orders for current user (role-based filtering)
 * @access Private
 */
router.get('/', orderController.getMyOrders);

/**
 * @route GET /api/v1/orders/:id
 * @desc Get single order by ID
 * @access Private
 */
router.get('/:id', orderController.getOrder);

/**
 * @route PUT /api/v1/orders/:id/status
 * @desc Update order status (Agent/Admin only)
 * @access Private (Agent/Admin)
 */
router.put('/:id/status',
    requireRole(['agent', 'admin', 'farmer']),
    validate(schemas.orderUpdate),
    orderController.updateOrderStatus
);

/**
 * @route PUT /api/v1/orders/:id/assign-agent
 * @desc Assign agent to order
 * @access Private (Customer/Admin)
 */
router.put('/:id/assign-agent',
    requireRole(['customer', 'admin']),
    orderController.assignAgent
);

/**
 * @route GET /api/v1/orders/agents/available
 * @desc Get available agents by district
 * @access Private
 */
router.get('/agents/available', orderController.getAvailableAgents);

module.exports = router;
