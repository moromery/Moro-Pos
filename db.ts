import Dexie, { Table } from 'dexie';
// FIX: Import Purchase and SupplierReturn types.
import { Product, Category, Sale, Customer, Supplier, CustomerPayment, SupplierPayment, Adjustment, ParkedSale, User, WorkSession, Expense, Purchase, SupplierReturn, AutoBackup } from './types';

export interface Setting {
    key: string;
    value: any;
}

// FIX: Re-initialized Dexie without subclassing to fix typing issues.
// The original subclassing pattern was causing TypeScript to not recognize
// inherited methods like `version()`, `transaction()`, etc.
// This new pattern explicitly types the db instance.
export const db = new Dexie('PosDatabase') as Dexie & {
    products: Table<Product, string>;
    categories: Table<Category, string>;
    sales: Table<Sale, string>;
    customers: Table<Customer, string>;
    suppliers: Table<Supplier, string>;
    customerPayments: Table<CustomerPayment, string>;
    supplierPayments: Table<SupplierPayment, string>;
    // FIX: Add purchases table definition.
    purchases: Table<Purchase, string>;
    // ADD: Add supplierReturns table.
    supplierReturns: Table<SupplierReturn, string>;
    adjustments: Table<Adjustment, string>;
    parkedSales: Table<ParkedSale, string>;
    users: Table<User, string>;
    settings: Table<Setting, string>;
    workSessions: Table<WorkSession, string>;
    expenses: Table<Expense, string>;
    autoBackups: Table<AutoBackup, string>;
};

// NOTE: Adding a new table to an existing version might require users to clear their browser database
// if they have an older version of the app. The proper way is to increment the DB version.
db.version(1).stores({
    products: 'id, name, categoryId, sku',
    categories: 'id, parentId',
    sales: 'id, date, customerId',
    customers: 'id, name, phone',
    suppliers: 'id, name, company',
    customerPayments: 'id, customerId, date',
    supplierPayments: 'id, supplierId, date',
    // FIX: Add purchases table to schema.
    purchases: 'id, supplierId, date',
    // ADD: Add supplierReturns table schema.
    supplierReturns: 'id, supplierId, date',
    adjustments: 'id, date',
    parkedSales: 'id, date',
    users: 'id, username',
    settings: 'key',
    workSessions: 'id, status, startTime',
    expenses: 'id, sessionId, date',
});

// Version 2: Added auto_backups table
db.version(2).stores({
    products: 'id, name, categoryId, sku',
    categories: 'id, parentId',
    sales: 'id, date, customerId',
    customers: 'id, name, phone',
    suppliers: 'id, name, company',
    customerPayments: 'id, customerId, date',
    supplierPayments: 'id, supplierId, date',
    purchases: 'id, supplierId, date',
    supplierReturns: 'id, supplierId, date',
    adjustments: 'id, date',
    parkedSales: 'id, date',
    users: 'id, username',
    settings: 'key',
    workSessions: 'id, status, startTime',
    expenses: 'id, sessionId, date',
    autoBackups: 'id', // id will be 'YYYY-MM-DD'
});