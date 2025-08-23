-- Database functions for statistics and analytics
-- Run these SQL functions in your Supabase SQL editor

-- Function to get farmer statistics
CREATE OR REPLACE FUNCTION get_farmer_stats(farmer_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_products', (
            SELECT COUNT(*) FROM products 
            WHERE farmer_id = $1 AND is_active = true
        ),
        'total_orders', (
            SELECT COUNT(*) FROM orders o
            JOIN products p ON o.product_id = p.id
            WHERE p.farmer_id = $1
        ),
        'total_revenue', (
            SELECT COALESCE(SUM(o.total_price), 0) FROM orders o
            JOIN products p ON o.product_id = p.id
            WHERE p.farmer_id = $1 AND o.status = 'delivered'
        ),
        'pending_orders', (
            SELECT COUNT(*) FROM orders o
            JOIN products p ON o.product_id = p.id
            WHERE p.farmer_id = $1 AND o.status IN ('booked', 'confirmed', 'picked')
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to get customer statistics
CREATE OR REPLACE FUNCTION get_customer_stats(customer_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_orders', (
            SELECT COUNT(*) FROM orders 
            WHERE customer_id = $1
        ),
        'total_spent', (
            SELECT COALESCE(SUM(total_price), 0) FROM orders
            WHERE customer_id = $1 AND status = 'delivered'
        ),
        'pending_orders', (
            SELECT COUNT(*) FROM orders
            WHERE customer_id = $1 AND status IN ('booked', 'confirmed', 'picked')
        ),
        'completed_orders', (
            SELECT COUNT(*) FROM orders
            WHERE customer_id = $1 AND status = 'delivered'
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to get agent statistics
CREATE OR REPLACE FUNCTION get_agent_stats(agent_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_orders', (
            SELECT COUNT(*) FROM orders 
            WHERE agent_id = $1
        ),
        'total_commission', (
            SELECT COALESCE(SUM(commission), 0) FROM orders
            WHERE agent_id = $1 AND status = 'delivered'
        ),
        'pending_orders', (
            SELECT COUNT(*) FROM orders
            WHERE agent_id = $1 AND status IN ('booked', 'confirmed', 'picked')
        ),
        'completed_orders', (
            SELECT COUNT(*) FROM orders
            WHERE agent_id = $1 AND status = 'delivered'
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to get district statistics
CREATE OR REPLACE FUNCTION get_district_stats(district_id UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_users', (
            SELECT COUNT(*) FROM users 
            WHERE district_id = $1 AND is_active = true
        ),
        'total_farmers', (
            SELECT COUNT(*) FROM users 
            WHERE district_id = $1 AND role = 'farmer' AND is_active = true
        ),
        'total_customers', (
            SELECT COUNT(*) FROM users 
            WHERE district_id = $1 AND role = 'customer' AND is_active = true
        ),
        'total_agents', (
            SELECT COUNT(*) FROM users 
            WHERE district_id = $1 AND role = 'agent' AND is_active = true
        ),
        'total_products', (
            SELECT COUNT(*) FROM products 
            WHERE district_id = $1 AND is_active = true
        ),
        'total_orders', (
            SELECT COUNT(*) FROM orders o
            JOIN products p ON o.product_id = p.id
            WHERE p.district_id = $1
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to get admin overview statistics
CREATE OR REPLACE FUNCTION get_admin_overview_stats()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_users', (
            SELECT COUNT(*) FROM users WHERE is_active = true
        ),
        'total_farmers', (
            SELECT COUNT(*) FROM users WHERE role = 'farmer' AND is_active = true
        ),
        'total_customers', (
            SELECT COUNT(*) FROM users WHERE role = 'customer' AND is_active = true
        ),
        'total_agents', (
            SELECT COUNT(*) FROM users WHERE role = 'agent' AND is_active = true
        ),
        'total_products', (
            SELECT COUNT(*) FROM products WHERE is_active = true
        ),
        'total_orders', (
            SELECT COUNT(*) FROM orders
        ),
        'total_revenue', (
            SELECT COALESCE(SUM(total_price), 0) FROM orders WHERE status = 'delivered'
        ),
        'pending_orders', (
            SELECT COUNT(*) FROM orders WHERE status IN ('booked', 'confirmed', 'picked')
        ),
        'completed_orders', (
            SELECT COUNT(*) FROM orders WHERE status = 'delivered'
        ),
        'cancelled_orders', (
            SELECT COUNT(*) FROM orders WHERE status = 'cancelled'
        ),
        'total_districts', (
            SELECT COUNT(*) FROM districts
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to get admin user statistics
CREATE OR REPLACE FUNCTION get_admin_user_stats()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'users_by_role', (
            SELECT json_object_agg(role, count)
            FROM (
                SELECT role, COUNT(*) as count
                FROM users 
                WHERE is_active = true
                GROUP BY role
            ) sub
        ),
        'users_by_district', (
            SELECT json_object_agg(district_name, count)
            FROM (
                SELECT d.name as district_name, COUNT(u.id) as count
                FROM districts d
                LEFT JOIN users u ON d.id = u.district_id AND u.is_active = true
                GROUP BY d.name
                ORDER BY count DESC
                LIMIT 10
            ) sub
        ),
        'recent_registrations', (
            SELECT COUNT(*) FROM users 
            WHERE registration_date >= NOW() - INTERVAL '30 days'
        ),
        'active_users', (
            SELECT COUNT(*) FROM users WHERE is_active = true
        ),
        'inactive_users', (
            SELECT COUNT(*) FROM users WHERE is_active = false
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to get admin product statistics
CREATE OR REPLACE FUNCTION get_admin_product_stats()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'products_by_category', (
            SELECT json_object_agg(category, count)
            FROM (
                SELECT 
                    COALESCE(category, 'Uncategorized') as category, 
                    COUNT(*) as count
                FROM products 
                WHERE is_active = true
                GROUP BY category
                ORDER BY count DESC
            ) sub
        ),
        'products_by_district', (
            SELECT json_object_agg(district_name, count)
            FROM (
                SELECT d.name as district_name, COUNT(p.id) as count
                FROM districts d
                LEFT JOIN products p ON d.id = p.district_id AND p.is_active = true
                GROUP BY d.name
                ORDER BY count DESC
                LIMIT 10
            ) sub
        ),
        'recent_products', (
            SELECT COUNT(*) FROM products 
            WHERE created_at >= NOW() - INTERVAL '30 days' AND is_active = true
        ),
        'total_active_products', (
            SELECT COUNT(*) FROM products WHERE is_active = true
        ),
        'total_inactive_products', (
            SELECT COUNT(*) FROM products WHERE is_active = false
        ),
        'average_product_price', (
            SELECT COALESCE(AVG(price), 0) FROM products WHERE is_active = true
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to get admin order statistics
CREATE OR REPLACE FUNCTION get_admin_order_stats()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'orders_by_status', (
            SELECT json_object_agg(status, count)
            FROM (
                SELECT status, COUNT(*) as count
                FROM orders 
                GROUP BY status
            ) sub
        ),
        'orders_by_month', (
            SELECT json_object_agg(month, count)
            FROM (
                SELECT 
                    TO_CHAR(created_at, 'YYYY-MM') as month, 
                    COUNT(*) as count
                FROM orders 
                WHERE created_at >= NOW() - INTERVAL '12 months'
                GROUP BY TO_CHAR(created_at, 'YYYY-MM')
                ORDER BY month DESC
            ) sub
        ),
        'revenue_by_month', (
            SELECT json_object_agg(month, revenue)
            FROM (
                SELECT 
                    TO_CHAR(created_at, 'YYYY-MM') as month, 
                    COALESCE(SUM(total_price), 0) as revenue
                FROM orders 
                WHERE created_at >= NOW() - INTERVAL '12 months' 
                AND status = 'delivered'
                GROUP BY TO_CHAR(created_at, 'YYYY-MM')
                ORDER BY month DESC
            ) sub
        ),
        'total_orders_today', (
            SELECT COUNT(*) FROM orders 
            WHERE DATE(created_at) = CURRENT_DATE
        ),
        'total_orders_this_month', (
            SELECT COUNT(*) FROM orders 
            WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)
        ),
        'average_order_value', (
            SELECT COALESCE(AVG(total_price), 0) FROM orders WHERE status = 'delivered'
        ),
        'total_commission_paid', (
            SELECT COALESCE(SUM(commission), 0) FROM orders WHERE status = 'delivered'
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;
