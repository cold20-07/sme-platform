// MCP Integration Examples
// This file demonstrates how to use the MCP integration layer effectively

import { 
  mcpClient, 
  mcpQuery, 
  mcpInsert, 
  mcpBatchInsert, 
  mcpUpdate, 
  mcpUpsert,
  mcpQueryView,
  mcpCallFunction,
  mcpGetDashboard,
  MCPClient 
} from '../mcp-utilities';
import type { 
  CompanyInsert, 
  ProductInsert, 
  OrderInsert, 
  ContactInsert,
  UserInsert 
} from '../database-types';

// Example 1: Basic Query Operations
export async function basicQueryExamples() {
  console.log('=== Basic Query Examples ===');

  // Simple query with filtering
  const companies = await mcpQuery('companies', {
    filter: { industry: 'Technology' },
    orderBy: [{ column: 'name', ascending: true }],
    limit: 10,
  });

  console.log('Technology companies:', companies.data);
  console.log('Query optimizations applied:', companies.optimizations);

  // Query with specific fields
  const products = await mcpQuery('products', {
    select: ['id', 'name', 'price', 'stock_quantity'],
    filter: { status: 'active' },
    orderBy: [{ column: 'price', ascending: false }],
    limit: 20,
  });

  console.log('Active products:', products.data);

  // Query with pagination
  const contacts = await mcpQuery('contacts', {
    filter: { type: 'customer', status: 'active' },
    orderBy: [{ column: 'created_at', ascending: false }],
    limit: 25,
    offset: 0,
  });

  console.log('Active customers (page 1):', contacts.data);
}

// Example 2: Insert Operations with Validation
export async function insertExamples() {
  console.log('=== Insert Examples ===');

  // Single insert with validation
  const newCompany: CompanyInsert = {
    name: 'Acme Corporation',
    industry: 'Manufacturing',
    gst_number: '29ABCDE1234F1Z5',
    pan_number: 'ABCDE1234F',
    email: 'contact@acme.com',
    phone: '+91-9876543210',
    address: '123 Business Street, Mumbai, Maharashtra 400001',
  };

  const companyResult = await mcpInsert('companies', newCompany);
  
  if (companyResult.error) {
    console.error('Company insert failed:', companyResult.error.message);
    if (companyResult.validationResult) {
      console.error('Validation errors:', companyResult.validationResult.errors);
    }
  } else {
    console.log('Company created:', companyResult.data);
  }

  // Batch insert with validation
  const newProducts: ProductInsert[] = [
    {
      name: 'Premium Widget',
      sku: 'WIDGET-001',
      description: 'High-quality widget for industrial use',
      price: 299.99,
      stock_quantity: 100,
      reorder_level: 20,
      category: 'Industrial',
      company_id: companyResult.data?.id || 'company-id',
    },
    {
      name: 'Standard Widget',
      sku: 'WIDGET-002',
      description: 'Standard widget for general use',
      price: 199.99,
      stock_quantity: 200,
      reorder_level: 30,
      category: 'General',
      company_id: companyResult.data?.id || 'company-id',
    },
  ];

  const productsResult = await mcpBatchInsert('products', newProducts);
  
  if (productsResult.error) {
    console.error('Batch insert failed:', productsResult.error.message);
  } else {
    console.log(`${productsResult.data?.length} products created`);
    console.log('Batch metrics:', productsResult.metrics);
  }
}

// Example 3: Update and Upsert Operations
export async function updateExamples() {
  console.log('=== Update Examples ===');

  // Update multiple records
  const updateResult = await mcpUpdate(
    'products',
    { category: 'Industrial' },
    { reorder_level: 25 }
  );

  if (updateResult.error) {
    console.error('Update failed:', updateResult.error.message);
  } else {
    console.log(`Updated ${updateResult.data?.length} industrial products`);
  }

  // Upsert operation
  const productUpsert: ProductInsert = {
    name: 'Updated Premium Widget',
    sku: 'WIDGET-001', // Existing SKU
    price: 319.99, // Updated price
    stock_quantity: 150,
    reorder_level: 25,
    company_id: 'company-id',
  };

  const upsertResult = await mcpUpsert('products', productUpsert, 'sku');
  
  if (upsertResult.error) {
    console.error('Upsert failed:', upsertResult.error.message);
  } else {
    console.log('Product upserted:', upsertResult.data);
    console.log('Upsert metrics:', upsertResult.metrics);
  }
}

