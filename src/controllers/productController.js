const { supabaseAdmin } = require('../config/supabase');
const { catchAsync, AppError } = require('../middlewares/errorHandler');
const { deleteImage } = require('../middlewares/uploadEnhanced');

/**
 * Get all products with filtering and pagination
 */
const getProducts = catchAsync(async (req, res) => {
    const {
        district_id,
        farmer_id,
        category,
        search,
        min_price,
        max_price,
        page = 1,
        limit = 20,
        sort_by = 'created_at',
        sort_order = 'desc'
    } = req.query;

    let query = supabaseAdmin
        .from('products')
        .select(`
            *,
            farmer:users!farmer_id(id, name, phone, image_url),
            district:districts(id, name)
        `)
        .eq('is_active', true);

    // Apply filters
    if (district_id) {
        query = query.eq('district_id', district_id);
    }

    if (farmer_id) {
        query = query.eq('farmer_id', farmer_id);
    }

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

/**
 * Get single product by ID
 */
const getProduct = catchAsync(async (req, res) => {
    const { id } = req.params;

    const { data: product, error } = await supabaseAdmin
        .from('products')
        .select(`
            *,
            farmer:users!farmer_id(id, name, phone, image_url),
            district:districts(id, name)
        `)
        .eq('id', id)
        .eq('is_active', true)
        .single();

    if (error || !product) {
        throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
    }

    res.status(200).json({
        success: true,
        message: 'Product retrieved successfully',
        data: { product }
    });
});

/**
 * Create new product (Farmer only)
 */
const createProduct = catchAsync(async (req, res) => {
    const user = req.user;
    const productData = req.body;

    // Ensure only farmers can create products
    if (user.role !== 'farmer' && user.role !== 'admin') {
        throw new AppError('Only farmers can create products', 403, 'INSUFFICIENT_PERMISSIONS');
    }

    // Add farmer ID and image URL
    const newProduct = {
        ...productData,
        farmer_id: user.id,
        image_url: req.imageUrl || null
    };

    const { data: product, error } = await supabaseAdmin
        .from('products')
        .insert(newProduct)
        .select(`
            *,
            farmer:users!farmer_id(id, name, phone),
            district:districts(id, name)
        `)
        .single();

    if (error) {
        // If product creation fails, clean up uploaded image
        if (req.imageUrl) {
            await deleteImage(req.imageUrl);
        }
        throw new AppError('Failed to create product', 500, 'CREATE_FAILED');
    }

    res.status(201).json({
        success: true,
        message: 'Product created successfully',
        data: { product }
    });
});

/**
 * Update product (Farmer can update own products, Admin can update any)
 */
const updateProduct = catchAsync(async (req, res) => {
    const { id } = req.params;
    const user = req.user;
    const updateData = req.body;

    // Get existing product
    const { data: existingProduct, error: fetchError } = await supabaseAdmin
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

    if (fetchError || !existingProduct) {
        throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
    }

    // Check permissions
    if (user.role !== 'admin' && existingProduct.farmer_id !== user.id) {
        throw new AppError('You can only update your own products', 403, 'INSUFFICIENT_PERMISSIONS');
    }

    // Prepare update data
    const updatedData = { ...updateData };
    
    // Add new image URL if uploaded
    if (req.imageUrl) {
        updatedData.image_url = req.imageUrl;
    }

    const { data: product, error } = await supabaseAdmin
        .from('products')
        .update(updatedData)
        .eq('id', id)
        .select(`
            *,
            farmer:users!farmer_id(id, name, phone),
            district:districts(id, name)
        `)
        .single();

    if (error) {
        // If update fails, clean up new uploaded image
        if (req.imageUrl) {
            await deleteImage(req.imageUrl);
        }
        throw new AppError('Failed to update product', 500, 'UPDATE_FAILED');
    }

    // Delete old image if new one was uploaded
    if (req.imageUrl && existingProduct.image_url && existingProduct.image_url !== req.imageUrl) {
        await deleteImage(existingProduct.image_url);
    }

    res.status(200).json({
        success: true,
        message: 'Product updated successfully',
        data: { product }
    });
});

/**
 * Delete product (Farmer can delete own products, Admin can delete any)
 */
const deleteProduct = catchAsync(async (req, res) => {
    const { id } = req.params;
    const user = req.user;

    // Get existing product
    const { data: existingProduct, error: fetchError } = await supabaseAdmin
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

    if (fetchError || !existingProduct) {
        throw new AppError('Product not found', 404, 'PRODUCT_NOT_FOUND');
    }

    // Check permissions
    if (user.role !== 'admin' && existingProduct.farmer_id !== user.id) {
        throw new AppError('You can only delete your own products', 403, 'INSUFFICIENT_PERMISSIONS');
    }

    // Soft delete (set is_active to false)
    const { error } = await supabaseAdmin
        .from('products')
        .update({ is_active: false })
        .eq('id', id);

    if (error) {
        throw new AppError('Failed to delete product', 500, 'DELETE_FAILED');
    }

    // Delete associated image
    if (existingProduct.image_url) {
        await deleteImage(existingProduct.image_url);
    }

    res.status(200).json({
        success: true,
        message: 'Product deleted successfully'
    });
});

/**
 * Get farmer's own products
 */
const getMyProducts = catchAsync(async (req, res) => {
    const user = req.user;
    const {
        category,
        search,
        is_active,
        page = 1,
        limit = 20,
        sort_by = 'created_at',
        sort_order = 'desc'
    } = req.query;

    let query = supabaseAdmin
        .from('products')
        .select(`
            *,
            district:districts(id, name)
        `)
        .eq('farmer_id', user.id);

    // Apply filters
    if (category) {
        query = query.eq('category', category);
    }

    if (search) {
        query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    if (is_active !== undefined) {
        query = query.eq('is_active', is_active === 'true');
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

module.exports = {
    getProducts,
    getProduct,
    createProduct,
    updateProduct,
    deleteProduct,
    getMyProducts
};
