-- Enhanced Database Schema and Indexes Migration
-- This migration adds proper foreign key relationships, indexes, and constraints
-- for the SME Platform database schema

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create indexes for better query performance
-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Companies table indexes
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
CREATE INDEX IF NOT EXISTS idx_companies_gst_number ON companies(gst_number) WHERE gst_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_companies_pan_number ON companies(pan_number) WHERE pan_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_companies_industry ON companies(industry) WHERE industry IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_companies_created_at ON companies(created_at);

-- Contacts table indexes
CREATE INDEX IF NOT EXISTS idx_contacts_company_id ON contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_type ON contacts(type);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);
CREATE INDEX IF NOT EXISTS idx_contacts_name_trgm ON contacts USING gin(name gin_trgm_ops);

-- Products table indexes
CREATE INDEX IF NOT EXISTS idx_products_company_id ON products(company_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category) WHERE category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_stock_quantity ON products(stock_quantity);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price);

-- Orders table indexes
CREATE INDEX IF NOT EXISTS idx_orders_company_id ON orders(company_id);
CREATE INDEX IF NOT EXISTS idx_orders_contact_id ON orders(contact_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_order_date ON orders(order_date);
CREATE INDEX IF NOT EXISTS idx_orders_total_amount ON orders(total_amount);

-- Order items table indexes
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items(product_id);

-- Wallets table indexes
CREATE INDEX IF NOT EXISTS idx_wallets_company_id ON wallets(company_id);
CREATE INDEX IF NOT EXISTS idx_wallets_currency ON wallets(currency);

-- Investments table indexes
CREATE INDEX IF NOT EXISTS idx_investments_company_id ON investments(company_id);
CREATE INDEX IF NOT EXISTS idx_investments_status ON investments(status);
CREATE INDEX IF NOT EXISTS idx_investments_investment_date ON investments(investment_date);
CREATE INDEX IF NOT EXISTS idx_investments_maturity_date ON investments(maturity_date) WHERE maturity_date IS NOT NULL;

-- Add foreign key constraints with proper naming
-- Users table foreign keys
ALTER TABLE users 
ADD CONSTRAINT IF NOT EXISTS fk_users_company_id 
FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

-- Contacts table foreign keys
ALTER TABLE contacts 
ADD CONSTRAINT IF NOT EXISTS fk_contacts_company_id 
FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

-- Products table foreign keys
ALTER TABLE products 
ADD CONSTRAINT IF NOT EXISTS fk_products_company_id 
FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

-- Orders table foreign keys
ALTER TABLE orders 
ADD CONSTRAINT IF NOT EXISTS fk_orders_company_id 
FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

ALTER TABLE orders 
ADD CONSTRAINT IF NOT EXISTS fk_orders_contact_id 
FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE RESTRICT;

-- Order items table foreign keys
ALTER TABLE order_items 
ADD CONSTRAINT IF NOT EXISTS fk_order_items_order_id 
FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;

ALTER TABLE order_items 
ADD CONSTRAINT IF NOT EXISTS fk_order_items_product_id 
FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT;

-- Wallets table foreign keys
ALTER TABLE wallets 
ADD CONSTRAINT IF NOT EXISTS fk_wallets_company_id 
FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

-- Investments table foreign keys
ALTER TABLE investments 
ADD CONSTRAINT IF NOT EXISTS fk_investments_company_id 
FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;

-- Add check constraints for data validation
-- Users table constraints
ALTER TABLE users 
ADD CONSTRAINT IF NOT EXISTS chk_users_role 
CHECK (role IN ('admin', 'owner', 'employee'));

ALTER TABLE users 
ADD CONSTRAINT IF NOT EXISTS chk_users_email_format 
CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Companies table constraints
ALTER TABLE companies 
ADD CONSTRAINT IF NOT EXISTS chk_companies_name_length 
CHECK (length(trim(name)) >= 2);

ALTER TABLE companies 
ADD CONSTRAINT IF NOT EXISTS chk_companies_gst_format 
CHECK (gst_number IS NULL OR gst_number ~* '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$');

ALTER TABLE companies 
ADD CONSTRAINT IF NOT EXISTS chk_companies_pan_format 
CHECK (pan_number IS NULL OR pan_number ~* '^[A-Z]{5}[0-9]{4}[A-Z]{1}$');

-- Contacts table constraints
ALTER TABLE contacts 
ADD CONSTRAINT IF NOT EXISTS chk_contacts_type 
CHECK (type IN ('lead', 'customer', 'vendor'));

ALTER TABLE contacts 
ADD CONSTRAINT IF NOT EXISTS chk_contacts_status 
CHECK (status IN ('active', 'inactive'));

ALTER TABLE contacts 
ADD CONSTRAINT IF NOT EXISTS chk_contacts_email_format 
CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

ALTER TABLE contacts 
ADD CONSTRAINT IF NOT EXISTS chk_contacts_name_length 
CHECK (length(trim(name)) >= 2);

-- Products table constraints
ALTER TABLE products 
ADD CONSTRAINT IF NOT EXISTS chk_products_status 
CHECK (status IN ('active', 'inactive'));

ALTER TABLE products 
ADD CONSTRAINT IF NOT EXISTS chk_products_price_positive 
CHECK (price >= 0);

ALTER TABLE products 
ADD CONSTRAINT IF NOT EXISTS chk_products_stock_non_negative 
CHECK (stock_quantity >= 0);

ALTER TABLE products 
ADD CONSTRAINT IF NOT EXISTS chk_products_reorder_non_negative 
CHECK (reorder_level >= 0);

ALTER TABLE products 
ADD CONSTRAINT IF NOT EXISTS chk_products_name_length 
CHECK (length(trim(name)) >= 2);

ALTER TABLE products 
ADD CONSTRAINT IF NOT EXISTS chk_products_sku_length 
CHECK (length(trim(sku)) >= 2);

-- Orders table constraints
ALTER TABLE orders 
ADD CONSTRAINT IF NOT EXISTS chk_orders_status 
CHECK (status IN ('draft', 'confirmed', 'shipped', 'delivered'));

ALTER TABLE orders 
ADD CONSTRAINT IF NOT EXISTS chk_orders_total_positive 
CHECK (total_amount >= 0);

ALTER TABLE orders 
ADD CONSTRAINT IF NOT EXISTS chk_orders_order_number_length 
CHECK (length(trim(order_number)) >= 3);

-- Order items table constraints
ALTER TABLE order_items 
ADD CONSTRAINT IF NOT EXISTS chk_order_items_quantity_positive 
CHECK (quantity > 0);

ALTER TABLE order_items 
ADD CONSTRAINT IF NOT EXISTS chk_order_items_unit_price_non_negative 
CHECK (unit_price >= 0);

ALTER TABLE order_items 
ADD CONSTRAINT IF NOT EXISTS chk_order_items_subtotal_non_negative 
CHECK (subtotal >= 0);

-- Wallets table constraints
ALTER TABLE wallets 
ADD CONSTRAINT IF NOT EXISTS chk_wallets_balance_non_negative 
CHECK (balance >= 0);

ALTER TABLE wallets 
ADD CONSTRAINT IF NOT EXISTS chk_wallets_currency_format 
CHECK (currency ~* '^[A-Z]{3}$');

-- Investments table constraints
ALTER TABLE investments 
ADD CONSTRAINT IF NOT EXISTS chk_investments_status 
CHECK (status IN ('active', 'matured', 'withdrawn'));

ALTER TABLE investments 
ADD CONSTRAINT IF NOT EXISTS chk_investments_amount_positive 
CHECK (amount > 0);

ALTER TABLE investments 
ADD CONSTRAINT IF NOT EXISTS chk_investments_expected_return_non_negative 
CHECK (expected_return >= 0);

ALTER TABLE investments 
ADD CONSTRAINT IF NOT EXISTS chk_investments_actual_return_non_negative 
CHECK (actual_return IS NULL OR actual_return >= 0);

-- Add unique constraints where appropriate
-- Companies table unique constraints
ALTER TABLE companies 
ADD CONSTRAINT IF NOT EXISTS uk_companies_gst_number 
UNIQUE (gst_number);

ALTER TABLE companies 
ADD CONSTRAINT IF NOT EXISTS uk_companies_pan_number 
UNIQUE (pan_number);

-- Products table unique constraints
ALTER TABLE products 
ADD CONSTRAINT IF NOT EXISTS uk_products_company_sku 
UNIQUE (company_id, sku);

-- Orders table unique constraints
ALTER TABLE orders 
ADD CONSTRAINT IF NOT EXISTS uk_orders_company_order_number 
UNIQUE (company_id, order_number);

-- Wallets table unique constraints
ALTER TABLE wallets 
ADD CONSTRAINT IF NOT EXISTS uk_wallets_company_currency 
UNIQUE (company_id, currency);

-- Add comments for documentation
COMMENT ON TABLE users IS 'User accounts with role-based access control';
COMMENT ON TABLE companies IS 'Company profiles with business information';
COMMENT ON TABLE contacts IS 'Customer, vendor, and lead contact information';
COMMENT ON TABLE products IS 'Product catalog with inventory management';
COMMENT ON TABLE orders IS 'Sales orders with status tracking';
COMMENT ON TABLE order_items IS 'Individual items within orders';
COMMENT ON TABLE wallets IS 'Company financial wallets by currency';
COMMENT ON TABLE investments IS 'Investment tracking and portfolio management';

-- Add column comments for important fields
COMMENT ON COLUMN users.role IS 'User role: admin (system admin), owner (company owner), employee (company staff)';
COMMENT ON COLUMN companies.gst_number IS 'GST registration number (Indian tax ID)';
COMMENT ON COLUMN companies.pan_number IS 'PAN number (Indian tax ID)';
COMMENT ON COLUMN contacts.type IS 'Contact type: lead (potential customer), customer (active buyer), vendor (supplier)';
COMMENT ON COLUMN products.reorder_level IS 'Stock level that triggers reorder alert';
COMMENT ON COLUMN orders.status IS 'Order status: draft, confirmed, shipped, delivered';
COMMENT ON COLUMN investments.status IS 'Investment status: active, matured, withdrawn';