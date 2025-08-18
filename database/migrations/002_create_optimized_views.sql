-- MCP-Optimized Database Views
-- These views provide pre-computed data for common queries and dashboard metrics

-- Company dashboard view with aggregated metrics
CREATE OR REPLACE VIEW company_dashboard AS
SELECT 
    c.id as company_id,
    c.name as company_name,
    c.industry,
    c.created_at as company_created_at,
    
    -- User metrics
    COALESCE(user_stats.total_users, 0) as total_users,
    COALESCE(user_stats.admin_users, 0) as admin_users,
    COALESCE(user_stats.employee_users, 0) as employee_users,
    
    -- Order metrics
    COALESCE(order_stats.total_orders, 0) as total_orders,
    COALESCE(order_stats.total_revenue, 0) as total_revenue,
    COALESCE(order_stats.avg_order_value, 0) as avg_order_value,
    COALESCE(order_stats.orders_this_month, 0) as orders_this_month,
    COALESCE(order_stats.revenue_this_month, 0) as revenue_this_month,
    
    -- Product metrics
    COALESCE(product_stats.active_products, 0) as active_products,
    COALESCE(product_stats.total_products, 0) as total_products,
    COALESCE(product_stats.low_stock_products, 0) as low_stock_products,
    COALESCE(product_stats.out_of_stock_products, 0) as out_of_stock_products,
    
    -- Contact metrics
    COALESCE(contact_stats.total_contacts, 0) as total_contacts,
    COALESCE(contact_stats.customers, 0) as customers,
    COALESCE(contact_stats.leads, 0) as leads,
    COALESCE(contact_stats.vendors, 0) as vendors,
    
    -- Financial metrics
    COALESCE(wallet_stats.total_balance, 0) as wallet_balance,
    COALESCE(wallet_stats.currencies, '{}') as wallet_currencies,
    COALESCE(investment_stats.total_investments, 0) as total_investments,
    COALESCE(investment_stats.active_investments, 0) as active_investments,
    COALESCE(investment_stats.expected_returns, 0) as expected_returns

FROM companies c

-- User statistics subquery
LEFT JOIN (
    SELECT 
        company_id,
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE role = 'admin') as admin_users,
        COUNT(*) FILTER (WHERE role = 'employee') as employee_users
    FROM users 
    GROUP BY company_id
) user_stats ON c.id = user_stats.company_id

-- Order statistics subquery
LEFT JOIN (
    SELECT 
        company_id,
        COUNT(*) as total_orders,
        SUM(total_amount) as total_revenue,
        AVG(total_amount) as avg_order_value,
        COUNT(*) FILTER (WHERE order_date >= date_trunc('month', CURRENT_DATE)) as orders_this_month,
        SUM(total_amount) FILTER (WHERE order_date >= date_trunc('month', CURRENT_DATE)) as revenue_this_month
    FROM orders 
    GROUP BY company_id
) order_stats ON c.id = order_stats.company_id

-- Product statistics subquery
LEFT JOIN (
    SELECT 
        company_id,
        COUNT(*) FILTER (WHERE status = 'active') as active_products,
        COUNT(*) as total_products,
        COUNT(*) FILTER (WHERE stock_quantity <= reorder_level AND stock_quantity > 0) as low_stock_products,
        COUNT(*) FILTER (WHERE stock_quantity = 0) as out_of_stock_products
    FROM products 
    GROUP BY company_id
) product_stats ON c.id = product_stats.company_id

-- Contact statistics subquery
LEFT JOIN (
    SELECT 
        company_id,
        COUNT(*) as total_contacts,
        COUNT(*) FILTER (WHERE type = 'customer') as customers,
        COUNT(*) FILTER (WHERE type = 'lead') as leads,
        COUNT(*) FILTER (WHERE type = 'vendor') as vendors
    FROM contacts 
    GROUP BY company_id
) contact_stats ON c.id = contact_stats.company_id

-- Wallet statistics subquery
LEFT JOIN (
    SELECT 
        company_id,
        SUM(balance) as total_balance,
        array_agg(DISTINCT currency) as currencies
    FROM wallets 
    GROUP BY company_id
) wallet_stats ON c.id = wallet_stats.company_id

