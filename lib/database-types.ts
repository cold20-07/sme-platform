// Enhanced Database Types with Relationships and Computed Fields
// This file contains comprehensive TypeScript types that match the actual database schema

// Base types for common fields
export type UUID = string;
export type Timestamp = string;

// Enum types for better type safety
export type UserRole = 'admin' | 'owner' | 'employee';
export type ContactType = 'lead' | 'customer' | 'vendor';
export type ContactStatus = 'active' | 'inactive';
export type ProductStatus = 'active' | 'inactive';
export type OrderStatus = 'draft' | 'confirmed' | 'shipped' | 'delivered';
export type InvestmentStatus = 'active' | 'matured' | 'withdrawn';
export type CustomerSegment = 'New' | 'Active' | 'VIP' | 'At Risk' | 'Inactive';
export type AlertType = 'OUT_OF_STOCK' | 'CRITICAL_LOW' | 'LOW_STOCK' | 'NORMAL';

// Enhanced Database interface with all tables, views, and functions
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: UUID;
          email: string;
          role: UserRole;
          company_id: UUID;
          created_at: Timestamp;
          updated_at: Timestamp;
          // Computed fields for MCP integration
          full_name?: string;
          last_login?: Timestamp;
        };
        Insert: {
          id?: UUID;
          email: string;
          role?: UserRole;
          company_id: UUID;
          created_at?: Timestamp;
          updated_at?: Timestamp;
        };
        Update: {
          id?: UUID;
          email?: string;
          role?: UserRole;
          company_id?: UUID;
          created_at?: Timestamp;
          updated_at?: Timestamp;
        };
        Relationships: [
          {
            foreignKeyName: "fk_users_company_id";
            columns: ["company_id"];
            referencedRelation: "companies";
            referencedColumns: ["id"];
          }
        ];
      };
      companies: {
        Row: {
          id: UUID;
          name: string;
          gst_number: string | null;
          pan_number: string | null;
          industry: string | null;
          legal_structure: string | null;
          address: string | null;
          phone: string | null;
          email: string | null;
          created_at: Timestamp;
          updated_at: Timestamp;
          // Computed fields for MCP integration
          user_count?: number;
          total_orders?: number;
          total_revenue?: number;
        };
        Insert: {
          id?: UUID;
          name: string;
          gst_number?: string | null;
          pan_number?: string | null;
          industry?: string | null;
          legal_structure?: string | null;
          address?: string | null;
          phone?: string | null;
          email?: string | null;
          created_at?: Timestamp;
          updated_at?: Timestamp;
        };
        Update: {
          id?: UUID;
          name?: string;
          gst_number?: string | null;
          pan_number?: string | null;
          industry?: string | null;
          legal_structure?: string | null;
          address?: string | null;
          phone?: string | null;
          email?: string | null;
          created_at?: Timestamp;
          updated_at?: Timestamp;
        };
        Relationships: [];
      };
      contacts: {
        Row: {
          id: UUID;
          company_id: UUID;
          name: string;
          email: string | null;
          phone: string | null;
          type: ContactType;
          status: ContactStatus;
          notes: string | null;
          created_at: Timestamp;
          updated_at: Timestamp;
          // Computed fields for MCP integration
          order_count?: number;
          total_spent?: number;
          last_order_date?: Timestamp;
        };
        Insert: {
          id?: UUID;
          company_id: UUID;
          name: string;
          email?: string | null;
          phone?: string | null;
          type: ContactType;
          status?: ContactStatus;
          notes?: string | null;
          created_at?: Timestamp;
          updated_at?: Timestamp;
        };
        Update: {
          id?: UUID;
          company_id?: UUID;
          name?: string;
          email?: string | null;
          phone?: string | null;
          type?: ContactType;
          status?: ContactStatus;
          notes?: string | null;
          created_at?: Timestamp;
          updated_at?: Timestamp;
        };
        Relationships: [
          {
            foreignKeyName: "fk_contacts_company_id";
            columns: ["company_id"];
            referencedRelation: "companies";
            referencedColumns: ["id"];
          }
        ];
      };
      products: {
        Row: {
          id: UUID;
          company_id: UUID;
          name: string;
          sku: string;
          description: string | null;
          price: number;
          stock_quantity: number;
          reorder_level: number;
          category: string | null;
          status: ProductStatus;
          created_at: Timestamp;
          updated_at: Timestamp;
          // Computed fields for MCP integration
          total_sold?: number;
          revenue_generated?: number;
          is_low_stock?: boolean;
        };
        Insert: {
          id?: UUID;
          company_id: UUID;
          name: string;
          sku: string;
          description?: string | null;
          price: number;
          stock_quantity?: number;
          reorder_level?: number;
          category?: string | null;
          status?: ProductStatus;
          created_at?: Timestamp;
          updated_at?: Timestamp;
        };
        Update: {
          id?: UUID;
          company_id?: UUID;
          name?: string;
          sku?: string;
          description?: string | null;
          price?: number;
          stock_quantity?: number;
          reorder_level?: number;
          category?: string | null;
          status?: ProductStatus;
          created_at?: Timestamp;
          updated_at?: Timestamp;
        };
        Relationships: [
          {
            foreignKeyName: "fk_products_company_id";
            columns: ["company_id"];
            referencedRelation: "companies";
            referencedColumns: ["id"];
          }
        ];
      };
      orders: {
        Row: {
          id: UUID;
          company_id: UUID;
          contact_id: UUID;
          order_number: string;
          status: OrderStatus;
          total_amount: number;
          order_date: string; // Date string
          notes: string | null;
          created_at: Timestamp;
          updated_at: Timestamp;
          // Computed fields for MCP integration
          item_count?: number;
          customer_name?: string;
          days_since_order?: number;
        };
        Insert: {
          id?: UUID;
          company_id: UUID;
          contact_id: UUID;
          order_number: string;
          status?: OrderStatus;
          total_amount: number;
          order_date: string;
          notes?: string | null;
          created_at?: Timestamp;
          updated_at?: Timestamp;
        };
        Update: {
          id?: UUID;
          company_id?: UUID;
          contact_id?: UUID;
          order_number?: string;
          status?: OrderStatus;
          total_amount?: number;
          order_date?: string;
          notes?: string | null;
          created_at?: Timestamp;
          updated_at?: Timestamp;
        };
        Relationships: [
          {
            foreignKeyName: "fk_orders_company_id";
            columns: ["company_id"];
            referencedRelation: "companies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_orders_contact_id";
            columns: ["contact_id"];
            referencedRelation: "contacts";
            referencedColumns: ["id"];
          }
        ];
      };
      order_items: {
        Row: {
          id: UUID;
          order_id: UUID;
          product_id: UUID;
          quantity: number;
          unit_price: number;
          subtotal: number;
          created_at: Timestamp;
          // Computed fields for MCP integration
          product_name?: string;
          product_sku?: string;
        };
        Insert: {
          id?: UUID;
          order_id: UUID;
          product_id: UUID;
          quantity: number;
          unit_price: number;
          subtotal: number;
          created_at?: Timestamp;
        };
        Update: {
          id?: UUID;
          order_id?: UUID;
          product_id?: UUID;
          quantity?: number;
          unit_price?: number;
          subtotal?: number;
          created_at?: Timestamp;
        };
        Relationships: [
          {
            foreignKeyName: "fk_order_items_order_id";
            columns: ["order_id"];
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_order_items_product_id";
            columns: ["product_id"];
            referencedRelation: "products";
            referencedColumns: ["id"];
          }
        ];
      };
      wallets: {
        Row: {
          id: UUID;
          company_id: UUID;
          balance: number;
          currency: string;
          created_at: Timestamp;
          updated_at: Timestamp;
          // Computed fields for MCP integration
          formatted_balance?: string;
          total_investments?: number;
        };
        Insert: {
          id?: UUID;
          company_id: UUID;
          balance?: number;
          currency?: string;
          created_at?: Timestamp;
          updated_at?: Timestamp;
        };
        Update: {
          id?: UUID;
          company_id?: UUID;
          balance?: number;
          currency?: string;
          created_at?: Timestamp;
          updated_at?: Timestamp;
        };
        Relationships: [
          {
            foreignKeyName: "fk_wallets_company_id";
            columns: ["company_id"];
            referencedRelation: "companies";
            referencedColumns: ["id"];
          }
        ];
      };
      investments: {
        Row: {
          id: UUID;
          company_id: UUID;
          amount: number;
          investment_type: string;
          expected_return: number;
          actual_return: number | null;
          status: InvestmentStatus;
          investment_date: string; // Date string
          maturity_date: string | null; // Date string
          created_at: Timestamp;
          updated_at: Timestamp;
          // Computed fields for MCP integration
          days_to_maturity?: number;
          current_value?: number;
          roi_percentage?: number;
        };
        Insert: {
          id?: UUID;
          company_id: UUID;
          amount: number;
          investment_type: string;
          expected_return: number;
          actual_return?: number | null;
          status?: InvestmentStatus;
          investment_date: string;
          maturity_date?: string | null;
          created_at?: Timestamp;
          updated_at?: Timestamp;
        };
        Update: {
          id?: UUID;
          company_id?: UUID;
          amount?: number;
          investment_type?: string;
          expected_return?: number;
          actual_return?: number | null;
          status?: InvestmentStatus;
          investment_date?: string;
          maturity_date?: string | null;
          created_at?: Timestamp;
          updated_at?: Timestamp;
        };
        Relationships: [
          {
            foreignKeyName: "fk_investments_company_id";
            columns: ["company_id"];
            referencedRelation: "companies";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      // MCP-optimized views for complex queries
      company_dashboard: {
        Row: {
          company_id: UUID;
          company_name: string;
          industry: string | null;
          company_created_at: Timestamp;
          total_users: number;
          admin_users: number;
          employee_users: number;
          total_orders: number;
          total_revenue: number;
          avg_order_value: number;
          orders_this_month: number;
          revenue_this_month: number;
          active_products: number;
          total_products: number;
          low_stock_products: number;
          out_of_stock_products: number;
          total_contacts: number;
          customers: number;
          leads: number;
          vendors: number;
          wallet_balance: number;
          wallet_currencies: string[];
          total_investments: number;
          active_investments: number;
          expected_returns: number;
        };
      };
      low_stock_products: {
        Row: {
          id: UUID;
          company_id: UUID;
          name: string;
          sku: string;
          stock_quantity: number;
          reorder_level: number;
          shortage: number;
          price: number;
          category: string | null;
          company_name: string;
          days_of_stock_remaining: number | null;
        };
      };
      customer_order_history: {
        Row: {
          contact_id: UUID;
          company_id: UUID;
          customer_name: string;
          email: string | null;
          phone: string | null;
          type: ContactType;
          status: ContactStatus;
          total_orders: number;
          total_spent: number;
          avg_order_value: number;
          first_order_date: string | null;
          last_order_date: string | null;
          days_since_last_order: number | null;
          customer_segment: CustomerSegment;
        };
      };
      product_performance: {
        Row: {
          product_id: UUID;
          company_id: UUID;
          product_name: string;
          sku: string;
          price: number;
          stock_quantity: number;
          reorder_level: number;
          category: string | null;
          status: ProductStatus;
          total_sold: number;
          revenue_generated: number;
          total_orders: number;
          avg_quantity_per_order: number;
          first_sale_date: string | null;
          last_sale_date: string | null;
          sales_last_30_days: number;
          revenue_last_30_days: number;
          stock_status: 'Out of Stock' | 'Low Stock' | 'In Stock';
          sales_performance: 'Active' | 'Never Sold' | 'Slow Moving' | 'Moderate';
        };
      };
      financial_summary: {
        Row: {
          company_id: UUID;
          company_name: string;
          total_wallet_balance: number;
          wallet_currencies: string[];
          total_invested: number;
          active_investments: number;
          matured_investments: number;
          total_expected_returns: number;
          total_actual_returns: number;
          roi_percentage: number;
          total_assets: number;
        };
      };
    };
    Functions: {
      // MCP-optimized database functions
      get_company_metrics: {
        Args: {
          p_company_id: UUID;
          p_date_from?: string;
          p_date_to?: string;
        };
        Returns: {
          total_orders: number;
          total_revenue: number;
          avg_order_value: number;
          customer_count: number;
          product_count: number;
          low_stock_count: number;
          recent_orders: number;
          growth_rate: number;
        }[];
      };
      update_product_stock: {
        Args: {
          p_product_id: UUID;
          p_quantity_change: number;
        };
        Returns: {
          success: boolean;
          new_stock: number;
          message: string;
        }[];
      };
      calculate_customer_ltv: {
        Args: {
          p_contact_id: UUID;
          p_months_back?: number;
        };
        Returns: {
          customer_id: UUID;
          customer_name: string;
          total_orders: number;
          total_spent: number;
          avg_order_value: number;
          order_frequency: number;
          predicted_ltv: number;
          customer_segment: CustomerSegment;
        }[];
      };
      generate_order_number: {
        Args: {
          p_company_id: UUID;
        };
        Returns: string;
      };
      process_order: {
        Args: {
          p_company_id: UUID;
          p_contact_id: UUID;
          p_order_items: any; // JSONB
          p_notes?: string;
        };
        Returns: {
          success: boolean;
          order_id: UUID | null;
          order_number: string | null;
          total_amount: number;
          message: string;
        }[];
      };
      get_inventory_alerts: {
        Args: {
          p_company_id: UUID;
        };
        Returns: {
          product_id: UUID;
          product_name: string;
          sku: string;
          current_stock: number;
          reorder_level: number;
          shortage: number;
          alert_type: AlertType;
          priority: number;
        }[];
      };
    };
  };
}

