import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          role: 'admin' | 'owner' | 'employee';
          company_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          role?: 'admin' | 'owner' | 'employee';
          company_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          role?: 'admin' | 'owner' | 'employee';
          company_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      companies: {
        Row: {
          id: string;
          name: string;
          gst_number: string | null;
          pan_number: string | null;
          industry: string | null;
          legal_structure: string | null;
          address: string | null;
          phone: string | null;
          email: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          gst_number?: string | null;
          pan_number?: string | null;
          industry?: string | null;
          legal_structure?: string | null;
          address?: string | null;
          phone?: string | null;
          email?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          gst_number?: string | null;
          pan_number?: string | null;
          industry?: string | null;
          legal_structure?: string | null;
          address?: string | null;
          phone?: string | null;
          email?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      contacts: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          email: string | null;
          phone: string | null;
          type: 'lead' | 'customer' | 'vendor';
          status: 'active' | 'inactive';
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          name: string;
          email?: string | null;
          phone?: string | null;
          type: 'lead' | 'customer' | 'vendor';
          status?: 'active' | 'inactive';
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          name?: string;
          email?: string | null;
          phone?: string | null;
          type?: 'lead' | 'customer' | 'vendor';
          status?: 'active' | 'inactive';
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      products: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          sku: string;
          description: string | null;
          price: number;
          stock_quantity: number;
          reorder_level: number;
          category: string | null;
          status: 'active' | 'inactive';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          name: string;
          sku: string;
          description?: string | null;
          price: number;
          stock_quantity?: number;
          reorder_level?: number;
          category?: string | null;
          status?: 'active' | 'inactive';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          name?: string;
          sku?: string;
          description?: string | null;
          price?: number;
          stock_quantity?: number;
          reorder_level?: number;
          category?: string | null;
          status?: 'active' | 'inactive';
          created_at?: string;
          updated_at?: string;
        };
      };
      orders: {
        Row: {
          id: string;
          company_id: string;
          contact_id: string;
          order_number: string;
          status: 'draft' | 'confirmed' | 'shipped' | 'delivered';
          total_amount: number;
          order_date: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          contact_id: string;
          order_number: string;
          status?: 'draft' | 'confirmed' | 'shipped' | 'delivered';
          total_amount: number;
          order_date: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          contact_id?: string;
          order_number?: string;
          status?: 'draft' | 'confirmed' | 'shipped' | 'delivered';
          total_amount?: number;
          order_date?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string;
          quantity: number;
          unit_price: number;
          subtotal: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id: string;
          quantity: number;
          unit_price: number;
          subtotal: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          product_id?: string;
          quantity?: number;
          unit_price?: number;
          subtotal?: number;
          created_at?: string;
        };
      };
      wallets: {
        Row: {
          id: string;
          company_id: string;
          balance: number;
          currency: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          balance?: number;
          currency?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          balance?: number;
          currency?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      investments: {
        Row: {
          id: string;
          company_id: string;
          amount: number;
          investment_type: string;
          expected_return: number;
          actual_return: number | null;
          status: 'active' | 'matured' | 'withdrawn';
          investment_date: string;
          maturity_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          amount: number;
          investment_type: string;
          expected_return: number;
          actual_return?: number | null;
          status?: 'active' | 'matured' | 'withdrawn';
          investment_date: string;
          maturity_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          amount?: number;
          investment_type?: string;
          expected_return?: number;
          actual_return?: number | null;
          status?: 'active' | 'matured' | 'withdrawn';
          investment_date?: string;
          maturity_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
};