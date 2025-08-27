-- Fix for infinite recursion in RLS policies
-- Run this in Supabase SQL Editor to fix the policies

-- First, drop ALL existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can update all users" ON users;
DROP POLICY IF EXISTS "New users can insert their profile" ON users;

DROP POLICY IF EXISTS "Anyone can view active products" ON products;
DROP POLICY IF EXISTS "Farmers can manage own products" ON products;
DROP POLICY IF EXISTS "Admins can manage all products" ON products;

DROP POLICY IF EXISTS "Users can view related orders" ON orders;
DROP POLICY IF EXISTS "Customers can view own orders" ON orders;
DROP POLICY IF EXISTS "Agents can view assigned orders" ON orders;
DROP POLICY IF EXISTS "Farmers can view orders for their products" ON orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON orders;
DROP POLICY IF EXISTS "Customers can create orders" ON orders;
DROP POLICY IF EXISTS "Users can update related orders" ON orders;

DROP POLICY IF EXISTS "Authenticated users can view districts" ON districts;
DROP POLICY IF EXISTS "Only admins can modify districts" ON districts;
DROP POLICY IF EXISTS "Admins can modify districts" ON districts;

DROP POLICY IF EXISTS "Users can view related order items" ON order_items;
DROP POLICY IF EXISTS "Customers can create order items" ON order_items;

-- Create a function to get user role from auth.jwt()
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN COALESCE(
    (auth.jwt() ->> 'user_role'),
    (SELECT role FROM users WHERE id = auth.uid() LIMIT 1),
    'customer'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create improved policies without recursion
-- Users policies
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON users
    FOR SELECT USING (get_user_role() = 'admin');

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can update all users" ON users
    FOR UPDATE USING (get_user_role() = 'admin');

CREATE POLICY "New users can insert their profile" ON users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Products policies
CREATE POLICY "Anyone can view active products" ON products
    FOR SELECT USING (is_active = true);

CREATE POLICY "Farmers can manage own products" ON products
    FOR ALL USING (farmer_id = auth.uid());

CREATE POLICY "Admins can manage all products" ON products
    FOR ALL USING (get_user_role() = 'admin');

-- Orders policies  
CREATE POLICY "Customers can view own orders" ON orders
    FOR SELECT USING (customer_id = auth.uid());

CREATE POLICY "Agents can view assigned orders" ON orders
    FOR SELECT USING (agent_id = auth.uid());

CREATE POLICY "Farmers can view orders for their products" ON orders
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM products p 
            WHERE p.id = product_id AND p.farmer_id = auth.uid()
        )
    );

CREATE POLICY "Admins can view all orders" ON orders
    FOR SELECT USING (get_user_role() = 'admin');

CREATE POLICY "Customers can create orders" ON orders
    FOR INSERT WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Users can update related orders" ON orders
    FOR UPDATE USING (
        customer_id = auth.uid() OR 
        agent_id = auth.uid() OR 
        get_user_role() = 'admin' OR
        EXISTS (
            SELECT 1 FROM products p 
            WHERE p.id = product_id AND p.farmer_id = auth.uid()
        )
    );

-- Districts policies (keep simple)
CREATE POLICY "Authenticated users can view districts" ON districts
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can modify districts" ON districts
    FOR ALL USING (get_user_role() = 'admin');

-- Order items policies
CREATE POLICY "Users can view related order items" ON order_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM orders o 
            WHERE o.id = order_id AND (
                o.customer_id = auth.uid() OR 
                o.agent_id = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM products p 
                    WHERE p.id = o.product_id AND p.farmer_id = auth.uid()
                )
            )
        ) OR get_user_role() = 'admin'
    );

CREATE POLICY "Customers can create order items" ON order_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM orders o 
            WHERE o.id = order_id AND o.customer_id = auth.uid()
        )
    );

-- Enable RLS on order_items if not already enabled
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
