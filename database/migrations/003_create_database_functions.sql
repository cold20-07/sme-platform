-- MCP-Optimized Database Functions
-- These functions provide efficient operations for common business logic

-- Function to get comprehensive company metrics
CREATE OR REPLACE FUNCTION get_company_metrics(
    p_company_id UUID,
    p_date_from DATE DEFAULT NULL,
    p_date_to DATE DEFAULT NULL
)
RETURNS TABLE(
    total_orders BIGINT,
    total_revenue NUMERIC,
    avg_order_value NUMERIC,
    customer_count BIGINT,
    product_count BIGINT,
    low_stock_count BIGINT,
    recent_orders BIGINT,
    growth_rate NUMERIC
) 
LANGUAGE plpgsql
AS $$
DECLARE
    v_date_from DATE := COALESCE(p_date_from, CURRENT_DATE - INTERVAL '30 days');
    v_date_to DATE := COALESCE(p_date_to, CURRENT_DATE);
    v_previous_period_start DATE := v_date_from - (v_date_to - v_date_from);
    v_previous_revenue NUMERIC;
    v_current_revenue NUMERIC;
BEGIN
    -- Get current period revenue for growth calculation
    SELECT COALESCE(SUM(o.total_amount), 0)
    INTO v_current_revenue
    FROM orders o
    WHERE o.company_id = p_company_id
      AND o.order_date BETWEEN v_date_from AND v_date_to;
    
    -- Get previous period revenue for growth calculation
    SELECT COALESCE(SUM(o.total_amount), 0)
    INTO v_previous_revenue
    FROM orders o
    WHERE o.company_id = p_company_id
      AND o.order_date BETWEEN v_previous_period_start AND v_date_from - INTERVAL '1 day';
    
    RETURN QUERY
    SELECT 
        -- Total orders in period
        COUNT(o.id)::BIGINT as total_orders,
        
        -- Total revenue in period
        COALESCE(SUM(o.total_amount), 0) as total_revenue,
        
        -- Average order value
        CASE 
            WHEN COUNT(o.id) > 0 THEN COALESCE(AVG(o.total_amount), 0)
            ELSE 0
        END as avg_order_value,
        
        -- Unique customer count
        COUNT(DISTINCT o.contact_id)::BIGINT as customer_count,
        
        -- Total active products
        (SELECT COUNT(*)::BIGINT FROM products p WHERE p.company_id = p_company_id AND p.status = 'active') as product_count,
        
        -- Low stock products count
        (SELECT COUNT(*)::BIGINT FROM products p WHERE p.company_id = p_company_id AND p.stock_quantity <= p.reorder_level) as low_stock_count,
        
        -- Recent orders (last 7 days)
        COUNT(o.id) FILTER (WHERE o.order_date >= CURRENT_DATE - INTERVAL '7 days')::BIGINT as recent_orders,
        
        -- Growth rate calculation
        CASE 
            WHEN v_previous_revenue > 0 THEN 
                ROUND(((v_current_revenue - v_previous_revenue) / v_previous_revenue) * 100, 2)
            ELSE 0
        END as growth_rate
        
    FROM orders o
    WHERE o.company_id = p_company_id
      AND o.order_date BETWEEN v_date_from AND v_date_to;
END;
$$;

