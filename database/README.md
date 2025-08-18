# Database Schema Enhancements

This directory contains SQL migration files and documentation for the enhanced database schema with proper foreign key relationships, indexes, constraints, and MCP optimizations.

## Migration Files

### 001_enhance_schema_and_indexes.sql
- Adds comprehensive indexes for all tables to improve query performance
- Implements proper foreign key constraints with appropriate cascade/restrict rules
- Adds check constraints for data validation
- Includes unique constraints where appropriate
- Adds table and column comments for documentation

### 002_create_optimized_views.sql
- Creates MCP-optimized views for common dashboard queries
- Includes pre-computed metrics and aggregations
- Provides customer segmentation and analytics views
- Optimizes product performance tracking
- Creates financial summary views

### 003_create_database_functions.sql
- Implements stored procedures for common business operations
- Includes functions for order processing with validation
- Provides customer lifetime value calculations
- Implements inventory management functions
- Creates utility functions for metrics and reporting

## Key Features

### Enhanced Indexes
- **Performance Optimization**: Indexes on frequently queried columns
- **Full-text Search**: GIN indexes using pg_trgm for name searches
- **Composite Indexes**: Multi-column indexes for complex queries
- **Partial Indexes**: Conditional indexes for better performance

### Foreign Key Relationships
- **Referential Integrity**: Proper foreign key constraints
- **Cascade Rules**: Appropriate ON DELETE CASCADE/RESTRICT rules
- **Data Consistency**: Ensures data relationships are maintained

### Data Validation Constraints
- **Check Constraints**: Validates data at the database level
- **Format Validation**: Regex patterns for emails, GST, PAN numbers
- **Business Rules**: Enforces business logic constraints
- **Range Validation**: Ensures numeric values are within valid ranges

### MCP Optimization
- **Pre-computed Views**: Reduces query complexity for dashboards
- **Stored Functions**: Encapsulates business logic in the database
- **Efficient Queries**: Optimized for common MCP operations
- **Real-time Ready**: Supports real-time subscriptions

## Database Schema Overview

### Core Tables
- **users**: User accounts with role-based access
- **companies**: Company profiles and business information
- **contacts**: Customer, vendor, and lead management
- **products**: Product catalog with inventory tracking
- **orders**: Sales order management
- **order_items**: Individual order line items
- **wallets**: Multi-currency wallet management
- **investments**: Investment portfolio tracking

### Optimized Views
- **company_dashboard**: Comprehensive company metrics
- **low_stock_products**: Inventory alerts and reorder management
- **customer_order_history**: Customer analytics with RFM segmentation
- **product_performance**: Sales analytics and performance metrics
- **financial_summary**: Financial overview and ROI tracking

### Database Functions
- **get_company_metrics()**: Comprehensive company performance metrics
- **update_product_stock()**: Safe stock quantity updates with validation
- **calculate_customer_ltv()**: Customer lifetime value and segmentation
- **generate_order_number()**: Automatic order number generation
- **process_order()**: Complete order processing with validation
- **get_inventory_alerts()**: Inventory management alerts

## Usage Examples

### Applying Migrations
```sql
-- Apply schema enhancements
\i database/migrations/001_enhance_schema_and_indexes.sql

-- Create optimized views
\i database/migrations/002_create_optimized_views.sql

-- Create database functions
\i database/migrations/003_create_database_functions.sql
```

### Using Views
```sql
-- Get company dashboard metrics
SELECT * FROM company_dashboard WHERE company_id = 'your-company-id';

-- Get low stock alerts
SELECT * FROM low_stock_products WHERE company_id = 'your-company-id';

-- Analyze customer performance
SELECT * FROM customer_order_history 
WHERE company_id = 'your-company-id' 
ORDER BY total_spent DESC;
```

