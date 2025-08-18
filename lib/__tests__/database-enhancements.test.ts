// Database Enhancements Test Suite
// Tests for enhanced database schema, types, and validation

import { describe, it, expect, beforeEach } from 'vitest';
import {
  validateUserInsert,
  validateUserUpdate,
  validateCompanyInsert,
  validateCompanyUpdate,
  validateContactInsert,
  validateContactUpdate,
  validateProductInsert,
  validateProductUpdate,
  validateOrderInsert,
  validateOrderUpdate,
  validateOrderItemInsert,
  validateOrderItemUpdate,
  validateWalletInsert,
  validateWalletUpdate,
  validateInvestmentInsert,
  validateInvestmentUpdate,
  validateRecord,
  DATABASE_CONSTRAINTS,
} from '../database-validation';
import type {
  UserInsert,
  CompanyInsert,
  ContactInsert,
  ProductInsert,
  OrderInsert,
  OrderItemInsert,
  WalletInsert,
  InvestmentInsert,
} from '../database-types';

describe('Database Validation', () => {
  describe('User Validation', () => {
    it('should validate correct user insert data', () => {
      const validUser: UserInsert = {
        email: 'test@example.com',
        role: 'employee',
        company_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = validateUserInsert(validUser);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid email format', () => {
      const invalidUser: UserInsert = {
        email: 'invalid-email',
        role: 'employee',
        company_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = validateUserInsert(invalidUser);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid email format');
    });

    it('should reject invalid user role', () => {
      const invalidUser: UserInsert = {
        email: 'test@example.com',
        role: 'invalid-role' as any,
        company_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = validateUserInsert(invalidUser);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid user role');
    });

    it('should reject missing company_id', () => {
      const invalidUser: UserInsert = {
        email: 'test@example.com',
        role: 'employee',
        company_id: '',
      };

      const result = validateUserInsert(invalidUser);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Company ID is required');
    });
  });

  describe('Company Validation', () => {
    it('should validate correct company insert data', () => {
      const validCompany: CompanyInsert = {
        name: 'Test Company',
        gst_number: '29ABCDE1234F1Z5',
        pan_number: 'ABCDE1234F',
        industry: 'Technology',
        email: 'company@example.com',
      };

      const result = validateCompanyInsert(validCompany);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject short company name', () => {
      const invalidCompany: CompanyInsert = {
        name: 'A',
      };

      const result = validateCompanyInsert(invalidCompany);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Company name must be at least 2 characters long');
    });

    it('should reject invalid GST number format', () => {
      const invalidCompany: CompanyInsert = {
        name: 'Test Company',
        gst_number: 'INVALID-GST',
      };

      const result = validateCompanyInsert(invalidCompany);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid GST number format');
    });

    it('should reject invalid PAN number format', () => {
      const invalidCompany: CompanyInsert = {
        name: 'Test Company',
        pan_number: 'INVALID-PAN',
      };

      const result = validateCompanyInsert(invalidCompany);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid PAN number format');
    });

    it('should accept null GST and PAN numbers', () => {
      const validCompany: CompanyInsert = {
        name: 'Test Company',
        gst_number: null,
        pan_number: null,
      };

      const result = validateCompanyInsert(validCompany);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Contact Validation', () => {
    it('should validate correct contact insert data', () => {
      const validContact: ContactInsert = {
        company_id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        type: 'customer',
        status: 'active',
      };

      const result = validateContactInsert(validContact);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid contact type', () => {
      const invalidContact: ContactInsert = {
        company_id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'John Doe',
        type: 'invalid-type' as any,
      };

      const result = validateContactInsert(invalidContact);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid contact type');
    });

    it('should reject short contact name', () => {
      const invalidContact: ContactInsert = {
        company_id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'A',
        type: 'customer',
      };

      const result = validateContactInsert(invalidContact);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Contact name must be at least 2 characters long');
    });
  });

  describe('Product Validation', () => {
    it('should validate correct product insert data', () => {
      const validProduct: ProductInsert = {
        company_id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Product',
        sku: 'TEST-001',
        price: 99.99,
        stock_quantity: 100,
        reorder_level: 10,
        category: 'Electronics',
        status: 'active',
      };

      const result = validateProductInsert(validProduct);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject negative price', () => {
      const invalidProduct: ProductInsert = {
        company_id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Product',
        sku: 'TEST-001',
        price: -10,
      };

      const result = validateProductInsert(invalidProduct);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Product price must be non-negative');
    });

    it('should reject negative stock quantity', () => {
      const invalidProduct: ProductInsert = {
        company_id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Product',
        sku: 'TEST-001',
        price: 99.99,
        stock_quantity: -5,
      };

      const result = validateProductInsert(invalidProduct);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Stock quantity must be non-negative');
    });

    it('should reject short SKU', () => {
      const invalidProduct: ProductInsert = {
        company_id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Product',
        sku: 'A',
        price: 99.99,
      };

      const result = validateProductInsert(invalidProduct);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Product SKU must be at least 2 characters long');
    });
  });

  describe('Order Validation', () => {
    it('should validate correct order insert data', () => {
      const validOrder: OrderInsert = {
        company_id: '123e4567-e89b-12d3-a456-426614174000',
        contact_id: '123e4567-e89b-12d3-a456-426614174001',
        order_number: 'ORD-001',
        total_amount: 199.99,
        order_date: '2024-01-15',
        status: 'draft',
      };

      const result = validateOrderInsert(validOrder);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject negative total amount', () => {
      const invalidOrder: OrderInsert = {
        company_id: '123e4567-e89b-12d3-a456-426614174000',
        contact_id: '123e4567-e89b-12d3-a456-426614174001',
        order_number: 'ORD-001',
        total_amount: -100,
        order_date: '2024-01-15',
      };

      const result = validateOrderInsert(invalidOrder);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Order total amount must be non-negative');
    });

    it('should reject short order number', () => {
      const invalidOrder: OrderInsert = {
        company_id: '123e4567-e89b-12d3-a456-426614174000',
        contact_id: '123e4567-e89b-12d3-a456-426614174001',
        order_number: 'AB',
        total_amount: 199.99,
        order_date: '2024-01-15',
      };

      const result = validateOrderInsert(invalidOrder);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Order number must be at least 3 characters long');
    });
  });

  describe('Order Item Validation', () => {
    it('should validate correct order item insert data', () => {
      const validOrderItem: OrderItemInsert = {
        order_id: '123e4567-e89b-12d3-a456-426614174000',
        product_id: '123e4567-e89b-12d3-a456-426614174001',
        quantity: 2,
        unit_price: 99.99,
        subtotal: 199.98,
      };

      const result = validateOrderItemInsert(validOrderItem);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject zero quantity', () => {
      const invalidOrderItem: OrderItemInsert = {
        order_id: '123e4567-e89b-12d3-a456-426614174000',
        product_id: '123e4567-e89b-12d3-a456-426614174001',
        quantity: 0,
        unit_price: 99.99,
        subtotal: 0,
      };

      const result = validateOrderItemInsert(invalidOrderItem);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Order item quantity must be positive');
    });

    it('should reject incorrect subtotal calculation', () => {
      const invalidOrderItem: OrderItemInsert = {
        order_id: '123e4567-e89b-12d3-a456-426614174000',
        product_id: '123e4567-e89b-12d3-a456-426614174001',
        quantity: 2,
        unit_price: 99.99,
        subtotal: 150.00, // Should be 199.98
      };

      const result = validateOrderItemInsert(invalidOrderItem);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Order item subtotal does not match quantity × unit price');
    });
  });

  describe('Wallet Validation', () => {
    it('should validate correct wallet insert data', () => {
      const validWallet: WalletInsert = {
        company_id: '123e4567-e89b-12d3-a456-426614174000',
        balance: 1000.00,
        currency: 'USD',
      };

      const result = validateWalletInsert(validWallet);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject negative balance', () => {
      const invalidWallet: WalletInsert = {
        company_id: '123e4567-e89b-12d3-a456-426614174000',
        balance: -100,
        currency: 'USD',
      };

      const result = validateWalletInsert(invalidWallet);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Wallet balance must be non-negative');
    });

    it('should reject invalid currency format', () => {
      const invalidWallet: WalletInsert = {
        company_id: '123e4567-e89b-12d3-a456-426614174000',
        balance: 1000.00,
        currency: 'invalid',
      };

      const result = validateWalletInsert(invalidWallet);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Currency must be a 3-letter uppercase code (e.g., USD, EUR, INR)');
    });
  });

  describe('Investment Validation', () => {
    it('should validate correct investment insert data', () => {
      const validInvestment: InvestmentInsert = {
        company_id: '123e4567-e89b-12d3-a456-426614174000',
        amount: 10000,
        investment_type: 'Fixed Deposit',
        expected_return: 500,
        investment_date: '2024-01-01',
        maturity_date: '2024-12-31',
        status: 'active',
      };

      const result = validateInvestmentInsert(validInvestment);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject zero investment amount', () => {
      const invalidInvestment: InvestmentInsert = {
        company_id: '123e4567-e89b-12d3-a456-426614174000',
        amount: 0,
        investment_type: 'Fixed Deposit',
        expected_return: 500,
        investment_date: '2024-01-01',
      };

      const result = validateInvestmentInsert(invalidInvestment);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Investment amount must be positive');
    });

    it('should reject negative expected return', () => {
      const invalidInvestment: InvestmentInsert = {
        company_id: '123e4567-e89b-12d3-a456-426614174000',
        amount: 10000,
        investment_type: 'Fixed Deposit',
        expected_return: -100,
        investment_date: '2024-01-01',
      };

      const result = validateInvestmentInsert(invalidInvestment);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Expected return must be non-negative');
    });
  });

  describe('Generic Record Validation', () => {
    it('should validate user record using generic function', () => {
      const validUser: UserInsert = {
        email: 'test@example.com',
        role: 'employee',
        company_id: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = validateRecord('users', 'insert', validUser);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate company record using generic function', () => {
      const validCompany: CompanyInsert = {
        name: 'Test Company',
      };

      const result = validateRecord('companies', 'insert', validCompany);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject unknown table', () => {
      const result = validateRecord('unknown_table' as any, 'insert', {});
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Unknown table');
    });
  });

  describe('Database Constraints', () => {
    it('should have correct email regex pattern', () => {
      const emailRegex = DATABASE_CONSTRAINTS.users.email;
      
      expect(emailRegex.test('valid@example.com')).toBe(true);
      expect(emailRegex.test('user.name+tag@example.co.uk')).toBe(true);
      expect(emailRegex.test('invalid-email')).toBe(false);
      expect(emailRegex.test('@example.com')).toBe(false);
      expect(emailRegex.test('user@')).toBe(false);
    });

    it('should have correct GST number regex pattern', () => {
      const gstRegex = DATABASE_CONSTRAINTS.companies.gst_number;
      
      expect(gstRegex.test('29ABCDE1234F1Z5')).toBe(true);
      expect(gstRegex.test('INVALID-GST')).toBe(false);
      expect(gstRegex.test('29ABCDE1234F1Z')).toBe(false); // Too short
    });

    it('should have correct PAN number regex pattern', () => {
      const panRegex = DATABASE_CONSTRAINTS.companies.pan_number;
      
      expect(panRegex.test('ABCDE1234F')).toBe(true);
      expect(panRegex.test('INVALID-PAN')).toBe(false);
      expect(panRegex.test('ABCDE1234')).toBe(false); // Too short
    });

    it('should have correct currency regex pattern', () => {
      const currencyRegex = DATABASE_CONSTRAINTS.wallets.currency;
      
      expect(currencyRegex.test('USD')).toBe(true);
      expect(currencyRegex.test('EUR')).toBe(true);
      expect(currencyRegex.test('INR')).toBe(true);
      expect(currencyRegex.test('usd')).toBe(false); // Lowercase
      expect(currencyRegex.test('US')).toBe(false); // Too short
      expect(currencyRegex.test('USDD')).toBe(false); // Too long
    });
  });
});

describe('Database Types', () => {
  it('should have proper enum types', () => {
    // This test ensures TypeScript compilation works correctly with our types
    const userRole: import('../database-types').UserRole = 'admin';
    const contactType: import('../database-types').ContactType = 'customer';
    const productStatus: import('../database-types').ProductStatus = 'active';
    const orderStatus: import('../database-types').OrderStatus = 'confirmed';
    const investmentStatus: import('../database-types').InvestmentStatus = 'active';
    
    expect(userRole).toBe('admin');
    expect(contactType).toBe('customer');
    expect(productStatus).toBe('active');
    expect(orderStatus).toBe('confirmed');
    expect(investmentStatus).toBe('active');
  });

  it('should have proper table type aliases', () => {
    // Test that our type aliases work correctly
    const user: import('../database-types').User = {
      id: '123',
      email: 'test@example.com',
      role: 'employee',
      company_id: '456',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    const company: import('../database-types').Company = {
      id: '456',
      name: 'Test Company',
      gst_number: null,
      pan_number: null,
      industry: null,
      legal_structure: null,
      address: null,
      phone: null,
      email: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    expect(user.role).toBe('employee');
    expect(company.name).toBe('Test Company');
  });
});

describe('Database Schema Constraints', () => {
  it('should enforce minimum lengths', () => {
    expect(DATABASE_CONSTRAINTS.companies.name.minLength).toBe(2);
    expect(DATABASE_CONSTRAINTS.contacts.name.minLength).toBe(2);
    expect(DATABASE_CONSTRAINTS.products.name.minLength).toBe(2);
    expect(DATABASE_CONSTRAINTS.products.sku.minLength).toBe(2);
    expect(DATABASE_CONSTRAINTS.orders.order_number.minLength).toBe(3);
  });

  it('should enforce minimum values', () => {
    expect(DATABASE_CONSTRAINTS.products.price.min).toBe(0);
    expect(DATABASE_CONSTRAINTS.products.stock_quantity.min).toBe(0);
    expect(DATABASE_CONSTRAINTS.products.reorder_level.min).toBe(0);
    expect(DATABASE_CONSTRAINTS.orders.total_amount.min).toBe(0);
    expect(DATABASE_CONSTRAINTS.order_items.quantity.min).toBe(1);
    expect(DATABASE_CONSTRAINTS.order_items.unit_price.min).toBe(0);
    expect(DATABASE_CONSTRAINTS.order_items.subtotal.min).toBe(0);
    expect(DATABASE_CONSTRAINTS.wallets.balance.min).toBe(0);
    expect(DATABASE_CONSTRAINTS.investments.amount.min).toBe(1);
    expect(DATABASE_CONSTRAINTS.investments.expected_return.min).toBe(0);
    expect(DATABASE_CONSTRAINTS.investments.actual_return.min).toBe(0);
  });

  it('should have correct enum values', () => {
    expect(DATABASE_CONSTRAINTS.users.role).toEqual(['admin', 'owner', 'employee']);
    expect(DATABASE_CONSTRAINTS.contacts.type).toEqual(['lead', 'customer', 'vendor']);
    expect(DATABASE_CONSTRAINTS.contacts.status).toEqual(['active', 'inactive']);
    expect(DATABASE_CONSTRAINTS.products.status).toEqual(['active', 'inactive']);
    expect(DATABASE_CONSTRAINTS.orders.status).toEqual(['draft', 'confirmed', 'shipped', 'delivered']);
    expect(DATABASE_CONSTRAINTS.investments.status).toEqual(['active', 'matured', 'withdrawn']);
  });
});