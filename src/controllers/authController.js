const { supabase, supabaseAdmin } = require('../config/supabase');
const { catchAsync, AppError } = require('../middlewares/errorHandler');

/**
 * Send OTP for phone authentication
 */
const sendOTP = catchAsync(async (req, res) => {
    const { phone } = req.body;

    // Format phone number for Bangladesh
    const formattedPhone = phone.startsWith('+88') ? phone : `+88${phone}`;

    const { data, error } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
        options: {
            channel: 'sms'
        }
    });

    if (error) {
        throw new AppError(error.message, 400, 'OTP_SEND_FAILED');
    }

    res.status(200).json({
        success: true,
        message: 'OTP sent successfully',
        data: {
            phone: formattedPhone
        }
    });
});

/**
 * Verify OTP and login/register user
 */
const verifyOTP = catchAsync(async (req, res) => {
    const { phone, token, user_data } = req.body;

    // Format phone number
    const formattedPhone = phone.startsWith('+88') ? phone : `+88${phone}`;

    // Verify OTP with Supabase
    const { data: authData, error } = await supabase.auth.verifyOtp({
        phone: formattedPhone,
        token,
        type: 'sms'
    });

    if (error || !authData.user) {
        throw new AppError('Invalid OTP', 400, 'INVALID_OTP');
    }

    const userId = authData.user.id;

    // Check if user exists in our users table
    const { data: existingUser, error: userError } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

    let userData;

    if (userError && userError.code === 'PGRST116') {
        // User doesn't exist, create new user
        if (!user_data || !user_data.name || !user_data.role || !user_data.district_id) {
            throw new AppError('User registration data required for new users', 400, 'REGISTRATION_DATA_REQUIRED');
        }

        const { data: newUser, error: createError } = await supabaseAdmin
            .from('users')
            .insert({
                id: userId,
                name: user_data.name,
                phone: formattedPhone,
                role: user_data.role,
                language: user_data.language || 'bn',
                nid: user_data.nid || null,
                district_id: user_data.district_id,
                is_active: true
            })
            .select()
            .single();

        if (createError) {
            throw new AppError('Failed to create user profile', 500, 'USER_CREATE_FAILED');
        }

        userData = newUser;
    } else if (userError) {
        throw new AppError('Database error', 500, 'DATABASE_ERROR');
    } else {
        userData = existingUser;
    }

    // Check if user is active
    if (!userData.is_active) {
        throw new AppError('User account is inactive', 403, 'ACCOUNT_INACTIVE');
    }

    res.status(200).json({
        success: true,
        message: existingUser ? 'Login successful' : 'Registration successful',
        data: {
            user: {
                id: userData.id,
                name: userData.name,
                phone: userData.phone,
                role: userData.role,
                language: userData.language,
                district_id: userData.district_id,
                registration_date: userData.registration_date
            },
            session: authData.session,
            access_token: authData.session.access_token
        }
    });
});

/**
 * Refresh access token
 */
const refreshToken = catchAsync(async (req, res) => {
    const { refresh_token } = req.body;

    if (!refresh_token) {
        throw new AppError('Refresh token required', 400, 'REFRESH_TOKEN_REQUIRED');
    }

    const { data, error } = await supabase.auth.refreshSession({
        refresh_token
    });

    if (error) {
        throw new AppError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
    }

    res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
            session: data.session,
            access_token: data.session.access_token
        }
    });
});

/**
 * Logout user
 */
const logout = catchAsync(async (req, res) => {
    const { error } = await supabase.auth.signOut();

    if (error) {
        throw new AppError('Logout failed', 500, 'LOGOUT_FAILED');
    }

    res.status(200).json({
        success: true,
        message: 'Logout successful'
    });
});

/**
 * Get current user profile
 */
const getProfile = catchAsync(async (req, res) => {
    const user = req.user;

    res.status(200).json({
        success: true,
        message: 'Profile retrieved successfully',
        data: {
            user: {
                id: user.id,
                name: user.name,
                phone: user.phone,
                role: user.role,
                language: user.language,
                image_url: user.image_url,
                nid: user.nid,
                district_id: user.district_id,
                registration_date: user.registration_date,
                is_active: user.is_active
            }
        }
    });
});

module.exports = {
    sendOTP,
    verifyOTP,
    refreshToken,
    logout,
    getProfile
};
