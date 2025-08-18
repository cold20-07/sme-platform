// MCP Schema Validation and Type Generation
// This module provides schema validation, type generation, and MCP-specific database schema utilities

import type { 
  Database, 
  Tables, 
  TablesInsert, 
  TablesUpdate,
  ValidationResult,
  DatabaseConstraints,
  UUID,
  UserRole,
  ContactType,
  ContactStatus,
  ProductStatus,
  OrderStatus,
  InvestmentStatus
} from './database-types';

// Schema validation rules
export const DATABASE_CONSTRAINTS: DatabaseConstraints = {
  users: {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    role: ['admin', 'owner', 'employee'],
  },
  companies: {
    name: { minLength: 2 },
    gst_number: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
    pan_number: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
  },
  contacts: {
    name: { minLength: 2 },
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    type: ['lead', 'customer', 'vendor'],
    status: ['active', 'inactive'],
  },
  products: {
    name: { minLength: 2 },
    sku: { minLength: 3 },
    price: { min: 0 },
    stock_quantity: { min: 0 },
    reorder_level: { min: 0 },
    status: ['active', 'inactive'],
  },
  orders: {
    order_number: { minLength: 5 },
    total_amount: { min: 0 },
    status: ['draft', 'confirmed', 'shipped', 'delivered'],
  },
  order_items: {
    quantity: { min: 1 },
    unit_price: { min: 0 },
    subtotal: { min: 0 },
  },
  wallets: {
    balance: { min: 0 },
    currency: /^[A-Z]{3}$/,
  },
  investments: {
    amount: { min: 0 },
    expected_return: { min: 0 },
    actual_return: { min: 0 },
    status: ['active', 'matured', 'withdrawn'],
  },
};

// MCP Schema Validator Class
export class MCPSchemaValidator {
  private constraints: DatabaseConstraints;

  constructor(constraints: DatabaseConstraints = DATABASE_CONSTRAINTS) {
    this.constraints = constraints;
  }