-- Investment statistics subquery
LEFT JOIN (
    SELECT 
        company_id,
        SUM(amount) as total_investments,
        COUNT(*) FILTER (WHERE status = 'active') as active_investments,
        SUM(expected_return) as expected_returns
    FROM investments 
    GROUP BY company_id
) investment_stats ON c.id = investment_stats.company_id;

-- Low stock products view for inventory management
CREATE OR REPLACE VIEW low_stock_products AS
SELECT 
    p.id,
    p.company_id,
    p.name,
    p.sku,
    p.stock_quantity,
    p.reorder_level,
    (p.reorder_level - p.stock_quantity) as shortage,
    p.price,
    p.category,
    c.name as company_name,
    
    -- Calculate days of stock remaining based on average daily sales
    CASE 
        WHEN avg_daily_sales.daily_sales > 0 
        THEN ROUND(p.stock_quantity / avg_daily_sales.daily_sales, 1)
        ELSE NULL 
    END as days_of_stock_remaining

FROM products p
JOIN companies c ON p.company_id = c.id

-- Calculate average daily sales for each product
LEFT JOIN (
    SELECT 
        oi.product_id,
        AVG(oi.quantity) as daily_sales
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    WHERE o.order_date >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY oi.product_id
) avg_daily_sales ON p.id = avg_daily_sales.product_id

WHERE p.status = 'active' 
  AND p.stock_quantity <= p.reorder_level
ORDER BY shortage DESC, p.stock_quantity ASC;

-- Customer order history view with metrics
CREATE OR REPLACE VIEW customer_order_history AS
SELECT 
    c.id as contact_id,
    c.company_id,
    c.name as customer_name,
    c.email,
    c.phone,
    c.type,
    c.status,
    
    -- Order metrics
    COALESCE(order_metrics.total_orders, 0) as total_orders,
    COALESCE(order_metrics.total_spent, 0) as total_spent,
    COALESCE(order_metrics.avg_order_value, 0) as avg_order_value,
    order_metrics.first_order_date,
    order_metrics.last_order_date,
    
    -- Calculate customer lifetime value and recency
    CASE 
        WHEN order_metrics.last_order_date IS NOT NULL 
        THEN CURRENT_DATE - order_metrics.last_order_date::date
        ELSE NULL 
    END as days_since_last_order,
    
    -- Customer segmentation based on RFM analysis
    CASE 
        WHEN order_metrics.last_order_date IS NULL THEN 'New'
        WHEN CURRENT_DATE - order_metrics.last_order_date::date <= 30 THEN 'Active'
        WHEN CURRENT_DATE - order_metrics.last_order_date::date <= 90 THEN 'At Risk'
        ELSE 'Inactive'
    END as customer_segment

FROM contacts c

LEFT JOIN (
    SELECT 
        o.contact_id,
        COUNT(*) as total_orders,
        SUM(o.total_amount) as total_spent,
        AVG(o.total_amount) as avg_order_value,
        MIN(o.order_date) as first_order_date,
        MAX(o.order_date) as last_order_date
    FROM orders o
    GROUP BY o.contact_id
) order_metrics ON c.id = order_metrics.contact_id

WHERE c.type IN ('customer', 'lead')
ORDER BY order_metrics.total_spent DESC NULLS LAST;

-- Product performance view with sales analytics
CREATE OR REPLACE VIEW product_performance AS
SELECT 
    p.id as product_id,
    p.company_id,
    p.name as product_name,
    p.sku,
    p.price,
    p.stock_quantity,
    p.reorder_level,
    p.category,
    p.status,
    
    -- Sales metrics
    COALESCE(sales_metrics.total_sold, 0) as total_sold,
    COALESCE(sales_metrics.revenue_generated, 0) as revenue_generated,
    COALESCE(sales_metrics.total_orders, 0) as total_orders,
    COALESCE(sales_metrics.avg_quantity_per_order, 0) as avg_quantity_per_order,
    
    -- Time-based metrics
    sales_metrics.first_sale_date,
    sales_metrics.last_sale_date,
    COALESCE(recent_sales.sales_last_30_days, 0) as sales_last_30_days,
    COALESCE(recent_sales.revenue_last_30_days, 0) as revenue_last_30_days,
    
    -- Performance indicators
    CASE 
        WHEN p.stock_quantity = 0 THEN 'Out of Stock'
        WHEN p.stock_quantity <= p.reorder_level THEN 'Low Stock'
        ELSE 'In Stock'
    END as stock_status,
    
    CASE 
        WHEN recent_sales.sales_last_30_days > 0 THEN 'Active'
        WHEN sales_metrics.last_sale_date IS NULL THEN 'Never Sold'
        WHEN sales_metrics.last_sale_date < CURRENT_DATE - INTERVAL '90 days' THEN 'Slow Moving'
        ELSE 'Moderate'
    END as sales_performance

