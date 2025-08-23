const { supabaseAdmin } = require('../config/supabase');
const { catchAsync, AppError } = require('../middlewares/errorHandler');
const { deleteImage } = require('../middlewares/uploadEnhanced');

/**
 * User Management
 */

// Get all users with filtering and pagination
const getAllUsers = catchAsync(async (req, res) => {
    const {
        role,
        district_id,
        is_active,
        search,
        page = 1,
        limit = 20,
        sort_by = 'created_at',
        sort_order = 'desc'
    } = req.query;

    let query = supabaseAdmin
        .from('users')
        .select(`
            *,
            district:districts(id, name)
        `, { count: 'exact' });

    // Apply filters
    if (role) {
        query = query.eq('role', role);
    }

    if (district_id) {
        query = query.eq('district_id', district_id);
    }

    if (is_active !== undefined) {
        query = query.eq('is_active', is_active === 'true');
    }

    if (search) {
        query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    // Apply sorting
    const validSortFields = ['created_at', 'updated_at', 'name', 'registration_date'];
    const sortField = validSortFields.includes(sort_by) ? sort_by : 'created_at';
    const sortDirection = sort_order === 'asc' ? { ascending: true } : { ascending: false };

    query = query.order(sortField, sortDirection);

    // Apply pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query = query.range(offset, offset + parseInt(limit) - 1);

    const { data: users, error, count } = await query;

    if (error) {
        throw new AppError('Failed to fetch users', 500, 'FETCH_FAILED');
    }

    res.status(200).json({
        success: true,
        message: 'Users retrieved successfully',
        data: {
            users,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: count,
                pages: Math.ceil(count / parseInt(limit))
            }
        }
    });
});

// Get single user
const getUser = catchAsync(async (req, res) => {
    const { id } = req.params;

    const { data: user, error } = await supabaseAdmin
        .from('users')
        .select(`
            *,
            district:districts(id, name)
        `)
        .eq('id', id)
        .single();

    if (error || !user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Get user statistics based on role
    let stats = {};
    try {
        switch (user.role) {
            case 'farmer':
                const { data: farmerStats } = await supabaseAdmin.rpc('get_farmer_stats', {
                    farmer_id: id
                });
                stats = farmerStats || {};
                break;
            case 'customer':
                const { data: customerStats } = await supabaseAdmin.rpc('get_customer_stats', {
                    customer_id: id
                });
                stats = customerStats || {};
                break;
            case 'agent':
                const { data: agentStats } = await supabaseAdmin.rpc('get_agent_stats', {
                    agent_id: id
                });
                stats = agentStats || {};
                break;
        }
    } catch (error) {
        console.error('Error fetching user stats:', error);
    }

    res.status(200).json({
        success: true,
        message: 'User retrieved successfully',
        data: { user, stats }
    });
});

// Update user
const updateUser = catchAsync(async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;

    const { data: user, error } = await supabaseAdmin
        .from('users')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        throw new AppError('Failed to update user', 500, 'UPDATE_FAILED');
    }

    res.status(200).json({
        success: true,
        message: 'User updated successfully',
        data: { user }
    });
});

