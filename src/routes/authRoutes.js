const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const { validate, schemas } = require('../middlewares/validation');
const { authenticateUser } = require('../middlewares/auth');

/**
 * @route POST /api/v1/auth/send-otp
 * @desc Send OTP to phone number
 * @access Public
 */
router.post('/send-otp', 
    validate(schemas.otpRequest),
    authController.sendOTP
);

/**
 * @route POST /api/v1/auth/verify-otp
 * @desc Verify OTP and login/register user
 * @access Public
 */
router.post('/verify-otp',
    validate(schemas.otpVerify),
    authController.verifyOTP
);

/**
 * @route POST /api/v1/auth/refresh
 * @desc Refresh access token
 * @access Public
 */
router.post('/refresh', authController.refreshToken);

/**
 * @route POST /api/v1/auth/logout
 * @desc Logout user
 * @access Private
 */
router.post('/logout', authController.logout);

/**
 * @route GET /api/v1/auth/profile
 * @desc Get current user profile
 * @access Private
 */
router.get('/profile', authenticateUser, authController.getProfile);

module.exports = router;
