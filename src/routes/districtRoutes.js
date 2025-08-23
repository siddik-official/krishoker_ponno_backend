const express = require('express');
const router = express.Router();

const districtController = require('../controllers/districtController');
const { authenticateUser } = require('../middlewares/auth');

/**
 * @route GET /api/v1/districts
 * @desc Get all districts
 * @access Public
 */
router.get('/', districtController.getDistricts);

/**
 * @route GET /api/v1/districts/:id
 * @desc Get single district by ID
 * @access Public
 */
router.get('/:id', districtController.getDistrict);

/**
 * @route GET /api/v1/districts/:id/agents
 * @desc Get agents in a specific district
 * @access Private
 */
router.get('/:id/agents', authenticateUser, districtController.getDistrictAgents);

/**
 * @route GET /api/v1/districts/:id/products
 * @desc Get products in a specific district
 * @access Public
 */
router.get('/:id/products', districtController.getDistrictProducts);

module.exports = router;
