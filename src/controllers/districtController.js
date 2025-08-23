const { supabaseAdmin } = require('../config/supabase');
const { catchAsync, AppError } = require('../middlewares/errorHandler');

/**
 * Get all districts
 */
const getDistricts = catchAsync(async (req, res) => {
    const { data: districts, error } = await supabaseAdmin
        .from('districts')
        .select('*')
        .order('name');

    if (error) {
        throw new AppError('Failed to fetch districts', 500, 'FETCH_FAILED');
    }

    res.status(200).json({
        success: true,
        message: 'Districts retrieved successfully',
        data: { districts }
    });
});

/**
 * Get single district by ID
 */
const getDistrict = catchAsync(async (req, res) => {
    const { id } = req.params;

    const { data: district, error } = await supabaseAdmin
        .from('districts')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !district) {
        throw new AppError('District not found', 404, 'DISTRICT_NOT_FOUND');
    }

    // Get district statistics
    const { data: stats } = await supabaseAdmin.rpc('get_district_stats', {
        district_id: id
    });

    res.status(200).json({
        success: true,
        message: 'District retrieved successfully',
        data: { 
            district,
            stats: stats || {}
        }
    });
});

/**
 * Get agents in a specific district
 */
const getDistrictAgents = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;

    // Verify district exists
    const { data: district, error: districtError } = await supabaseAdmin
        .from('districts')
        .select('id, name')
        .eq('id', id)
        .single();

    if (districtError || !district) {
        throw new AppError('District not found', 404, 'DISTRICT_NOT_FOUND');
    }

    // Get agents in the district
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    const { data: agents, error, count } = await supabaseAdmin
        .from('users')
        .select('id, name, phone, image_url, registration_date', { count: 'exact' })
        .eq('role', 'agent')
        .eq('district_id', id)
        .eq('is_active', true)
        .order('name')
        .range(offset, offset + parseInt(limit) - 1);

    if (error) {
        throw new AppError('Failed to fetch agents', 500, 'FETCH_FAILED');
    }

    res.status(200).json({
        success: true,
        message: 'District agents retrieved successfully',
        data: {
            district,
            agents,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: count,
                pages: Math.ceil(count / parseInt(limit))
            }
        }
    });
});

/**
 * Get products in a specific district
 */
const getDistrictProducts = catchAsync(async (req, res) => {
    const { id } = req.params;
    const {
        category,
        search,
        min_price,
        max_price,
        page = 1,
        limit = 20,
        sort_by = 'created_at',
        sort_order = 'desc'
    } = req.query;

    // Verify district exists
    const { data: district, error: districtError } = await supabaseAdmin
        .from('districts')
        .select('id, name')
        .eq('id', id)
        .single();

    if (districtError || !district) {
        throw new AppError('District not found', 404, 'DISTRICT_NOT_FOUND');
    }

    let query = supabaseAdmin
        .from('products')
        .select(`
            *,
            farmer:users!farmer_id(id, name, phone, image_url)
        `, { count: 'exact' })
        .eq('district_id', id)
        .eq('is_active', true);

    // Apply filters
    if (category) {
        query = query.eq('category', category);
    }

    if (search) {
        query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    if (min_price) {
        query = query.gte('price', parseFloat(min_price));
    }

    if (max_price) {
        query = query.lte('price', parseFloat(max_price));
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
        message: 'District products retrieved successfully',
        data: {
            district,
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

module.exports = {
    getDistricts,
    getDistrict,
    getDistrictAgents,
    getDistrictProducts
};