// Example 4: View Queries for Analytics
export async function viewQueryExamples() {
  console.log('=== View Query Examples ===');

  // Company dashboard overview
  const dashboard = await mcpQueryView('company_dashboard', {
    filter: { company_id: 'company-id' },
  });

  if (dashboard.data?.[0]) {
    const data = dashboard.data[0];
    console.log('Company Dashboard:');
    console.log(`- Total Orders: ${data.total_orders}`);
    console.log(`- Total Revenue: $${data.total_revenue}`);
    console.log(`- Active Products: ${data.active_products}`);
    console.log(`- Low Stock Products: ${data.low_stock_products}`);
  }

  // Low stock products
  const lowStock = await mcpQueryView('low_stock_products', {
    filter: { company_id: 'company-id' },
    orderBy: [{ column: 'shortage', ascending: false }],
    limit: 10,
  });

  console.log('Low stock products:', lowStock.data);

  // Customer order history
  const customerHistory = await mcpQueryView('customer_order_history', {
    filter: { company_id: 'company-id' },
    orderBy: [{ column: 'total_spent', ascending: false }],
    limit: 10,
  });

  console.log('Top customers:', customerHistory.data);

  // Product performance
  const productPerformance = await mcpQueryView('product_performance', {
    filter: { company_id: 'company-id' },
    orderBy: [{ column: 'revenue_generated', ascending: false }],
    limit: 10,
  });

  console.log('Top performing products:', productPerformance.data);
}

// Example 5: Database Function Calls
export async function functionCallExamples() {
  console.log('=== Function Call Examples ===');

  // Get company metrics
  const metrics = await mcpCallFunction('get_company_metrics', {
    p_company_id: 'company-id',
    p_date_from: '2024-01-01',
    p_date_to: '2024-12-31',
  });

  if (metrics.data?.[0]) {
    const data = metrics.data[0];
    console.log('Company Metrics:');
    console.log(`- Total Orders: ${data.total_orders}`);
    console.log(`- Total Revenue: $${data.total_revenue}`);
    console.log(`- Average Order Value: $${data.avg_order_value}`);
    console.log(`- Growth Rate: ${(data.growth_rate * 100).toFixed(2)}%`);
  }

  // Update product stock
  const stockUpdate = await mcpCallFunction('update_product_stock', {
    p_product_id: 'product-id',
    p_quantity_change: -10, // Reduce stock by 10
  });

  if (stockUpdate.data?.[0]) {
    const result = stockUpdate.data[0];
    console.log('Stock update result:', result);
  }

  // Calculate customer LTV
  const customerLTV = await mcpCallFunction('calculate_customer_ltv', {
    p_contact_id: 'customer-id',
    p_months_back: 12,
  });

  if (customerLTV.data?.[0]) {
    const ltv = customerLTV.data[0];
    console.log('Customer LTV Analysis:');
    console.log(`- Total Orders: ${ltv.total_orders}`);
    console.log(`- Total Spent: $${ltv.total_spent}`);
    console.log(`- Predicted LTV: $${ltv.predicted_ltv}`);
    console.log(`- Customer Segment: ${ltv.customer_segment}`);
  }

  // Process a new order
  const orderItems = [
    { product_id: 'product-1', quantity: 2 },
    { product_id: 'product-2', quantity: 1 },
  ];

  const orderResult = await mcpCallFunction('process_order', {
    p_company_id: 'company-id',
    p_contact_id: 'customer-id',
    p_order_items: orderItems,
    p_notes: 'Rush order - customer needs by Friday',
  });

  if (orderResult.data?.[0]) {
    const result = orderResult.data[0];
    console.log('Order processing result:', result);
  }

  // Get inventory alerts
  const alerts = await mcpCallFunction('get_inventory_alerts', {
    p_company_id: 'company-id',
  });

  console.log('Inventory alerts:', alerts.data);
}

// Example 6: Dashboard Data Aggregation
export async function dashboardExample() {
  console.log('=== Dashboard Data Example ===');

  const dashboardData = await mcpGetDashboard('company-id');

  if (dashboardData.error) {
    console.error('Dashboard data fetch failed:', dashboardData.error.message);
    return;
  }

  console.log('Dashboard Data:');
  
  if (dashboardData.dashboard) {
    console.log('Company Overview:');
    console.log(`- Company: ${dashboardData.dashboard.company_name}`);
    console.log(`- Total Orders: ${dashboardData.dashboard.total_orders}`);
    console.log(`- Total Revenue: $${dashboardData.dashboard.total_revenue}`);
    console.log(`- Active Products: ${dashboardData.dashboard.active_products}`);
    console.log(`- Total Customers: ${dashboardData.dashboard.customers}`);
  }

  console.log(`\nLow Stock Products (${dashboardData.lowStockProducts.length}):`);
  dashboardData.lowStockProducts.forEach(product => {
    console.log(`- ${product.name} (${product.sku}): ${product.stock_quantity} left (reorder at ${product.reorder_level})`);
  });

  console.log(`\nTop Customers (${dashboardData.topCustomers.length}):`);
  dashboardData.topCustomers.forEach(customer => {
    console.log(`- ${customer.customer_name}: $${customer.total_spent} (${customer.total_orders} orders)`);
  });

  console.log(`\nRecent Orders (${dashboardData.recentOrders.length}):`);
  dashboardData.recentOrders.forEach(order => {
    console.log(`- ${order.order_number}: $${order.total_amount} (${order.status})`);
  });
}

