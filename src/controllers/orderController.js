const { supabaseAdmin } = require('../config/supabase');
const { catchAsync, AppError } = require('../middlewares/errorHandler');

/**
 * Create new order
 */
const createOrder = catchAsync(async (req, res) => {
    const user = req.user;
    const { product_id, quantity, agent_id, delivery_address, customer_notes } = req.body;

    // Ensure only customers can create orders
    if (user.role !== 'customer' && user.role !== 'admin') {
        throw new AppError('Only customers can create orders', 403, 'INSUFFICIENT_PERMISSIONS');
    }

    // Get product details
    const { data: product, error: productError } = await supabaseAdmin
        .from('products')
        .select('*, farmer:users!farmer_id(id, name, district_id)')
        .eq('id', product_id)
        .eq('is_active', true)
        .single();

    if (productError || !product) {
        throw new AppError('Product not found or inactive', 404, 'PRODUCT_NOT_FOUND');
    }

    // Check if sufficient quantity is available
    if (product.available_quantity < quantity) {
        throw new AppError('Insufficient product quantity available', 400, 'INSUFFICIENT_QUANTITY');
    }

    // Validate agent if provided
    let agentData = null;
    if (agent_id) {
        const { data: agent, error: agentError } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('id', agent_id)
            .eq('role', 'agent')
            .eq('is_active', true)
            .single();

        if (agentError || !agent) {
            throw new AppError('Agent not found or inactive', 404, 'AGENT_NOT_FOUND');
        }

        // Check if agent is in the same district as the product
        if (agent.district_id !== product.district_id) {
            throw new AppError('Agent must be from the same district as the product', 400, 'AGENT_DISTRICT_MISMATCH');
        }

        agentData = agent;
    }

    // Calculate order details
    const unit_price = product.price;
    const total_price = unit_price * quantity;
    const commission_rate = 5.00; // 5% commission
    const commission = agentData ? (total_price * commission_rate) / 100 : 0;

    // Create order
    const orderData = {
        product_id,
        customer_id: user.id,
        agent_id: agent_id || null,
        quantity,
        unit_price,
        total_price,
        commission,
        commission_rate,
        status: 'booked',
        delivery_address,
        customer_notes
    };

    const { data: order, error: orderError } = await supabaseAdmin
        .from('orders')
        .insert(orderData)
        .select(`
            *,
            product:products(*),
            customer:users!customer_id(id, name, phone),
            agent:users!agent_id(id, name, phone)
        `)
        .single();

    if (orderError) {
        throw new AppError('Failed to create order', 500, 'ORDER_CREATE_FAILED');
    }

    // Update product available quantity
    const { error: updateError } = await supabaseAdmin
        .from('products')
        .update({
            available_quantity: product.available_quantity - quantity
        })
        .eq('id', product_id);

    if (updateError) {
        console.error('Failed to update product quantity:', updateError);
        // Note: In production, you might want to implement compensation patterns here
    }

    res.status(201).json({
        success: true,
        message: 'Order created successfully',
        data: { order }
    });
});

/**
 * Get orders for current user (role-based filtering)
 */
