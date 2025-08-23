-- Database Schema for Krishoker Ponno App
-- Run these SQL commands in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create Districts table
CREATE TABLE districts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Users table (extends Supabase auth.users)
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('farmer', 'agent', 'customer', 'admin')),
    language VARCHAR(10) DEFAULT 'bn',
    image_url TEXT,
    nid VARCHAR(20), -- National ID (optional)
    district_id UUID REFERENCES districts(id) ON DELETE SET NULL,
    registration_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Products table
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farmer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL CHECK (price > 0),
    image_url TEXT,
    district_id UUID NOT NULL REFERENCES districts(id) ON DELETE RESTRICT,
    category VARCHAR(100),
    unit VARCHAR(50) DEFAULT 'kg', -- kg, piece, liter, etc.
    available_quantity DECIMAL(10,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Orders table
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES users(id) ON DELETE SET NULL,
    quantity DECIMAL(10,2) NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    commission DECIMAL(10,2) DEFAULT 0,
    commission_rate DECIMAL(5,2) DEFAULT 5.00, -- Percentage
    status VARCHAR(20) DEFAULT 'booked' CHECK (status IN ('booked', 'confirmed', 'picked', 'delivered', 'cancelled')),
    delivery_address TEXT,
    customer_notes TEXT,
    agent_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Order Items table (for multi-product orders)
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity DECIMAL(10,2) NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_district ON users(district_id);
CREATE INDEX idx_products_farmer ON products(farmer_id);
CREATE INDEX idx_products_district ON products(district_id);
CREATE INDEX idx_products_active ON products(is_active);
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_agent ON orders(agent_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created ON orders(created_at);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_districts_updated_at BEFORE UPDATE ON districts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample districts (Bangladesh)
INSERT INTO districts (name) VALUES 
('Dhaka'),
('Chittagong'),
('Rajshahi'),
('Khulna'),
('Barisal'),
('Sylhet'),
('Rangpur'),
('Mymensingh'),
('Comilla'),
('Gazipur'),
('Narayanganj'),
('Bogra'),
('Jessore'),
('Dinajpur'),
('Kushtia'),
('Faridpur'),
('Pabna'),
('Noakhali'),
('Brahmanbaria'),
('Tangail');

-- Row Level Security (RLS) Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE districts ENABLE ROW LEVEL SECURITY;

-- Users can read their own data and admins can read all
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id OR 
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin');

-- Users can update their own data
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Products policies
CREATE POLICY "Anyone can view active products" ON products
    FOR SELECT USING (is_active = true);

CREATE POLICY "Farmers can manage own products" ON products
    FOR ALL USING (farmer_id = auth.uid() OR 
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin');

-- Orders policies
CREATE POLICY "Users can view related orders" ON orders
    FOR SELECT USING (
        customer_id = auth.uid() OR 
        agent_id = auth.uid() OR 
        (SELECT farmer_id FROM products WHERE id = product_id) = auth.uid() OR
        (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
    );

-- Districts are readable by all authenticated users
CREATE POLICY "Authenticated users can view districts" ON districts
    FOR SELECT TO authenticated USING (true);

-- Only admins can modify districts
CREATE POLICY "Only admins can modify districts" ON districts
    FOR ALL USING ((SELECT role FROM users WHERE id = auth.uid()) = 'admin');