// Delete user (hard delete)
const deleteUser = catchAsync(async (req, res) => {
    const { id } = req.params;

    // Get user to check if they have related data
    const { data: user, error: fetchError } = await supabaseAdmin
        .from('users')
        .select('role, image_url')
        .eq('id', id)
        .single();

    if (fetchError || !user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Check for related data
    if (user.role === 'farmer') {
        const { count: productCount } = await supabaseAdmin
            .from('products')
            .select('id', { count: 'exact' })
            .eq('farmer_id', id);

        if (productCount > 0) {
            throw new AppError('Cannot delete farmer with existing products', 400, 'HAS_RELATED_DATA');
        }
    }

    // Delete user
    const { error } = await supabaseAdmin
        .from('users')
        .delete()
        .eq('id', id);

    if (error) {
        throw new AppError('Failed to delete user', 500, 'DELETE_FAILED');
    }

    // Delete user image if exists
    if (user.image_url) {
        await deleteImage(user.image_url);
    }

    res.status(200).json({
        success: true,
        message: 'User deleted successfully'
    });
});

// Activate user
const activateUser = catchAsync(async (req, res) => {
    const { id } = req.params;

    const { data: user, error } = await supabaseAdmin
        .from('users')
        .update({ is_active: true })
        .eq('id', id)
        .select()
        .single();

    if (error) {
        throw new AppError('Failed to activate user', 500, 'ACTIVATION_FAILED');
    }

    res.status(200).json({
        success: true,
        message: 'User activated successfully',
        data: { user }
    });
});

// Deactivate user
const deactivateUser = catchAsync(async (req, res) => {
    const { id } = req.params;

    const { data: user, error } = await supabaseAdmin
        .from('users')
        .update({ is_active: false })
        .eq('id', id)
        .select()
        .single();

    if (error) {
        throw new AppError('Failed to deactivate user', 500, 'DEACTIVATION_FAILED');
    }

    res.status(200).json({
        success: true,
        message: 'User deactivated successfully',
        data: { user }
    });
});

/**
 * Product Management
 */

// Get all products (admin view)
const getAllProducts = catchAsync(async (req, res) => {
    const {
        farmer_id,
        district_id,
        category,
        is_active,
        search,
        page = 1,
        limit = 20,
        sort_by = 'created_at',
        sort_order = 'desc'
    } = req.query;

    let query = supabaseAdmin
        .from('products')
        .select(`
            *,
            farmer:users!farmer_id(id, name, phone),
            district:districts(id, name)
        `, { count: 'exact' });

    // Apply filters
    if (farmer_id) {
        query = query.eq('farmer_id', farmer_id);
    }

    if (district_id) {
        query = query.eq('district_id', district_id);
    }

    if (category) {
        query = query.eq('category', category);
    }

    if (is_active !== undefined) {
        query = query.eq('is_active', is_active === 'true');
    }

    if (search) {
        query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Apply sorting
    const validSortFields = ['created_at', 'updated_at', 'price', 'name'];
    const sortField = validSortFields.includes(sort_by) ? sort_by : 'created_at';
    const sortDirection = sort_order === 'asc' ? { ascending: true } : { ascending: false };

    query = query.order(sortField, sortDirection);

    // Apply pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query = query.range(offset, offset + parseInt(limit) - 1);

    const { data: products, error, count } = await query;

    if (error) {
        throw new AppError('Failed to fetch products', 500, 'FETCH_FAILED');
    }

    res.status(200).json({
        success: true,
        message: 'Products retrieved successfully',
        data: {
            products,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: count,
                pages: Math.ceil(count / parseInt(limit))
            }
        }
    });
});

// Delete product (hard delete)
const deleteProduct = catchAsync(async (req, res) => {
    const { id } = req.params;

    // Get product
    const { data: product, error: fetchError } = await supabaseAdmin
        .from('products')
        .select('image_url')
        .eq('id', id)
        .single();

    if (fetchError || !product) {
        throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
    }

    // Check for related orders
    const { count: orderCount } = await supabaseAdmin
        .from('orders')
        .select('id', { count: 'exact' })
        .eq('product_id', id);

    if (orderCount > 0) {
        throw new AppError('Cannot delete product with existing orders', 400, 'HAS_RELATED_ORDERS');
    }

    // Delete product
    const { error } = await supabaseAdmin
        .from('products')
        .delete()
        .eq('id', id);

    if (error) {
        throw new AppError('Failed to delete product', 500, 'DELETE_FAILED');
    }

    // Delete product image
    if (product.image_url) {
        await deleteImage(product.image_url);
    }

    res.status(200).json({
        success: true,
        message: 'Product deleted successfully'
    });
});

/**
 * Order Management
 */

// Get all orders
const getAllOrders = catchAsync(async (req, res) => {
    const {
        customer_id,
        farmer_id,
        agent_id,
        district_id,
        status,
        page = 1,
        limit = 20,
        sort_by = 'created_at',
        sort_order = 'desc'
    } = req.query;

    let query = supabaseAdmin
        .from('orders')
        .select(`
            *,
            product:products(*, farmer:users!farmer_id(id, name), district:districts(id, name)),
            customer:users!customer_id(id, name, phone),
            agent:users!agent_id(id, name, phone)
        `, { count: 'exact' });

    // Apply filters
    if (customer_id) {
        query = query.eq('customer_id', customer_id);
    }

    if (agent_id) {
        query = query.eq('agent_id', agent_id);
    }

    if (status) {
        query = query.eq('status', status);
    }

    // Apply sorting
    const validSortFields = ['created_at', 'updated_at', 'total_price', 'status'];
    const sortField = validSortFields.includes(sort_by) ? sort_by : 'created_at';
    const sortDirection = sort_order === 'asc' ? { ascending: true } : { ascending: false };

    query = query.order(sortField, sortDirection);

    // Apply pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query = query.range(offset, offset + parseInt(limit) - 1);

    const { data: orders, error, count } = await query;

    if (error) {
        throw new AppError('Failed to fetch orders', 500, 'FETCH_FAILED');
    }

    res.status(200).json({
        success: true,
        message: 'Orders retrieved successfully',
        data: {
            orders,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: count,
                pages: Math.ceil(count / parseInt(limit))
            }
        }
    });
});