// Enhanced type definitions for better development experience
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];
export type Views<T extends keyof Database['public']['Views']> = Database['public']['Views'][T]['Row'];
export type Functions<T extends keyof Database['public']['Functions']> = Database['public']['Functions'][T];

// Specific table type aliases for convenience
export type User = Tables<'users'>;
export type UserInsert = TablesInsert<'users'>;
export type UserUpdate = TablesUpdate<'users'>;

export type Company = Tables<'companies'>;
export type CompanyInsert = TablesInsert<'companies'>;
export type CompanyUpdate = TablesUpdate<'companies'>;

export type Contact = Tables<'contacts'>;
export type ContactInsert = TablesInsert<'contacts'>;
export type ContactUpdate = TablesUpdate<'contacts'>;

export type Product = Tables<'products'>;
export type ProductInsert = TablesInsert<'products'>;
export type ProductUpdate = TablesUpdate<'products'>;

export type Order = Tables<'orders'>;
export type OrderInsert = TablesInsert<'orders'>;
export type OrderUpdate = TablesUpdate<'orders'>;

export type OrderItem = Tables<'order_items'>;
export type OrderItemInsert = TablesInsert<'order_items'>;
export type OrderItemUpdate = TablesUpdate<'order_items'>;

export type Wallet = Tables<'wallets'>;
export type WalletInsert = TablesInsert<'wallets'>;
export type WalletUpdate = TablesUpdate<'wallets'>;

