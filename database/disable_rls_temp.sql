-- Quick fix: Temporarily disable RLS for testing
-- Run this in Supabase SQL Editor for immediate testing

-- Disable RLS on all tables temporarily
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY; 
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE districts DISABLE ROW LEVEL SECURITY;

-- Note: This removes security restrictions, only use for testing
-- You should re-enable RLS and fix policies later for production