// Update order
const updateOrder = catchAsync(async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;

    const { data: order, error } = await supabaseAdmin
        .from('orders')
        .update(updateData)
        .eq('id', id)
        .select(`
            *,
            product:products(*),
            customer:users!customer_id(id, name, phone),
            agent:users!agent_id(id, name, phone)
        `)
        .single();

    if (error) {
        throw new AppError('Failed to update order', 500, 'UPDATE_FAILED');
    }

    res.status(200).json({
        success: true,
        message: 'Order updated successfully',
        data: { order }
    });
});

// Delete order
const deleteOrder = catchAsync(async (req, res) => {
    const { id } = req.params;

    const { error } = await supabaseAdmin
        .from('orders')
        .delete()
        .eq('id', id);

    if (error) {
        throw new AppError('Failed to delete order', 500, 'DELETE_FAILED');
    }

    res.status(200).json({
        success: true,
        message: 'Order deleted successfully'
    });
});

/**
 * District Management
 */

// Get all districts (admin view)
const getAllDistricts = catchAsync(async (req, res) => {
    const { data: districts, error } = await supabaseAdmin
        .from('districts')
        .select('*')
        .order('name');

    if (error) {
        throw new AppError('Failed to fetch districts', 500, 'FETCH_FAILED');
    }

    // Get district statistics
    const districtsWithStats = await Promise.all(
        districts.map(async (district) => {
            try {
                const { data: stats } = await supabaseAdmin.rpc('get_district_stats', {
                    district_id: district.id
                });
                return { ...district, stats: stats || {} };
            } catch (error) {
                return { ...district, stats: {} };
            }
        })
    );

    res.status(200).json({
        success: true,
        message: 'Districts retrieved successfully',
        data: { districts: districtsWithStats }
    });
});

// Create district
const createDistrict = catchAsync(async (req, res) => {
    const { name } = req.body;

    const { data: district, error } = await supabaseAdmin
        .from('districts')
        .insert({ name })
        .select()
        .single();

    if (error) {
        if (error.code === '23505') { // Unique violation
            throw new AppError('District name already exists', 409, 'DISTRICT_EXISTS');
        }
        throw new AppError('Failed to create district', 500, 'CREATE_FAILED');
    }

    res.status(201).json({
        success: true,
        message: 'District created successfully',
        data: { district }
    });
});