const getMyOrders = catchAsync(async (req, res) => {
    const user = req.user;
    const {
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
            product:products(*, farmer:users!farmer_id(id, name, phone)),
            customer:users!customer_id(id, name, phone),
            agent:users!agent_id(id, name, phone)
        `);

    // Apply role-based filtering
    switch (user.role) {
        case 'customer':
            query = query.eq('customer_id', user.id);
            break;
        case 'agent':
            query = query.eq('agent_id', user.id);
            break;
        case 'farmer':
            // Get orders for farmer's products
            query = query.eq('product.farmer_id', user.id);
            break;
        case 'admin':
            // Admin can see all orders
            break;
        default:
            throw new AppError('Invalid user role', 403, 'INVALID_ROLE');
    }

    // Apply status filter
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

/**
 * Get single order by ID
 */
const getOrder = catchAsync(async (req, res) => {
    const { id } = req.params;
    const user = req.user;

    const { data: order, error } = await supabaseAdmin
        .from('orders')
        .select(`
            *,
            product:products(*, farmer:users!farmer_id(id, name, phone)),
            customer:users!customer_id(id, name, phone),
            agent:users!agent_id(id, name, phone)
        `)
        .eq('id', id)
        .single();

    if (error || !order) {
        throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');
    }

    // Check permissions
    const hasAccess = user.role === 'admin' ||
                     order.customer_id === user.id ||
                     order.agent_id === user.id ||
                     order.product.farmer_id === user.id;

    if (!hasAccess) {
        throw new AppError('Access denied', 403, 'ACCESS_DENIED');
    }

    res.status(200).json({
        success: true,
        message: 'Order retrieved successfully',
        data: { order }
    });
});

/**
 * Update order status (Agent/Admin only)
 */
const updateOrderStatus = catchAsync(async (req, res) => {
    const { id } = req.params;
    const user = req.user;
    const { status, agent_notes } = req.body;

    // Get existing order
    const { data: existingOrder, error: fetchError } = await supabaseAdmin
        .from('orders')
        .select('*, product:products(farmer_id)')
        .eq('id', id)
        .single();

    if (fetchError || !existingOrder) {
        throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');
    }

    // Check permissions
    const canUpdate = user.role === 'admin' ||
                     (user.role === 'agent' && existingOrder.agent_id === user.id) ||
                     (user.role === 'farmer' && existingOrder.product.farmer_id === user.id);

    if (!canUpdate) {
        throw new AppError('Insufficient permissions to update this order', 403, 'INSUFFICIENT_PERMISSIONS');
    }

    // Validate status transitions
    const validTransitions = {
        'booked': ['confirmed', 'cancelled'],
        'confirmed': ['picked', 'cancelled'],
        'picked': ['delivered', 'cancelled'],
        'delivered': [], // Final state
        'cancelled': [] // Final state
    };

    const currentStatus = existingOrder.status;
    if (!validTransitions[currentStatus].includes(status)) {
        throw new AppError(`Cannot change status from ${currentStatus} to ${status}`, 400, 'INVALID_STATUS_TRANSITION');
    }

    // Update order
    const updateData = { status };
    if (agent_notes) {
        updateData.agent_notes = agent_notes;
    }

    const { data: order, error } = await supabaseAdmin
        .from('orders')
        .update(updateData)
        .eq('id', id)
        .select(`
            *,
            product:products(*, farmer:users!farmer_id(id, name, phone)),
            customer:users!customer_id(id, name, phone),
            agent:users!agent_id(id, name, phone)
        `)
        .single();

    if (error) {
        throw new AppError('Failed to update order', 500, 'UPDATE_FAILED');
    }

    res.status(200).json({
        success: true,
        message: 'Order status updated successfully',
        data: { order }
    });
});

/**
 * Assign agent to order
 */
const assignAgent = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { agent_id } = req.body;
    const user = req.user;

    // Only customers and admins can assign agents
    if (user.role !== 'customer' && user.role !== 'admin') {
        throw new AppError('Only customers and admins can assign agents', 403, 'INSUFFICIENT_PERMISSIONS');
    }

    // Get existing order
    const { data: existingOrder, error: fetchError } = await supabaseAdmin
        .from('orders')
        .select('*, product:products(district_id)')
        .eq('id', id)
        .single();

    if (fetchError || !existingOrder) {
        throw new AppError('Order not found', 404, 'ORDER_NOT_FOUND');
    }

    // Check if customer owns this order (if not admin)
    if (user.role === 'customer' && existingOrder.customer_id !== user.id) {
        throw new AppError('You can only assign agents to your own orders', 403, 'ACCESS_DENIED');
    }

    // Validate agent
    const { data: agent, error: agentError } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', agent_id)
        .eq('role', 'agent')
        .eq('is_active', true)
        .single();

    if (agentError || !agent) {
        throw new AppError('Agent not found or inactive', 404, 'AGENT_NOT_FOUND');
    }

    // Check if agent is in the same district as the product
    if (agent.district_id !== existingOrder.product.district_id) {
        throw new AppError('Agent must be from the same district as the product', 400, 'AGENT_DISTRICT_MISMATCH');
    }

    // Calculate commission
    const commission_rate = 5.00; // 5%
    const commission = (existingOrder.total_price * commission_rate) / 100;

    // Update order
    const { data: order, error } = await supabaseAdmin
        .from('orders')
        .update({
            agent_id,
            commission,
            commission_rate
        })
        .eq('id', id)
        .select(`
            *,
            product:products(*, farmer:users!farmer_id(id, name, phone)),
            customer:users!customer_id(id, name, phone),
            agent:users!agent_id(id, name, phone)
        `)
        .single();

    if (error) {
        throw new AppError('Failed to assign agent', 500, 'ASSIGN_FAILED');
    }

    res.status(200).json({
        success: true,
        message: 'Agent assigned successfully',
        data: { order }
    });
});

/**
 * Get available agents by district
 */
const getAvailableAgents = catchAsync(async (req, res) => {
    const { district_id } = req.query;

    if (!district_id) {
        throw new AppError('District ID is required', 400, 'DISTRICT_REQUIRED');
    }

    const { data: agents, error } = await supabaseAdmin
        .from('users')
        .select('id, name, phone, image_url, district_id')
        .eq('role', 'agent')
        .eq('district_id', district_id)
        .eq('is_active', true)
        .order('name');

    if (error) {
        throw new AppError('Failed to fetch agents', 500, 'FETCH_FAILED');
    }

    res.status(200).json({
        success: true,
        message: 'Available agents retrieved successfully',
        data: { agents }
    });
});

module.exports = {
    createOrder,
    getMyOrders,
    getOrder,
    updateOrderStatus,
    assignAgent,
    getAvailableAgents
};
