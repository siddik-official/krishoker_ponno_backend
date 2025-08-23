const { supabaseAdmin } = require('../config/supabase');
const { catchAsync, AppError } = require('../middlewares/errorHandler');
const { deleteImage } = require('../middlewares/uploadEnhanced');

/**
 * Get current user profile
 */
const getProfile = catchAsync(async (req, res) => {
    const user = req.user;

    // Get additional user statistics based on role
    let stats = {};

    switch (user.role) {
        case 'farmer':
            // Get farmer's product and order statistics
            const { data: farmerStats } = await supabaseAdmin.rpc('get_farmer_stats', {
                farmer_id: user.id
            });
            stats = farmerStats || {};
            break;

        case 'customer':
            // Get customer's order statistics
            const { data: customerStats } = await supabaseAdmin.rpc('get_customer_stats', {
                customer_id: user.id
            });
            stats = customerStats || {};
            break;

        case 'agent':
            // Get agent's order statistics
            const { data: agentStats } = await supabaseAdmin.rpc('get_agent_stats', {
                agent_id: user.id
            });
            stats = agentStats || {};
            break;
    }

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
            },
            stats
        }
    });
});

/**
 * Update current user profile
 */
const updateProfile = catchAsync(async (req, res) => {
    const user = req.user;
    const updateData = req.body;

    // Add new image URL if uploaded
    if (req.imageUrl) {
        updateData.image_url = req.imageUrl;
    }

    const { data: updatedUser, error } = await supabaseAdmin
        .from('users')
        .update(updateData)
        .eq('id', user.id)
        .select()
        .single();

    if (error) {
        // If update fails, clean up new uploaded image
        if (req.imageUrl) {
            await deleteImage(req.imageUrl);
        }
        throw new AppError('Failed to update profile', 500, 'UPDATE_FAILED');
    }

    // Delete old image if new one was uploaded
    if (req.imageUrl && user.image_url && user.image_url !== req.imageUrl) {
        await deleteImage(user.image_url);
    }

    res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: {
            user: {
                id: updatedUser.id,
                name: updatedUser.name,
                phone: updatedUser.phone,
                role: updatedUser.role,
                language: updatedUser.language,
                image_url: updatedUser.image_url,
                nid: updatedUser.nid,
                district_id: updatedUser.district_id,
                registration_date: updatedUser.registration_date,
                is_active: updatedUser.is_active
            }
        }
    });
});

/**
 * Change user's district
 */
const changeDistrict = catchAsync(async (req, res) => {
    const user = req.user;
    const { district_id } = req.body;

    if (!district_id) {
        throw new AppError('District ID is required', 400, 'DISTRICT_REQUIRED');
    }

    // Validate district exists
    const { data: district, error: districtError } = await supabaseAdmin
        .from('districts')
        .select('id, name')
        .eq('id', district_id)
        .single();

    if (districtError || !district) {
        throw new AppError('Invalid district', 400, 'INVALID_DISTRICT');
    }

    // Update user's district
    const { data: updatedUser, error } = await supabaseAdmin
        .from('users')
        .update({ district_id })
        .eq('id', user.id)
        .select()
        .single();

    if (error) {
        throw new AppError('Failed to change district', 500, 'UPDATE_FAILED');
    }

    res.status(200).json({
        success: true,
        message: 'District changed successfully',
        data: {
            user: {
                id: updatedUser.id,
                name: updatedUser.name,
                district_id: updatedUser.district_id
            },
            district
        }
    });
});

/**
 * Deactivate user account
 */
const deactivateAccount = catchAsync(async (req, res) => {
    const user = req.user;

    // Only allow users to deactivate their own account (not admins)
    if (user.role === 'admin') {
        throw new AppError('Admin accounts cannot be deactivated', 403, 'ADMIN_DEACTIVATION_DENIED');
    }

    const { error } = await supabaseAdmin
        .from('users')
        .update({ is_active: false })
        .eq('id', user.id);

    if (error) {
        throw new AppError('Failed to deactivate account', 500, 'DEACTIVATION_FAILED');
    }

    res.status(200).json({
        success: true,
        message: 'Account deactivated successfully'
    });
});

module.exports = {
    getProfile,
    updateProfile,
    changeDistrict,
    deactivateAccount
};