FROM products p

-- Overall sales metrics
LEFT JOIN (
    SELECT 
        oi.product_id,
        SUM(oi.quantity) as total_sold,
        SUM(oi.subtotal) as revenue_generated,
        COUNT(DISTINCT oi.order_id) as total_orders,
        AVG(oi.quantity) as avg_quantity_per_order,
        MIN(o.order_date) as first_sale_date,
        MAX(o.order_date) as last_sale_date
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    GROUP BY oi.product_id
) sales_metrics ON p.id = sales_metrics.product_id

-- Recent sales metrics (last 30 days)
LEFT JOIN (
    SELECT 
        oi.product_id,
        SUM(oi.quantity) as sales_last_30_days,
        SUM(oi.subtotal) as revenue_last_30_days
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    WHERE o.order_date >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY oi.product_id
) recent_sales ON p.id = recent_sales.product_id

ORDER BY sales_metrics.revenue_generated DESC NULLS LAST;

-- Financial summary view for wallet and investment tracking
CREATE OR REPLACE VIEW financial_summary AS
SELECT 
    c.id as company_id,
    c.name as company_name,
    
    -- Wallet information
    wallet_summary.total_wallet_balance,
    wallet_summary.wallet_currencies,
    
    -- Investment information
    investment_summary.total_invested,
    investment_summary.active_investments,
    investment_summary.matured_investments,
    investment_summary.total_expected_returns,
    investment_summary.total_actual_returns,
    
    -- Performance metrics
    CASE 
        WHEN investment_summary.total_invested > 0 
        THEN ROUND(
            ((investment_summary.total_actual_returns - investment_summary.total_invested) / investment_summary.total_invested) * 100, 
            2
        )
        ELSE 0 
    END as roi_percentage,
    
    -- Cash flow indicators
    (wallet_summary.total_wallet_balance + COALESCE(investment_summary.total_actual_returns, 0)) as total_assets

FROM companies c

-- Wallet summary
LEFT JOIN (
    SELECT 
        company_id,
        SUM(balance) as total_wallet_balance,
        array_agg(currency || ': ' || balance) as wallet_currencies
    FROM wallets
    GROUP BY company_id
) wallet_summary ON c.id = wallet_summary.company_id

-- Investment summary
LEFT JOIN (
    SELECT 
        company_id,
        SUM(amount) as total_invested,
        COUNT(*) FILTER (WHERE status = 'active') as active_investments,
        COUNT(*) FILTER (WHERE status = 'matured') as matured_investments,
        SUM(expected_return) as total_expected_returns,
        SUM(COALESCE(actual_return, 0)) as total_actual_returns
    FROM investments
    GROUP BY company_id
) investment_summary ON c.id = investment_summary.company_id

ORDER BY total_assets DESC NULLS LAST;

-- Add indexes on views for better performance
CREATE INDEX IF NOT EXISTS idx_company_dashboard_company_id ON company_dashboard(company_id);
CREATE INDEX IF NOT EXISTS idx_low_stock_products_company_id ON low_stock_products(company_id);
CREATE INDEX IF NOT EXISTS idx_customer_order_history_company_id ON customer_order_history(company_id);
CREATE INDEX IF NOT EXISTS idx_product_performance_company_id ON product_performance(company_id);
CREATE INDEX IF NOT EXISTS idx_financial_summary_company_id ON financial_summary(company_id);

-- Add comments for documentation
COMMENT ON VIEW company_dashboard IS 'Comprehensive company metrics dashboard with aggregated statistics';
COMMENT ON VIEW low_stock_products IS 'Products that need reordering based on current stock levels';
COMMENT ON VIEW customer_order_history IS 'Customer analytics with RFM segmentation and order history';
COMMENT ON VIEW product_performance IS 'Product sales analytics and performance metrics';
COMMENT ON VIEW financial_summary IS 'Financial overview including wallets and investments';