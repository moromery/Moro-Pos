
// FIX: Broke a circular dependency by changing Notification.messageKey to a string.
// This resolves phantom TypeScript errors related to the TranslationKey type.
// import { TranslationKey } from './contexts/LanguageContext';

// FIX: Removed circular self-import of Category, which conflicted with the local declaration.
export interface Category {
  id: string;
  name: string;
  parentId: string | null;
  imageUrl?: string;
}

export interface Unit {
  id: string;
  name: string; // e.g., "Piece", "Box", "Kilo"
  price: number; // selling price for this unit
  costPrice: number; // cost price for this unit
  factor: number; // how many base units this unit contains. Base unit has factor: 1
}

export interface Batch {
  id: string;
  quantity: number; // in base units
  expiryDate?: string; // ISO string for the date, e.g., "YYYY-MM-DD"
  purchaseId?: string; // Optional: to link batch to a purchase for easier reversal
}

export interface Product {
  id: string;
  name: string;
  categoryId: string;
  units: Unit[];
  stock: number; // stock is always in the base unit (the one with factor: 1). This is the TOTAL stock.
  batches: Batch[]; // Stock is managed in batches with expiry dates
  sku: string;
  description: string;
  imageUrl: string;
  sellingMethod: 'unit' | 'weight'; // New field
}

export interface CartItem {
  id: string; // product id
  name: string;
  quantity: number;
  imageUrl: string;
  unit: Unit; // The selected unit for this cart item
  costPrice: number; // The cost price of the unit at the time of adding to cart
}

export type PaymentMethod = 'cash' | 'card' | 'deferred';

export interface SalePayment {
    method: PaymentMethod;
    amount: number;
}

export interface Sale {
  id:string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  totalDiscount: number; // Discount on the whole sale
  total: number;
  taxRate: number; // The tax rate percentage at the time of sale
  payments: SalePayment[];
  date: string; // Stored as ISO string
  customerId?: string;
  customerName: string;
  totalCost: number; // Total cost of goods sold in this sale
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  balance: number;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  email: string;
  company: string;
  balance: number;
}

export interface CustomerPayment {
    id: string;
    customerId: string;
    customerName: string;
    date: string; // Stored as ISO string
    amount: number;
    notes?: string;
}

export interface SupplierPayment {
    id: string;
    supplierId: string;
    supplierName: string;
    date: string; // Stored as ISO string
    amount: number;
    notes?: string;
}

export interface Notification {
  id: string;
  messageKey: string;
  messageArgs?: any[];
  type: 'low_stock' | 'expiry';
  read: boolean;
  productId: string;
}


export interface ParkedSale {
  id: string;
  date: string;
  items: CartItem[];
  customerId: string;
  notes?: string;
  total: number;
}

export interface AdjustmentItem {
    productId: string;
    productName: string;
    quantityChange: number; // positive for addition, negative for removal
    unitName: string;
    unitFactor: number;
}

export type AdjustmentReason = 'damaged' | 'waste' | 'inventory_correction';

export interface Adjustment {
    id: string;
    date: string;
    items: AdjustmentItem[];
    reason: AdjustmentReason;
    notes?: string;
}

export interface Expense {
    id: string;
    sessionId: string;
    date: string; // ISO string
    amount: number;
    reason: string;
}

// FIX: Added PurchaseItem and Purchase types to resolve module export errors.
export interface PurchaseItem {
    productId: string;
    productName: string;
    quantity: number; // in the purchased unit
    costPrice: number; // per purchased unit
    unitName: string;
    unitFactor: number; // factor of the purchased unit relative to base unit
    subtotal: number;
    expiryDate?: string; // ISO Date String
}

export type PurchasePaymentMethod = 'cash' | 'deferred';

export interface Purchase {
    id: string;
    date: string; // ISO string
    supplierId: string;
    supplierName: string;
    items: PurchaseItem[];
    total: number;
    amountPaid: number;
    paymentMethod: PurchasePaymentMethod;
    notes?: string;
    referenceNumber?: string;
}

export interface SupplierReturnItem {
    productId: string;
    productName: string;
    quantity: number; // in the returned unit
    costPrice: number; // per returned unit
    unitName: string;
    unitFactor: number;
    subtotal: number;
}

export interface SupplierReturn {
    id: string;
    date: string; // ISO string
    supplierId: string;
    supplierName: string;
    items: SupplierReturnItem[];
    total: number;
    notes?: string;
    purchaseId?: string; // Optional: to link to an original purchase
}

export interface WorkSession {
    id: string;
    startTime: string; // ISO string
    endTime: string | null; // null if active
    openingFloat: number;
    status: 'active' | 'closed';
    userId: string;
    userName: string;
    
    // Fields for closed session
    closingFloat?: number; // Actual cash counted
    totalCashSales?: number;
    totalCardSales?: number;
    totalDeferredSales?: number;
    totalExpenses?: number;
    expectedCash?: number;
    difference?: number; // positive for overage, negative for shortage
}


export type Page = 'dashboard' | 'pos' | 'inventory' | 'categories' | 'sales' | 'purchases' | 'supplierReturns' | 'reports' | 'settings' | 'customers' | 'suppliers' | 'adjustments' | 'customerProfile' | 'supplierProfile' | 'sessions';

export type Role = 'admin' | 'cashier';

export interface User {
  id: string;
  username: string;
  password; // In a real app, this should be a hash.
  role: Role;
}