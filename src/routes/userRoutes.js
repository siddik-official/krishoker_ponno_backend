const express = require('express');
const router = express.Router();

const userController = require('../controllers/userController');
const { validate, schemas } = require('../middlewares/validation');
const { uploadUserImage } = require('../middlewares/uploadEnhanced');

/**
 * @route GET /api/v1/users/profile
 * @desc Get current user profile
 * @access Private
 */
router.get('/profile', userController.getProfile);

/**
 * @route PUT /api/v1/users/profile
 * @desc Update current user profile
 * @access Private
 */
router.put('/profile',
    ...uploadUserImage('image'),
    validate(schemas.userUpdate),
    userController.updateProfile
);

/**
 * @route PUT /api/v1/users/change-district
 * @desc Change user's district
 * @access Private
 */
router.put('/change-district', userController.changeDistrict);

/**
 * @route DELETE /api/v1/users/account
 * @desc Deactivate user account
 * @access Private
 */
router.delete('/account', userController.deactivateAccount);

module.exports = router;