// Update district
const updateDistrict = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;

    const { data: district, error } = await supabaseAdmin
        .from('districts')
        .update({ name })
        .eq('id', id)
        .select()
        .single();

    if (error) {
        if (error.code === '23505') { // Unique violation
            throw new AppError('District name already exists', 409, 'DISTRICT_EXISTS');
        }
        throw new AppError('Failed to update district', 500, 'UPDATE_FAILED');
    }

    res.status(200).json({
        success: true,
        message: 'District updated successfully',
        data: { district }
    });
});

// Delete district
const deleteDistrict = catchAsync(async (req, res) => {
    const { id } = req.params;

    // Check if district has users
    const { count: userCount } = await supabaseAdmin
        .from('users')
        .select('id', { count: 'exact' })
        .eq('district_id', id);

    if (userCount > 0) {
        throw new AppError('Cannot delete district with existing users', 400, 'HAS_RELATED_USERS');
    }

    // Check if district has products
    const { count: productCount } = await supabaseAdmin
        .from('products')
        .select('id', { count: 'exact' })
        .eq('district_id', id);

    if (productCount > 0) {
        throw new AppError('Cannot delete district with existing products', 400, 'HAS_RELATED_PRODUCTS');
    }

    const { error } = await supabaseAdmin
        .from('districts')
        .delete()
        .eq('id', id);

    if (error) {
        throw new AppError('Failed to delete district', 500, 'DELETE_FAILED');
    }

    res.status(200).json({
        success: true,
        message: 'District deleted successfully'
    });
});

/**
 * Analytics and Statistics
 */

// Get overview statistics
const getOverviewStats = catchAsync(async (req, res) => {
    try {
        const { data: stats } = await supabaseAdmin.rpc('get_admin_overview_stats');

        res.status(200).json({
            success: true,
            message: 'Overview statistics retrieved successfully',
            data: { stats: stats || {} }
        });
    } catch (error) {
        throw new AppError('Failed to fetch overview statistics', 500, 'STATS_FETCH_FAILED');
    }
});

// Get user statistics
const getUserStats = catchAsync(async (req, res) => {
    try {
        const { data: stats } = await supabaseAdmin.rpc('get_admin_user_stats');

        res.status(200).json({
            success: true,
            message: 'User statistics retrieved successfully',
            data: { stats: stats || {} }
        });
    } catch (error) {
        throw new AppError('Failed to fetch user statistics', 500, 'STATS_FETCH_FAILED');
    }
});

// Get product statistics
const getProductStats = catchAsync(async (req, res) => {
    try {
        const { data: stats } = await supabaseAdmin.rpc('get_admin_product_stats');

        res.status(200).json({
            success: true,
            message: 'Product statistics retrieved successfully',
            data: { stats: stats || {} }
        });
    } catch (error) {
        throw new AppError('Failed to fetch product statistics', 500, 'STATS_FETCH_FAILED');
    }
});

// Get order statistics
const getOrderStats = catchAsync(async (req, res) => {
    try {
        const { data: stats } = await supabaseAdmin.rpc('get_admin_order_stats');

        res.status(200).json({
            success: true,
            message: 'Order statistics retrieved successfully',
            data: { stats: stats || {} }
        });
    } catch (error) {
        throw new AppError('Failed to fetch order statistics', 500, 'STATS_FETCH_FAILED');
    }
});

module.exports = {
    // User management
    getAllUsers,
    getUser,
    updateUser,
    deleteUser,
    activateUser,
    deactivateUser,
    
    // Product management
    getAllProducts,
    deleteProduct,
    
    // Order management
    getAllOrders,
    updateOrder,
    deleteOrder,
    
    // District management
    getAllDistricts,
    createDistrict,
    updateDistrict,
    deleteDistrict,
    
    // Analytics
    getOverviewStats,
    getUserStats,
    getProductStats,
    getOrderStats
};