export type Investment = Tables<'investments'>;
export type InvestmentInsert = TablesInsert<'investments'>;
export type InvestmentUpdate = TablesUpdate<'investments'>;

// View type aliases
export type CompanyDashboard = Views<'company_dashboard'>;
export type LowStockProduct = Views<'low_stock_products'>;
export type CustomerOrderHistory = Views<'customer_order_history'>;
export type ProductPerformance = Views<'product_performance'>;
export type FinancialSummary = Views<'financial_summary'>;

// Function result type aliases
export type CompanyMetrics = Functions<'get_company_metrics'>['Returns'][0];
export type StockUpdateResult = Functions<'update_product_stock'>['Returns'][0];
export type CustomerLTV = Functions<'calculate_customer_ltv'>['Returns'][0];
export type OrderProcessResult = Functions<'process_order'>['Returns'][0];
export type InventoryAlert = Functions<'get_inventory_alerts'>['Returns'][0];

// Enhanced interfaces for MCP operations
export interface MCPQuery<T extends keyof Database['public']['Tables']> {
  table: T;
  select?: string[];
  filter?: Partial<Database['public']['Tables'][T]['Row']>;
  orderBy?: { column: keyof Database['public']['Tables'][T]['Row']; ascending: boolean }[];
  limit?: number;
  offset?: number;
  joins?: string[];
}