// Example 7: Performance Monitoring
export async function performanceMonitoringExample() {
  console.log('=== Performance Monitoring Example ===');

  // Get performance insights
  const insights = mcpClient.getPerformanceInsights();

  console.log('Performance Insights:');
  console.log(`- Query Patterns: ${insights.patterns.length}`);
  console.log(`- Recommendations: ${insights.recommendations.length}`);
  console.log(`- Cache Size: ${insights.cacheStats.size}`);

  console.log('\nInsights:');
  insights.insights.forEach(insight => {
    console.log(`- ${insight}`);
  });

  console.log('\nRecommendations:');
  insights.recommendations.forEach(rec => {
    console.log(`- ${rec.priority.toUpperCase()}: ${rec.reason}`);
    console.log(`  Table: ${rec.table}, Columns: [${rec.columns.join(', ')}]`);
    console.log(`  Estimated Improvement: ${rec.estimatedImprovement}%`);
  });

  // Clear cache if needed
  console.log('\nClearing cache...');
  mcpClient.clearCache();
  console.log('Cache cleared');
}

// Example 8: Custom MCP Client Configuration
export async function customConfigurationExample() {
  console.log('=== Custom Configuration Example ===');

  // Create a custom MCP client with specific configuration
  const customClient = new MCPClient(undefined, {
    enableCaching: true,
    cacheTimeout: 600, // 10 minutes
    enableOptimization: true,
    enableValidation: true,
    enablePerformanceTracking: true,
    batchSize: 200,
    maxConcurrency: 5,
  });

  // Use the custom client
  const result = await customClient.query('products', {
    filter: { status: 'active' },
    limit: 50,
  });

  console.log(`Fetched ${result.data?.length} products with custom configuration`);
  console.log('Optimizations applied:', result.optimizations);

  // Update configuration at runtime
  customClient.updateConfig({
    batchSize: 150,
    enableCaching: false,
  });

  console.log('Configuration updated');

  // Batch insert with new configuration
  const testProducts: ProductInsert[] = Array.from({ length: 300 }, (_, i) => ({
    name: `Test Product ${i + 1}`,
    sku: `TEST-${String(i + 1).padStart(3, '0')}`,
    price: Math.random() * 1000,
    stock_quantity: Math.floor(Math.random() * 100),
    reorder_level: Math.floor(Math.random() * 20),
    company_id: 'company-id',
  }));

  const batchResult = await customClient.batchInsert('products', testProducts);
  
  if (batchResult.error) {
    console.error('Batch insert failed:', batchResult.error.message);
  } else {
    console.log(`Batch inserted ${batchResult.data?.length} products`);
    console.log('Batch metrics:', batchResult.metrics);
  }
}

// Example 9: Error Handling and Recovery
export async function errorHandlingExample() {
  console.log('=== Error Handling Example ===');

  // Example of handling validation errors
  const invalidProduct: ProductInsert = {
    name: '', // Invalid: too short
    sku: 'AB', // Invalid: too short
    price: -100, // Invalid: negative
    stock_quantity: -10, // Invalid: negative
    company_id: 'invalid-uuid', // Invalid: not a UUID
  };

  const result = await mcpInsert('products', invalidProduct);
  
  if (result.error) {
    console.log('Expected validation error occurred:');
    console.log('Error code:', result.error.code);
    console.log('Error message:', result.error.message);
    
    if (result.validationResult) {
      console.log('Validation errors:');
      result.validationResult.errors.forEach(error => {
        console.log(`- ${error}`);
      });
    }
  }

  // Example of handling database errors (simulated)
  try {
    const nonExistentResult = await mcpQuery('products', {
      filter: { company_id: 'non-existent-company' },
    });
    
    if (nonExistentResult.data?.length === 0) {
      console.log('No products found for non-existent company (expected)');
    }
  } catch (error) {
    console.error('Database error:', error);
  }

  // Example of retry logic (built into MCP operations)
  console.log('MCP operations include automatic retry logic for transient errors');
}

// Main example runner
export async function runAllExamples() {
  try {
    await basicQueryExamples();
    await insertExamples();
    await updateExamples();
    await viewQueryExamples();
    await functionCallExamples();
    await dashboardExample();
    await performanceMonitoringExample();
    await customConfigurationExample();
    await errorHandlingExample();
    
    console.log('\n=== All MCP Integration Examples Completed ===');
  } catch (error) {
    console.error('Example execution failed:', error);
  }
}

// Export individual examples for selective testing
export {
  basicQueryExamples,
  insertExamples,
  updateExamples,
  viewQueryExamples,
  functionCallExamples,
  dashboardExample,
  performanceMonitoringExample,
  customConfigurationExample,
  errorHandlingExample,
};