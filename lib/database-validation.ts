// Database Validation Utilities
// This file provides validation functions that match database constraints

import type {
  UserInsert,
  UserUpdate,
  CompanyInsert,
  CompanyUpdate,
  ContactInsert,
  ContactUpdate,
  ProductInsert,
  ProductUpdate,
  OrderInsert,
  OrderUpdate,
  OrderItemInsert,
  OrderItemUpdate,
  WalletInsert,
  WalletUpdate,
  InvestmentInsert,
  InvestmentUpdate,
  ValidationResult,
  DatabaseConstraints,
} from './database-types';

// Database constraints configuration
export const DATABASE_CONSTRAINTS: DatabaseConstraints = {
  users: {
    email: /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/,
    role: ['admin', 'owner', 'employee'],
  },
  companies: {
    name: { minLength: 2 },
    gst_number: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
    pan_number: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
  },
  contacts: {
    name: { minLength: 2 },
    email: /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/,
    type: ['lead', 'customer', 'vendor'],
    status: ['active', 'inactive'],
  },
  products: {
    name: { minLength: 2 },
    sku: { minLength: 2 },
    price: { min: 0 },
    stock_quantity: { min: 0 },
    reorder_level: { min: 0 },
    status: ['active', 'inactive'],
  },
  orders: {
    order_number: { minLength: 3 },
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
    amount: { min: 1 },
    expected_return: { min: 0 },
    actual_return: { min: 0 },
    status: ['active', 'matured', 'withdrawn'],
  },
};

// Generic validation helper functions
function validateEmail(email: string): boolean {
  return DATABASE_CONSTRAINTS.users.email.test(email);
}

function validateStringLength(value: string, minLength: number): boolean {
  return value && value.trim().length >= minLength;
}

function validatePositiveNumber(value: number, min: number = 0): boolean {
  return typeof value === 'number' && value >= min;
}

function validateEnum<T extends string>(value: T, allowedValues: readonly T[]): boolean {
  return allowedValues.includes(value);
}

function validateOptionalEmail(email: string | null | undefined): boolean {
  return email === null || email === undefined || validateEmail(email);
}

function validateOptionalRegex(value: string | null | undefined, regex: RegExp): boolean {
  return value === null || value === undefined || regex.test(value);
}