-- Function to update product stock with validation
CREATE OR REPLACE FUNCTION update_product_stock(
    p_product_id UUID,
    p_quantity_change INTEGER
)
RETURNS TABLE(
    success BOOLEAN,
    new_stock INTEGER,
    message TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_current_stock INTEGER;
    v_new_stock INTEGER;
    v_product_name TEXT;
BEGIN
    -- Get current stock and product name
    SELECT stock_quantity, name
    INTO v_current_stock, v_product_name
    FROM products
    WHERE id = p_product_id;
    
    -- Check if product exists
    IF v_current_stock IS NULL THEN
        RETURN QUERY SELECT FALSE, 0, 'Product not found'::TEXT;
        RETURN;
    END IF;
    
    -- Calculate new stock level
    v_new_stock := v_current_stock + p_quantity_change;
    
    -- Validate stock level (cannot go below 0)
    IF v_new_stock < 0 THEN
        RETURN QUERY SELECT 
            FALSE, 
            v_current_stock, 
            format('Insufficient stock. Current: %s, Requested change: %s', v_current_stock, p_quantity_change)::TEXT;
        RETURN;
    END IF;
    
    -- Update the stock
    UPDATE products 
    SET 
        stock_quantity = v_new_stock,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_product_id;
    
    -- Return success result
    RETURN QUERY SELECT 
        TRUE, 
        v_new_stock, 
        format('Stock updated successfully for %s. New stock: %s', v_product_name, v_new_stock)::TEXT;
END;
$$;

-- Function to calculate customer lifetime value
CREATE OR REPLACE FUNCTION calculate_customer_ltv(
    p_contact_id UUID,
    p_months_back INTEGER DEFAULT 12
)
RETURNS TABLE(
    customer_id UUID,
    customer_name TEXT,
    total_orders BIGINT,
    total_spent NUMERIC,
    avg_order_value NUMERIC,
    order_frequency NUMERIC,
    predicted_ltv NUMERIC,
    customer_segment TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_date_threshold DATE := CURRENT_DATE - (p_months_back || ' months')::INTERVAL;
BEGIN
    RETURN QUERY
    WITH customer_metrics AS (
        SELECT 
            c.id,
            c.name,
            COUNT(o.id) as order_count,
            COALESCE(SUM(o.total_amount), 0) as total_revenue,
            COALESCE(AVG(o.total_amount), 0) as avg_order,
            CASE 
                WHEN COUNT(o.id) > 1 THEN
                    EXTRACT(DAYS FROM (MAX(o.order_date) - MIN(o.order_date))) / NULLIF(COUNT(o.id) - 1, 0)
                ELSE 0
            END as days_between_orders,
            MAX(o.order_date) as last_order_date
        FROM contacts c
        LEFT JOIN orders o ON c.id = o.contact_id AND o.order_date >= v_date_threshold
        WHERE c.id = p_contact_id
        GROUP BY c.id, c.name
    )
    SELECT 
        cm.id as customer_id,
        cm.name as customer_name,
        cm.order_count as total_orders,
        cm.total_revenue as total_spent,
        cm.avg_order as avg_order_value,
        CASE 
            WHEN cm.days_between_orders > 0 THEN ROUND(365.0 / cm.days_between_orders, 2)
            ELSE 0
        END as order_frequency,
        
        -- Predicted LTV calculation (simplified)
        CASE 
            WHEN cm.days_between_orders > 0 THEN
                ROUND(cm.avg_order * (365.0 / cm.days_between_orders) * 2, 2) -- 2 year projection
            ELSE cm.total_revenue
        END as predicted_ltv,
        
        -- Customer segmentation
        CASE 
            WHEN cm.last_order_date IS NULL THEN 'New'
            WHEN cm.last_order_date >= CURRENT_DATE - INTERVAL '30 days' AND cm.total_revenue > 1000 THEN 'VIP'
            WHEN cm.last_order_date >= CURRENT_DATE - INTERVAL '30 days' THEN 'Active'
            WHEN cm.last_order_date >= CURRENT_DATE - INTERVAL '90 days' THEN 'At Risk'
            ELSE 'Inactive'
        END as customer_segment
        
    FROM customer_metrics cm;
END;
$$;

-- Function to generate order number
CREATE OR REPLACE FUNCTION generate_order_number(
    p_company_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    v_company_prefix TEXT;
    v_year TEXT := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT;
    v_month TEXT := LPAD(EXTRACT(MONTH FROM CURRENT_DATE)::TEXT, 2, '0');
    v_sequence INTEGER;
    v_order_number TEXT;
BEGIN
    -- Get company prefix (first 3 characters of company name, uppercase)
    SELECT UPPER(LEFT(REGEXP_REPLACE(name, '[^A-Za-z0-9]', '', 'g'), 3))
    INTO v_company_prefix
    FROM companies
    WHERE id = p_company_id;
    
    -- If company not found or name too short, use default prefix
    IF v_company_prefix IS NULL OR LENGTH(v_company_prefix) < 2 THEN
        v_company_prefix := 'ORD';
    END IF;
    
    -- Get next sequence number for this company and month
    SELECT COALESCE(MAX(
        CASE 
            WHEN order_number ~ ('^' || v_company_prefix || v_year || v_month || '[0-9]+$')
            THEN SUBSTRING(order_number FROM LENGTH(v_company_prefix || v_year || v_month) + 1)::INTEGER
            ELSE 0
        END
    ), 0) + 1
    INTO v_sequence
    FROM orders
    WHERE company_id = p_company_id
      AND order_date >= DATE_TRUNC('month', CURRENT_DATE);
    
    -- Generate order number: PREFIX + YEAR + MONTH + SEQUENCE
    v_order_number := v_company_prefix || v_year || v_month || LPAD(v_sequence::TEXT, 4, '0');
    
    RETURN v_order_number;
END;
$$;

-- Function to validate and process order
CREATE OR REPLACE FUNCTION process_order(
    p_company_id UUID,
    p_contact_id UUID,
    p_order_items JSONB,
    p_notes TEXT DEFAULT NULL
)
RETURNS TABLE(
    success BOOLEAN,
    order_id UUID,
    order_number TEXT,
    total_amount NUMERIC,
    message TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_order_id UUID := gen_random_uuid();
    v_order_number TEXT;
    v_total_amount NUMERIC := 0;
    v_item JSONB;
    v_product_id UUID;
    v_quantity INTEGER;
    v_unit_price NUMERIC;
    v_subtotal NUMERIC;
    v_available_stock INTEGER;
    v_product_name TEXT;
BEGIN
    -- Validate company exists
    IF NOT EXISTS (SELECT 1 FROM companies WHERE id = p_company_id) THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT, 0::NUMERIC, 'Company not found'::TEXT;
        RETURN;
    END IF;
    
    -- Validate contact exists and belongs to company
    IF NOT EXISTS (SELECT 1 FROM contacts WHERE id = p_contact_id AND company_id = p_company_id) THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT, 0::NUMERIC, 'Contact not found or does not belong to company'::TEXT;
        RETURN;
    END IF;
    
    -- Generate order number
    v_order_number := generate_order_number(p_company_id);
    
    -- Validate order items and calculate total
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_order_items)
    LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_quantity := (v_item->>'quantity')::INTEGER;
        
        -- Validate product exists and belongs to company
        SELECT stock_quantity, price, name
        INTO v_available_stock, v_unit_price, v_product_name
        FROM products
        WHERE id = v_product_id AND company_id = p_company_id AND status = 'active';
        
        IF v_unit_price IS NULL THEN
            RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT, 0::NUMERIC, 
                format('Product %s not found or inactive', v_product_id)::TEXT;
            RETURN;
        END IF;
        
        -- Check stock availability
        IF v_available_stock < v_quantity THEN
            RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT, 0::NUMERIC, 
                format('Insufficient stock for %s. Available: %s, Requested: %s', 
                       v_product_name, v_available_stock, v_quantity)::TEXT;
            RETURN;
        END IF;
        
        -- Calculate subtotal
        v_subtotal := v_unit_price * v_quantity;
        v_total_amount := v_total_amount + v_subtotal;
    END LOOP;
    
    -- Create the order
    INSERT INTO orders (id, company_id, contact_id, order_number, status, total_amount, order_date, notes)
    VALUES (v_order_id, p_company_id, p_contact_id, v_order_number, 'draft', v_total_amount, CURRENT_DATE, p_notes);
    
    -- Create order items and update stock
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_order_items)
    LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_quantity := (v_item->>'quantity')::INTEGER;
        
        -- Get current price
        SELECT price INTO v_unit_price FROM products WHERE id = v_product_id;
        v_subtotal := v_unit_price * v_quantity;
        
        -- Insert order item
        INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal)
        VALUES (v_order_id, v_product_id, v_quantity, v_unit_price, v_subtotal);
        
        -- Update product stock
        UPDATE products 
        SET stock_quantity = stock_quantity - v_quantity,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = v_product_id;
    END LOOP;
    
    -- Return success
    RETURN QUERY SELECT TRUE, v_order_id, v_order_number, v_total_amount, 'Order created successfully'::TEXT;
END;
$$;

-- Function to get inventory alerts
CREATE OR REPLACE FUNCTION get_inventory_alerts(
    p_company_id UUID
)
RETURNS TABLE(
    product_id UUID,
    product_name TEXT,
    sku TEXT,
    current_stock INTEGER,
    reorder_level INTEGER,
    shortage INTEGER,
    alert_type TEXT,
    priority INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as product_id,
        p.name as product_name,
        p.sku,
        p.stock_quantity as current_stock,
        p.reorder_level,
        (p.reorder_level - p.stock_quantity) as shortage,
        CASE 
            WHEN p.stock_quantity = 0 THEN 'OUT_OF_STOCK'
            WHEN p.stock_quantity <= p.reorder_level * 0.5 THEN 'CRITICAL_LOW'
            WHEN p.stock_quantity <= p.reorder_level THEN 'LOW_STOCK'
            ELSE 'NORMAL'
        END as alert_type,
        CASE 
            WHEN p.stock_quantity = 0 THEN 1
            WHEN p.stock_quantity <= p.reorder_level * 0.5 THEN 2
            WHEN p.stock_quantity <= p.reorder_level THEN 3
            ELSE 4
        END as priority
    FROM products p
    WHERE p.company_id = p_company_id
      AND p.status = 'active'
      AND p.stock_quantity <= p.reorder_level
    ORDER BY priority ASC, shortage DESC;
END;
$$;

-- Add function comments for documentation
COMMENT ON FUNCTION get_company_metrics(UUID, DATE, DATE) IS 'Get comprehensive company performance metrics for a date range';
COMMENT ON FUNCTION update_product_stock(UUID, INTEGER) IS 'Update product stock quantity with validation';
COMMENT ON FUNCTION calculate_customer_ltv(UUID, INTEGER) IS 'Calculate customer lifetime value and segmentation';
COMMENT ON FUNCTION generate_order_number(UUID) IS 'Generate unique order number for a company';
COMMENT ON FUNCTION process_order(UUID, UUID, JSONB, TEXT) IS 'Validate and process a complete order with stock updates';
COMMENT ON FUNCTION get_inventory_alerts(UUID) IS 'Get inventory alerts for low stock and out of stock products';