export interface MCPOperationResult<T = any> {
  data: T | null;
  error: SupabaseError | null;
  count?: number;
  status: number;
  statusText: string;
}

export interface SupabaseError extends Error {
  code?: string;
  details?: string;
  hint?: string;
  message: string;
}

export interface RealtimeSubscription {
  table: keyof Database['public']['Tables'];
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  filter?: string;
  callback: (payload: any) => void;
}

// Validation schemas for database constraints
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface DatabaseConstraints {
  users: {
    email: RegExp;
    role: UserRole[];
  };
  companies: {
    name: { minLength: number };
    gst_number: RegExp;
    pan_number: RegExp;
  };
  contacts: {
    name: { minLength: number };
    email: RegExp;
    type: ContactType[];
    status: ContactStatus[];
  };
  products: {
    name: { minLength: number };
    sku: { minLength: number };
    price: { min: number };
    stock_quantity: { min: number };
    reorder_level: { min: number };
    status: ProductStatus[];
  };
  orders: {
    order_number: { minLength: number };
    total_amount: { min: number };
    status: OrderStatus[];
  };
  order_items: {
    quantity: { min: number };
    unit_price: { min: number };
    subtotal: { min: number };
  };
  wallets: {
    balance: { min: number };
    currency: RegExp;
  };
  investments: {
    amount: { min: number };
    expected_return: { min: number };
    actual_return: { min: number };
    status: InvestmentStatus[];
  };
}

// Order processing types
export interface OrderItemInput {
  product_id: UUID;
  quantity: number;
}

export interface OrderInput {
  company_id: UUID;
  contact_id: UUID;
  items: OrderItemInput[];
  notes?: string;
}

// Dashboard metrics types
export interface DashboardMetrics {
  company: CompanyDashboard;
  recentOrders: Order[];
  lowStockProducts: LowStockProduct[];
  topCustomers: CustomerOrderHistory[];
  inventoryAlerts: InventoryAlert[];
}

// Export the enhanced Database type as default
export default Database;