// User validation functions
export function validateUserInsert(user: UserInsert): ValidationResult {
  const errors: string[] = [];

  if (!validateEmail(user.email)) {
    errors.push('Invalid email format');
  }

  if (user.role && !validateEnum(user.role, DATABASE_CONSTRAINTS.users.role)) {
    errors.push('Invalid user role');
  }

  if (!user.company_id) {
    errors.push('Company ID is required');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateUserUpdate(user: UserUpdate): ValidationResult {
  const errors: string[] = [];

  if (user.email && !validateEmail(user.email)) {
    errors.push('Invalid email format');
  }

  if (user.role && !validateEnum(user.role, DATABASE_CONSTRAINTS.users.role)) {
    errors.push('Invalid user role');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Company validation functions
export function validateCompanyInsert(company: CompanyInsert): ValidationResult {
  const errors: string[] = [];

  if (!validateStringLength(company.name, DATABASE_CONSTRAINTS.companies.name.minLength)) {
    errors.push('Company name must be at least 2 characters long');
  }

  if (!validateOptionalRegex(company.gst_number, DATABASE_CONSTRAINTS.companies.gst_number)) {
    errors.push('Invalid GST number format');
  }

  if (!validateOptionalRegex(company.pan_number, DATABASE_CONSTRAINTS.companies.pan_number)) {
    errors.push('Invalid PAN number format');
  }

  if (company.email && !validateOptionalEmail(company.email)) {
    errors.push('Invalid company email format');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateCompanyUpdate(company: CompanyUpdate): ValidationResult {
  const errors: string[] = [];

  if (company.name && !validateStringLength(company.name, DATABASE_CONSTRAINTS.companies.name.minLength)) {
    errors.push('Company name must be at least 2 characters long');
  }

  if (!validateOptionalRegex(company.gst_number, DATABASE_CONSTRAINTS.companies.gst_number)) {
    errors.push('Invalid GST number format');
  }

  if (!validateOptionalRegex(company.pan_number, DATABASE_CONSTRAINTS.companies.pan_number)) {
    errors.push('Invalid PAN number format');
  }

  if (company.email && !validateOptionalEmail(company.email)) {
    errors.push('Invalid company email format');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Contact validation functions
export function validateContactInsert(contact: ContactInsert): ValidationResult {
  const errors: string[] = [];

  if (!validateStringLength(contact.name, DATABASE_CONSTRAINTS.contacts.name.minLength)) {
    errors.push('Contact name must be at least 2 characters long');
  }

  if (!validateOptionalEmail(contact.email)) {
    errors.push('Invalid contact email format');
  }

  if (!validateEnum(contact.type, DATABASE_CONSTRAINTS.contacts.type)) {
    errors.push('Invalid contact type');
  }

  if (contact.status && !validateEnum(contact.status, DATABASE_CONSTRAINTS.contacts.status)) {
    errors.push('Invalid contact status');
  }

  if (!contact.company_id) {
    errors.push('Company ID is required');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateContactUpdate(contact: ContactUpdate): ValidationResult {
  const errors: string[] = [];

  if (contact.name && !validateStringLength(contact.name, DATABASE_CONSTRAINTS.contacts.name.minLength)) {
    errors.push('Contact name must be at least 2 characters long');
  }

  if (contact.email && !validateOptionalEmail(contact.email)) {
    errors.push('Invalid contact email format');
  }

  if (contact.type && !validateEnum(contact.type, DATABASE_CONSTRAINTS.contacts.type)) {
    errors.push('Invalid contact type');
  }

  if (contact.status && !validateEnum(contact.status, DATABASE_CONSTRAINTS.contacts.status)) {
    errors.push('Invalid contact status');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Product validation functions
export function validateProductInsert(product: ProductInsert): ValidationResult {
  const errors: string[] = [];

  if (!validateStringLength(product.name, DATABASE_CONSTRAINTS.products.name.minLength)) {
    errors.push('Product name must be at least 2 characters long');
  }

  if (!validateStringLength(product.sku, DATABASE_CONSTRAINTS.products.sku.minLength)) {
    errors.push('Product SKU must be at least 2 characters long');
  }

  if (!validatePositiveNumber(product.price, DATABASE_CONSTRAINTS.products.price.min)) {
    errors.push('Product price must be non-negative');
  }

  if (product.stock_quantity !== undefined && !validatePositiveNumber(product.stock_quantity, DATABASE_CONSTRAINTS.products.stock_quantity.min)) {
    errors.push('Stock quantity must be non-negative');
  }

  if (product.reorder_level !== undefined && !validatePositiveNumber(product.reorder_level, DATABASE_CONSTRAINTS.products.reorder_level.min)) {
    errors.push('Reorder level must be non-negative');
  }

  if (product.status && !validateEnum(product.status, DATABASE_CONSTRAINTS.products.status)) {
    errors.push('Invalid product status');
  }

  if (!product.company_id) {
    errors.push('Company ID is required');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateProductUpdate(product: ProductUpdate): ValidationResult {
  const errors: string[] = [];

  if (product.name && !validateStringLength(product.name, DATABASE_CONSTRAINTS.products.name.minLength)) {
    errors.push('Product name must be at least 2 characters long');
  }

  if (product.sku && !validateStringLength(product.sku, DATABASE_CONSTRAINTS.products.sku.minLength)) {
    errors.push('Product SKU must be at least 2 characters long');
  }

  if (product.price !== undefined && !validatePositiveNumber(product.price, DATABASE_CONSTRAINTS.products.price.min)) {
    errors.push('Product price must be non-negative');
  }

  if (product.stock_quantity !== undefined && !validatePositiveNumber(product.stock_quantity, DATABASE_CONSTRAINTS.products.stock_quantity.min)) {
    errors.push('Stock quantity must be non-negative');
  }

  if (product.reorder_level !== undefined && !validatePositiveNumber(product.reorder_level, DATABASE_CONSTRAINTS.products.reorder_level.min)) {
    errors.push('Reorder level must be non-negative');
  }

  if (product.status && !validateEnum(product.status, DATABASE_CONSTRAINTS.products.status)) {
    errors.push('Invalid product status');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Order validation functions
export function validateOrderInsert(order: OrderInsert): ValidationResult {
  const errors: string[] = [];

  if (!validateStringLength(order.order_number, DATABASE_CONSTRAINTS.orders.order_number.minLength)) {
    errors.push('Order number must be at least 3 characters long');
  }

  if (!validatePositiveNumber(order.total_amount, DATABASE_CONSTRAINTS.orders.total_amount.min)) {
    errors.push('Order total amount must be non-negative');
  }

  if (order.status && !validateEnum(order.status, DATABASE_CONSTRAINTS.orders.status)) {
    errors.push('Invalid order status');
  }

  if (!order.company_id) {
    errors.push('Company ID is required');
  }

  if (!order.contact_id) {
    errors.push('Contact ID is required');
  }

  if (!order.order_date) {
    errors.push('Order date is required');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateOrderUpdate(order: OrderUpdate): ValidationResult {
  const errors: string[] = [];

  if (order.order_number && !validateStringLength(order.order_number, DATABASE_CONSTRAINTS.orders.order_number.minLength)) {
    errors.push('Order number must be at least 3 characters long');
  }

  if (order.total_amount !== undefined && !validatePositiveNumber(order.total_amount, DATABASE_CONSTRAINTS.orders.total_amount.min)) {
    errors.push('Order total amount must be non-negative');
  }

  if (order.status && !validateEnum(order.status, DATABASE_CONSTRAINTS.orders.status)) {
    errors.push('Invalid order status');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Order item validation functions
export function validateOrderItemInsert(orderItem: OrderItemInsert): ValidationResult {
  const errors: string[] = [];

  if (!validatePositiveNumber(orderItem.quantity, DATABASE_CONSTRAINTS.order_items.quantity.min)) {
    errors.push('Order item quantity must be positive');
  }

  if (!validatePositiveNumber(orderItem.unit_price, DATABASE_CONSTRAINTS.order_items.unit_price.min)) {
    errors.push('Order item unit price must be non-negative');
  }

  if (!validatePositiveNumber(orderItem.subtotal, DATABASE_CONSTRAINTS.order_items.subtotal.min)) {
    errors.push('Order item subtotal must be non-negative');
  }

  if (!orderItem.order_id) {
    errors.push('Order ID is required');
  }

  if (!orderItem.product_id) {
    errors.push('Product ID is required');
  }

  // Validate that subtotal matches quantity * unit_price
  const expectedSubtotal = orderItem.quantity * orderItem.unit_price;
  if (Math.abs(orderItem.subtotal - expectedSubtotal) > 0.01) {
    errors.push('Order item subtotal does not match quantity × unit price');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateOrderItemUpdate(orderItem: OrderItemUpdate): ValidationResult {
  const errors: string[] = [];

  if (orderItem.quantity !== undefined && !validatePositiveNumber(orderItem.quantity, DATABASE_CONSTRAINTS.order_items.quantity.min)) {
    errors.push('Order item quantity must be positive');
  }

  if (orderItem.unit_price !== undefined && !validatePositiveNumber(orderItem.unit_price, DATABASE_CONSTRAINTS.order_items.unit_price.min)) {
    errors.push('Order item unit price must be non-negative');
  }

  if (orderItem.subtotal !== undefined && !validatePositiveNumber(orderItem.subtotal, DATABASE_CONSTRAINTS.order_items.subtotal.min)) {
    errors.push('Order item subtotal must be non-negative');
  }

  // Validate subtotal calculation if all values are provided
  if (orderItem.quantity !== undefined && orderItem.unit_price !== undefined && orderItem.subtotal !== undefined) {
    const expectedSubtotal = orderItem.quantity * orderItem.unit_price;
    if (Math.abs(orderItem.subtotal - expectedSubtotal) > 0.01) {
      errors.push('Order item subtotal does not match quantity × unit price');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Wallet validation functions
export function validateWalletInsert(wallet: WalletInsert): ValidationResult {
  const errors: string[] = [];

  if (wallet.balance !== undefined && !validatePositiveNumber(wallet.balance, DATABASE_CONSTRAINTS.wallets.balance.min)) {
    errors.push('Wallet balance must be non-negative');
  }

  if (wallet.currency && !DATABASE_CONSTRAINTS.wallets.currency.test(wallet.currency)) {
    errors.push('Currency must be a 3-letter uppercase code (e.g., USD, EUR, INR)');
  }

  if (!wallet.company_id) {
    errors.push('Company ID is required');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateWalletUpdate(wallet: WalletUpdate): ValidationResult {
  const errors: string[] = [];

  if (wallet.balance !== undefined && !validatePositiveNumber(wallet.balance, DATABASE_CONSTRAINTS.wallets.balance.min)) {
    errors.push('Wallet balance must be non-negative');
  }

  if (wallet.currency && !DATABASE_CONSTRAINTS.wallets.currency.test(wallet.currency)) {
    errors.push('Currency must be a 3-letter uppercase code (e.g., USD, EUR, INR)');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Investment validation functions
export function validateInvestmentInsert(investment: InvestmentInsert): ValidationResult {
  const errors: string[] = [];

  if (!validatePositiveNumber(investment.amount, DATABASE_CONSTRAINTS.investments.amount.min)) {
    errors.push('Investment amount must be positive');
  }

  if (!validatePositiveNumber(investment.expected_return, DATABASE_CONSTRAINTS.investments.expected_return.min)) {
    errors.push('Expected return must be non-negative');
  }

  if (investment.actual_return !== undefined && investment.actual_return !== null && !validatePositiveNumber(investment.actual_return, DATABASE_CONSTRAINTS.investments.actual_return.min)) {
    errors.push('Actual return must be non-negative');
  }

  if (investment.status && !validateEnum(investment.status, DATABASE_CONSTRAINTS.investments.status)) {
    errors.push('Invalid investment status');
  }

  if (!investment.company_id) {
    errors.push('Company ID is required');
  }

  if (!investment.investment_type) {
    errors.push('Investment type is required');
  }

  if (!investment.investment_date) {
    errors.push('Investment date is required');
  }

  // Validate date logic
  if (investment.maturity_date && investment.investment_date) {
    const investmentDate = new Date(investment.investment_date);
    const maturityDate = new Date(investment.maturity_date);
    if (maturityDate <= investmentDate) {
      errors.push('Maturity date must be after investment date');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validateInvestmentUpdate(investment: InvestmentUpdate): ValidationResult {
  const errors: string[] = [];

  if (investment.amount !== undefined && !validatePositiveNumber(investment.amount, DATABASE_CONSTRAINTS.investments.amount.min)) {
    errors.push('Investment amount must be positive');
  }

  if (investment.expected_return !== undefined && !validatePositiveNumber(investment.expected_return, DATABASE_CONSTRAINTS.investments.expected_return.min)) {
    errors.push('Expected return must be non-negative');
  }

  if (investment.actual_return !== undefined && investment.actual_return !== null && !validatePositiveNumber(investment.actual_return, DATABASE_CONSTRAINTS.investments.actual_return.min)) {
    errors.push('Actual return must be non-negative');
  }

  if (investment.status && !validateEnum(investment.status, DATABASE_CONSTRAINTS.investments.status)) {
    errors.push('Invalid investment status');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Comprehensive validation function that validates any table record
export function validateRecord<T extends keyof Database['public']['Tables']>(
  table: T,
  operation: 'insert' | 'update',
  data: any
): ValidationResult {
  switch (table) {
    case 'users':
      return operation === 'insert' ? validateUserInsert(data) : validateUserUpdate(data);
    case 'companies':
      return operation === 'insert' ? validateCompanyInsert(data) : validateCompanyUpdate(data);
    case 'contacts':
      return operation === 'insert' ? validateContactInsert(data) : validateContactUpdate(data);
    case 'products':
      return operation === 'insert' ? validateProductInsert(data) : validateProductUpdate(data);
    case 'orders':
      return operation === 'insert' ? validateOrderInsert(data) : validateOrderUpdate(data);
    case 'order_items':
      return operation === 'insert' ? validateOrderItemInsert(data) : validateOrderItemUpdate(data);
    case 'wallets':
      return operation === 'insert' ? validateWalletInsert(data) : validateWalletUpdate(data);
    case 'investments':
      return operation === 'insert' ? validateInvestmentInsert(data) : validateInvestmentUpdate(data);
    default:
      return { isValid: false, errors: ['Unknown table'] };
  }
}

// Export validation utilities
export const ValidationUtils = {
  validateEmail,
  validateStringLength,
  validatePositiveNumber,
  validateEnum,
  validateOptionalEmail,
  validateOptionalRegex,
};

// Export all validation functions
export const TableValidators = {
  users: { insert: validateUserInsert, update: validateUserUpdate },
  companies: { insert: validateCompanyInsert, update: validateCompanyUpdate },
  contacts: { insert: validateContactInsert, update: validateContactUpdate },
  products: { insert: validateProductInsert, update: validateProductUpdate },
  orders: { insert: validateOrderInsert, update: validateOrderUpdate },
  order_items: { insert: validateOrderItemInsert, update: validateOrderItemUpdate },
  wallets: { insert: validateWalletInsert, update: validateWalletUpdate },
  investments: { insert: validateInvestmentInsert, update: validateInvestmentUpdate },
};