### Using Functions
```sql
-- Get company metrics for the last 30 days
SELECT * FROM get_company_metrics('your-company-id', CURRENT_DATE - 30, CURRENT_DATE);

-- Update product stock
SELECT * FROM update_product_stock('product-id', -5); -- Reduce stock by 5

-- Calculate customer LTV
SELECT * FROM calculate_customer_ltv('customer-id', 12); -- Last 12 months

-- Process a new order
SELECT * FROM process_order(
  'company-id',
  'customer-id',
  '[{"product_id": "prod-1", "quantity": 2}, {"product_id": "prod-2", "quantity": 1}]'::jsonb,
  'Order notes'
);
```

## TypeScript Integration

The database schema is fully typed in TypeScript with:
- **Enhanced Types**: Comprehensive type definitions in `lib/database-types.ts`
- **Validation**: Client-side validation in `lib/database-validation.ts`
- **MCP Integration**: Optimized for Supabase MCP operations
- **Type Safety**: Full type safety for all database operations

### Example Usage
```typescript
import { supabase, mcpDb } from '@/lib/supabase';
import { validateProductInsert } from '@/lib/database-validation';
import type { ProductInsert, CompanyDashboard } from '@/lib/database-types';

// Validate data before insertion
const productData: ProductInsert = {
  company_id: 'company-id',
  name: 'New Product',
  sku: 'PROD-001',
  price: 99.99,
  stock_quantity: 100,
  reorder_level: 10,
};

const validation = validateProductInsert(productData);
if (!validation.isValid) {
  console.error('Validation errors:', validation.errors);
  return;
}

// Insert with type safety
const { data, error } = await supabase
  .from('products')
  .insert(productData)
  .select()
  .single();

// Use optimized views
const { data: dashboard } = await supabase
  .from('company_dashboard')
  .select('*')
  .eq('company_id', 'company-id')
  .single();

// Use database functions
const { data: metrics } = await supabase
  .rpc('get_company_metrics', {
    p_company_id: 'company-id',
    p_date_from: '2024-01-01',
    p_date_to: '2024-01-31'
  });
```

## Performance Considerations

### Index Strategy
- **Query Patterns**: Indexes designed for common query patterns
- **Composite Indexes**: Multi-column indexes for complex WHERE clauses
- **Partial Indexes**: Conditional indexes to reduce size and improve performance
- **Full-text Search**: GIN indexes for text search capabilities

### View Optimization
- **Pre-computed Aggregations**: Reduces real-time calculation overhead
- **Materialized Views**: Consider materializing for very large datasets
- **Index on Views**: Indexes on view columns for better performance

### Function Performance
- **Efficient Algorithms**: Optimized algorithms for business logic
- **Minimal Data Transfer**: Functions return only necessary data
- **Transaction Safety**: Proper transaction handling for data consistency

## Security Considerations

### Row Level Security (RLS)
- **Company Isolation**: Ensure users can only access their company's data
- **Role-based Access**: Different access levels based on user roles
- **Data Protection**: Sensitive data protection at the database level

### Input Validation
- **SQL Injection Prevention**: Parameterized queries and validation
- **Data Sanitization**: Proper data cleaning and validation
- **Constraint Enforcement**: Database-level constraint validation

## Monitoring and Maintenance

### Performance Monitoring
- **Query Performance**: Monitor slow queries and optimize indexes
- **View Usage**: Track view usage and optimize accordingly
- **Function Performance**: Monitor function execution times

### Data Integrity
- **Constraint Violations**: Monitor and handle constraint violations
- **Foreign Key Issues**: Track and resolve referential integrity issues
- **Data Quality**: Regular data quality checks and cleanup

### Backup and Recovery
- **Regular Backups**: Automated backup strategy
- **Point-in-time Recovery**: Ability to restore to specific points in time
- **Migration Testing**: Test migrations in staging environment first

## Future Enhancements

### Planned Features
- **Audit Logging**: Track all data changes for compliance
- **Data Archiving**: Archive old data for performance
- **Advanced Analytics**: More sophisticated analytics views
- **Real-time Notifications**: Enhanced real-time features

### Scalability Considerations
- **Partitioning**: Table partitioning for large datasets
- **Read Replicas**: Read replicas for improved performance
- **Caching Strategy**: Application-level caching for frequently accessed data
- **Connection Pooling**: Optimize database connections