  // Validate a single record for a specific table
  validateRecord<T extends keyof Database['public']['Tables']>(
    table: T,
    record: Partial<TablesInsert<T>>,
    isUpdate: boolean = false
  ): ValidationResult {
    const errors: string[] = [];
    const tableConstraints = this.constraints[table];

    if (!tableConstraints) {
      return { isValid: true, errors: [] };
    }

    // Type-specific validation
    switch (table) {
      case 'users':
        this.validateUserRecord(record as any, errors, isUpdate);
        break;
      case 'companies':
        this.validateCompanyRecord(record as any, errors, isUpdate);
        break;
      case 'contacts':
        this.validateContactRecord(record as any, errors, isUpdate);
        break;
      case 'products':
        this.validateProductRecord(record as any, errors, isUpdate);
        break;
      case 'orders':
        this.validateOrderRecord(record as any, errors, isUpdate);
        break;
      case 'order_items':
        this.validateOrderItemRecord(record as any, errors, isUpdate);
        break;
      case 'wallets':
        this.validateWalletRecord(record as any, errors, isUpdate);
        break;
      case 'investments':
        this.validateInvestmentRecord(record as any, errors, isUpdate);
        break;
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Validate multiple records
  validateRecords<T extends keyof Database['public']['Tables']>(
    table: T,
    records: Partial<TablesInsert<T>>[],
    isUpdate: boolean = false
  ): ValidationResult {
    const allErrors: string[] = [];

    records.forEach((record, index) => {
      const result = this.validateRecord(table, record, isUpdate);
      if (!result.isValid) {
        result.errors.forEach(error => {
          allErrors.push(`Record ${index}: ${error}`);
        });
      }
    });

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
    };
  }

  // Validate foreign key relationships
  async validateForeignKeys<T extends keyof Database['public']['Tables']>(
    table: T,
    record: Partial<TablesInsert<T>>,
    client: any // SupabaseClient
  ): Promise<ValidationResult> {
    const errors: string[] = [];

    try {
      // Check company_id exists (most tables reference companies)
      if ('company_id' in record && record.company_id) {
        const { data: company } = await client
          .from('companies')
          .select('id')
          .eq('id', record.company_id)
          .single();
        
        if (!company) {
          errors.push('company_id references a non-existent company');
        }
      }

      // Table-specific foreign key validation
      switch (table) {
        case 'contacts':
        case 'users':
          // Already checked company_id above
          break;
        case 'orders':
          if ('contact_id' in record && record.contact_id) {
            const { data: contact } = await client
              .from('contacts')
              .select('id')
              .eq('id', record.contact_id)
              .single();
            
            if (!contact) {
              errors.push('contact_id references a non-existent contact');
            }
          }
          break;
        case 'order_items':
          if ('order_id' in record && record.order_id) {
            const { data: order } = await client
              .from('orders')
              .select('id')
              .eq('id', record.order_id)
              .single();
            
            if (!order) {
              errors.push('order_id references a non-existent order');
            }
          }
          if ('product_id' in record && record.product_id) {
            const { data: product } = await client
              .from('products')
              .select('id')
              .eq('id', record.product_id)
              .single();
            
            if (!product) {
              errors.push('product_id references a non-existent product');
            }
          }
          break;
      }
    } catch (error) {
      errors.push(`Foreign key validation failed: ${(error as Error).message}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Private validation methods for each table
  private validateUserRecord(record: any, errors: string[], isUpdate: boolean): void {
    if (!isUpdate || 'email' in record) {
      if (!record.email) {
        errors.push('email is required');
      } else if (!this.constraints.users.email.test(record.email)) {
        errors.push('email format is invalid');
      }
    }

    if (!isUpdate || 'company_id' in record) {
      if (!record.company_id) {
        errors.push('company_id is required');
      } else if (!this.isValidUUID(record.company_id)) {
        errors.push('company_id must be a valid UUID');
      }
    }

    if ('role' in record && record.role) {
      if (!this.constraints.users.role.includes(record.role)) {
        errors.push(`role must be one of: ${this.constraints.users.role.join(', ')}`);
      }
    }
  }

  private validateCompanyRecord(record: any, errors: string[], isUpdate: boolean): void {
    if (!isUpdate || 'name' in record) {
      if (!record.name) {
        errors.push('name is required');
      } else if (record.name.length < this.constraints.companies.name.minLength) {
        errors.push(`name must be at least ${this.constraints.companies.name.minLength} characters`);
      }
    }

    if ('gst_number' in record && record.gst_number) {
      if (!this.constraints.companies.gst_number.test(record.gst_number)) {
        errors.push('gst_number format is invalid');
      }
    }

    if ('pan_number' in record && record.pan_number) {
      if (!this.constraints.companies.pan_number.test(record.pan_number)) {
        errors.push('pan_number format is invalid');
      }
    }

    if ('email' in record && record.email) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.email)) {
        errors.push('email format is invalid');
      }
    }
  }

  private validateContactRecord(record: any, errors: string[], isUpdate: boolean): void {
    if (!isUpdate || 'name' in record) {
      if (!record.name) {
        errors.push('name is required');
      } else if (record.name.length < this.constraints.contacts.name.minLength) {
        errors.push(`name must be at least ${this.constraints.contacts.name.minLength} characters`);
      }
    }

    if (!isUpdate || 'company_id' in record) {
      if (!record.company_id) {
        errors.push('company_id is required');
      } else if (!this.isValidUUID(record.company_id)) {
        errors.push('company_id must be a valid UUID');
      }
    }

    if ('email' in record && record.email) {
      if (!this.constraints.contacts.email.test(record.email)) {
        errors.push('email format is invalid');
      }
    }

    if (!isUpdate || 'type' in record) {
      if (!record.type) {
        errors.push('type is required');
      } else if (!this.constraints.contacts.type.includes(record.type)) {
        errors.push(`type must be one of: ${this.constraints.contacts.type.join(', ')}`);
      }
    }

    if ('status' in record && record.status) {
      if (!this.constraints.contacts.status.includes(record.status)) {
        errors.push(`status must be one of: ${this.constraints.contacts.status.join(', ')}`);
      }
    }
  }

  private validateProductRecord(record: any, errors: string[], isUpdate: boolean): void {
    if (!isUpdate || 'name' in record) {
      if (!record.name) {
        errors.push('name is required');
      } else if (record.name.length < this.constraints.products.name.minLength) {
        errors.push(`name must be at least ${this.constraints.products.name.minLength} characters`);
      }
    }

    if (!isUpdate || 'sku' in record) {
      if (!record.sku) {
        errors.push('sku is required');
      } else if (record.sku.length < this.constraints.products.sku.minLength) {
        errors.push(`sku must be at least ${this.constraints.products.sku.minLength} characters`);
      }
    }

    if (!isUpdate || 'price' in record) {
      if (record.price === undefined || record.price === null) {
        errors.push('price is required');
      } else if (typeof record.price !== 'number' || record.price < this.constraints.products.price.min) {
        errors.push(`price must be a number >= ${this.constraints.products.price.min}`);
      }
    }

    if ('stock_quantity' in record && record.stock_quantity !== undefined) {
      if (typeof record.stock_quantity !== 'number' || record.stock_quantity < this.constraints.products.stock_quantity.min) {
        errors.push(`stock_quantity must be a number >= ${this.constraints.products.stock_quantity.min}`);
      }
    }

    if ('reorder_level' in record && record.reorder_level !== undefined) {
      if (typeof record.reorder_level !== 'number' || record.reorder_level < this.constraints.products.reorder_level.min) {
        errors.push(`reorder_level must be a number >= ${this.constraints.products.reorder_level.min}`);
      }
    }

    if ('status' in record && record.status) {
      if (!this.constraints.products.status.includes(record.status)) {
        errors.push(`status must be one of: ${this.constraints.products.status.join(', ')}`);
      }
    }
  }

  private validateOrderRecord(record: any, errors: string[], isUpdate: boolean): void {
    if (!isUpdate || 'order_number' in record) {
      if (!record.order_number) {
        errors.push('order_number is required');
      } else if (record.order_number.length < this.constraints.orders.order_number.minLength) {
        errors.push(`order_number must be at least ${this.constraints.orders.order_number.minLength} characters`);
      }
    }

    if (!isUpdate || 'total_amount' in record) {
      if (record.total_amount === undefined || record.total_amount === null) {
        errors.push('total_amount is required');
      } else if (typeof record.total_amount !== 'number' || record.total_amount < this.constraints.orders.total_amount.min) {
        errors.push(`total_amount must be a number >= ${this.constraints.orders.total_amount.min}`);
      }
    }

    if ('status' in record && record.status) {
      if (!this.constraints.orders.status.includes(record.status)) {
        errors.push(`status must be one of: ${this.constraints.orders.status.join(', ')}`);
      }
    }

    if (!isUpdate || 'order_date' in record) {
      if (!record.order_date) {
        errors.push('order_date is required');
      } else if (!this.isValidDate(record.order_date)) {
        errors.push('order_date must be a valid date');
      }
    }
  }

  private validateOrderItemRecord(record: any, errors: string[], isUpdate: boolean): void {
    if (!isUpdate || 'quantity' in record) {
      if (record.quantity === undefined || record.quantity === null) {
        errors.push('quantity is required');
      } else if (typeof record.quantity !== 'number' || record.quantity < this.constraints.order_items.quantity.min) {
        errors.push(`quantity must be a number >= ${this.constraints.order_items.quantity.min}`);
      }
    }

    if (!isUpdate || 'unit_price' in record) {
      if (record.unit_price === undefined || record.unit_price === null) {
        errors.push('unit_price is required');
      } else if (typeof record.unit_price !== 'number' || record.unit_price < this.constraints.order_items.unit_price.min) {
        errors.push(`unit_price must be a number >= ${this.constraints.order_items.unit_price.min}`);
      }
    }

    if (!isUpdate || 'subtotal' in record) {
      if (record.subtotal === undefined || record.subtotal === null) {
        errors.push('subtotal is required');
      } else if (typeof record.subtotal !== 'number' || record.subtotal < this.constraints.order_items.subtotal.min) {
        errors.push(`subtotal must be a number >= ${this.constraints.order_items.subtotal.min}`);
      }
    }

    // Validate subtotal calculation
    if (record.quantity && record.unit_price && record.subtotal) {
      const expectedSubtotal = record.quantity * record.unit_price;
      if (Math.abs(record.subtotal - expectedSubtotal) > 0.01) {
        errors.push('subtotal must equal quantity * unit_price');
      }
    }
  }

  private validateWalletRecord(record: any, errors: string[], isUpdate: boolean): void {
    if ('balance' in record && record.balance !== undefined) {
      if (typeof record.balance !== 'number' || record.balance < this.constraints.wallets.balance.min) {
        errors.push(`balance must be a number >= ${this.constraints.wallets.balance.min}`);
      }
    }

    if ('currency' in record && record.currency) {
      if (!this.constraints.wallets.currency.test(record.currency)) {
        errors.push('currency must be a valid 3-letter currency code');
      }
    }
  }

  private validateInvestmentRecord(record: any, errors: string[], isUpdate: boolean): void {
    if (!isUpdate || 'amount' in record) {
      if (record.amount === undefined || record.amount === null) {
        errors.push('amount is required');
      } else if (typeof record.amount !== 'number' || record.amount < this.constraints.investments.amount.min) {
        errors.push(`amount must be a number >= ${this.constraints.investments.amount.min}`);
      }
    }

    if (!isUpdate || 'expected_return' in record) {
      if (record.expected_return === undefined || record.expected_return === null) {
        errors.push('expected_return is required');
      } else if (typeof record.expected_return !== 'number' || record.expected_return < this.constraints.investments.expected_return.min) {
        errors.push(`expected_return must be a number >= ${this.constraints.investments.expected_return.min}`);
      }
    }

    if ('actual_return' in record && record.actual_return !== null && record.actual_return !== undefined) {
      if (typeof record.actual_return !== 'number' || record.actual_return < this.constraints.investments.actual_return.min) {
        errors.push(`actual_return must be a number >= ${this.constraints.investments.actual_return.min}`);
      }
    }

    if ('status' in record && record.status) {
      if (!this.constraints.investments.status.includes(record.status)) {
        errors.push(`status must be one of: ${this.constraints.investments.status.join(', ')}`);
      }
    }

    if (!isUpdate || 'investment_date' in record) {
      if (!record.investment_date) {
        errors.push('investment_date is required');
      } else if (!this.isValidDate(record.investment_date)) {
        errors.push('investment_date must be a valid date');
      }
    }

    if ('maturity_date' in record && record.maturity_date) {
      if (!this.isValidDate(record.maturity_date)) {
        errors.push('maturity_date must be a valid date');
      } else if (record.investment_date && new Date(record.maturity_date) <= new Date(record.investment_date)) {
        errors.push('maturity_date must be after investment_date');
      }
    }
  }

  // Utility methods
  private isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  private isValidDate(dateString: string): boolean {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  }
}

// MCP Type Generator Class
export class MCPTypeGenerator {
  // Generate TypeScript interfaces from database schema
  static generateTableInterface(tableName: keyof Database['public']['Tables']): string {
    // This would generate TypeScript interfaces dynamically
    // For now, we return a template
    return `
// Generated interface for ${tableName}
export interface ${this.capitalize(tableName)}Row extends Tables<'${tableName}'> {}
export interface ${this.capitalize(tableName)}Insert extends TablesInsert<'${tableName}'> {}
export interface ${this.capitalize(tableName)}Update extends TablesUpdate<'${tableName}'> {}
    `.trim();
  }

  // Generate validation schema from constraints
  static generateValidationSchema(tableName: keyof Database['public']['Tables']): string {
    const constraints = DATABASE_CONSTRAINTS[tableName];
    if (!constraints) {
      return `// No constraints defined for ${tableName}`;
    }

    const schemaLines: string[] = [];
    schemaLines.push(`export const ${tableName.toUpperCase()}_VALIDATION_SCHEMA = {`);

    Object.entries(constraints).forEach(([field, constraint]) => {
      if (typeof constraint === 'object' && 'minLength' in constraint) {
        schemaLines.push(`  ${field}: { minLength: ${constraint.minLength} },`);
      } else if (constraint instanceof RegExp) {
        schemaLines.push(`  ${field}: ${constraint.toString()},`);
      } else if (Array.isArray(constraint)) {
        schemaLines.push(`  ${field}: [${constraint.map(v => `'${v}'`).join(', ')}],`);
      } else if (typeof constraint === 'object' && 'min' in constraint) {
        schemaLines.push(`  ${field}: { min: ${constraint.min} },`);
      }
    });

    schemaLines.push('};');
    return schemaLines.join('\n');
  }

  // Generate MCP query builder types
  static generateQueryBuilderTypes(): string {
    return `
// Generated MCP Query Builder Types
export type MCPTableNames = keyof Database['public']['Tables'];
export type MCPViewNames = keyof Database['public']['Views'];
export type MCPFunctionNames = keyof Database['public']['Functions'];

export interface MCPQueryOptions<T extends MCPTableNames> {
  select?: (keyof Database['public']['Tables'][T]['Row'])[];
  filter?: Partial<Database['public']['Tables'][T]['Row']>;
  orderBy?: {
    column: keyof Database['public']['Tables'][T]['Row'];
    ascending: boolean;
  }[];
  limit?: number;
  offset?: number;
}

export interface MCPViewQueryOptions<T extends MCPViewNames> {
  filter?: Partial<Database['public']['Views'][T]['Row']>;
  orderBy?: {
    column: keyof Database['public']['Views'][T]['Row'];
    ascending: boolean;
  }[];
  limit?: number;
  offset?: number;
}
    `.trim();
  }

  private static capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

// Create and export validator instance
export const mcpValidator = new MCPSchemaValidator();

// Export utility functions
export function validateTableRecord<T extends keyof Database['public']['Tables']>(
  table: T,
  record: Partial<TablesInsert<T>>,
  isUpdate: boolean = false
): ValidationResult {
  return mcpValidator.validateRecord(table, record, isUpdate);
}

export function validateTableRecords<T extends keyof Database['public']['Tables']>(
  table: T,
  records: Partial<TablesInsert<T>>[],
  isUpdate: boolean = false
): ValidationResult {
  return mcpValidator.validateRecords(table, records, isUpdate);
}

// Schema introspection utilities
export function getTableConstraints<T extends keyof Database['public']['Tables']>(
  table: T
): DatabaseConstraints[T] | undefined {
  return DATABASE_CONSTRAINTS[table];
}

export function getTableFields<T extends keyof Database['public']['Tables']>(
  table: T
): (keyof Database['public']['Tables'][T]['Row'])[] {
  // This would ideally introspect the actual database schema
  // For now, return common fields based on our types
  const commonFields: Record<string, string[]> = {
    users: ['id', 'email', 'role', 'company_id', 'created_at', 'updated_at'],
    companies: ['id', 'name', 'gst_number', 'pan_number', 'industry', 'legal_structure', 'address', 'phone', 'email', 'created_at', 'updated_at'],
    contacts: ['id', 'company_id', 'name', 'email', 'phone', 'type', 'status', 'notes', 'created_at', 'updated_at'],
    products: ['id', 'company_id', 'name', 'sku', 'description', 'price', 'stock_quantity', 'reorder_level', 'category', 'status', 'created_at', 'updated_at'],
    orders: ['id', 'company_id', 'contact_id', 'order_number', 'status', 'total_amount', 'order_date', 'notes', 'created_at', 'updated_at'],
    order_items: ['id', 'order_id', 'product_id', 'quantity', 'unit_price', 'subtotal', 'created_at'],
    wallets: ['id', 'company_id', 'balance', 'currency', 'created_at', 'updated_at'],
    investments: ['id', 'company_id', 'amount', 'investment_type', 'expected_return', 'actual_return', 'status', 'investment_date', 'maturity_date', 'created_at', 'updated_at'],
  };

  return (commonFields[table] || []) as (keyof Database['public']['Tables'][T]['Row'])[];
}