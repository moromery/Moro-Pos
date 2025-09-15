import { db } from '../db';
import { Product, Sale, Customer, Supplier, Category, CustomerPayment, SupplierPayment, Adjustment, ParkedSale, User, WorkSession, Expense, Purchase, SupplierReturn, SalePayment } from '../types';
import * as syncService from './syncService';

// Products
export const getProducts = () => db.products.orderBy('name').toArray();
export const addProduct = async (product: Omit<Product, 'id' | 'batches'> & { expiryDate?: string }) => {
    await db.products.add(product as any); // The logic in usePosState handles the full object creation. This is a simplified wrapper.
    syncService.notify('products');
};
export const updateProduct = async (product: Product) => {
    await db.products.put(product);
    syncService.notify('products');
};
export const deleteProduct = async (productId: string) => {
    await db.products.delete(productId);
    syncService.notify('products');
};
export const bulkUpdateProducts = async (products: Product[]) => {
    await db.products.bulkPut(products);
    syncService.notify('products');
}

// Sales
export const getSales = () => db.sales.orderBy('date').reverse().toArray();
export const addSale = async (sale: Sale) => {
    await db.sales.add(sale);
    syncService.notify('sales');
};
export const updateSale = async (sale: Sale) => {
    await db.sales.put(sale);
    syncService.notify('sales');
};


// Categories
export const getCategories = () => db.categories.toArray();
export const addCategory = async (category: Omit<Category, 'id'>) => {
    const newCategory = { id: `CAT-${Date.now()}`, ...category }; // Simplified ID generation
    await db.categories.add(newCategory);
    syncService.notify('categories');
    return newCategory;
};
export const updateCategory = async (category: Category) => {
    await db.categories.put(category);
    syncService.notify('categories');
};
export const deleteCategoryAndChildren = async (categoryId: string) => {
    const descendantIds: string[] = [];
    const queue = [categoryId];
    while (queue.length > 0) {
        const currentId = queue.shift()!;
        descendantIds.push(currentId);
        const children = await db.categories.where('parentId').equals(currentId).toArray();
        children.forEach(child => queue.push(child.id));
    }
    await db.categories.bulkDelete(descendantIds);
    syncService.notify('categories');
};
export const countProductsInCategory = (categoryIds: string[]) => {
    return db.products.where('categoryId').anyOf(categoryIds).count();
};


// Customers
export const getCustomers = () => db.customers.orderBy('name').toArray();
export const addCustomer = async (customer: Omit<Customer, 'id'|'balance'>) => {
    const newCustomer = { id: `CUS-${Date.now()}`, balance: 0, ...customer };
    await db.customers.add(newCustomer);
    syncService.notify('customers');
    return newCustomer;
};
export const updateCustomer = async (customer: Customer) => {
    await db.customers.put(customer);
    syncService.notify('customers');
};
export const deleteCustomer = async (customerId: string) => {
    await db.customers.delete(customerId);
    syncService.notify('customers');
};
export const updateCustomerBalance = async (customerId: string, amountChange: number) => {
    await db.customers.where('id').equals(customerId).modify(c => { c.balance += amountChange; });
    syncService.notify('customers');
}

// Suppliers
export const getSuppliers = () => db.suppliers.orderBy('name').toArray();
export const addSupplier = async (supplier: Omit<Supplier, 'id'|'balance'>) => {
    const newSupplier = {id: `SUP-${Date.now()}`, balance: 0, ...supplier };
    await db.suppliers.add(newSupplier);
    syncService.notify('suppliers');
};
export const updateSupplier = async (supplier: Supplier) => {
    await db.suppliers.put(supplier);
    syncService.notify('suppliers');
};
export const deleteSupplier = async (supplierId: string) => {
    await db.suppliers.delete(supplierId);
    syncService.notify('suppliers');
};
export const updateSupplierBalance = async (supplierId: string, amountChange: number) => {
    await db.suppliers.where('id').equals(supplierId).modify(s => { s.balance += amountChange; });
    syncService.notify('suppliers');
}


// Customer Payments
export const getCustomerPayments = () => db.customerPayments.orderBy('date').reverse().toArray();
export const addCustomerPayment = async (payment: Omit<CustomerPayment, 'id'|'date'>) => {
    const newPayment = { id: `PAY-C-${Date.now()}`, date: new Date().toISOString(), ...payment };
    await db.customerPayments.add(newPayment);
    await updateCustomerBalance(payment.customerId, -payment.amount);
    syncService.notify('customerPayments');
};

// Supplier Payments
export const getSupplierPayments = () => db.supplierPayments.orderBy('date').reverse().toArray();
export const addSupplierPayment = async (payment: Omit<SupplierPayment, 'id'|'date'>) => {
    const newPayment = { id: `PAY-S-${Date.now()}`, date: new Date().toISOString(), ...payment };
    await db.supplierPayments.add(newPayment);
    await updateSupplierBalance(payment.supplierId, -payment.amount);
    syncService.notify('supplierPayments');
};

// Adjustments
export const getAdjustments = () => db.adjustments.orderBy('date').reverse().toArray();
export const addAdjustment = async (adjustment: Omit<Adjustment, 'id'|'date'>) => {
    const newAdjustment = { id: `ADJ-${Date.now()}`, date: new Date().toISOString(), ...adjustment };
    await db.adjustments.add(newAdjustment);
    syncService.notify('adjustments');
};

// Parked Sales
export const getParkedSales = () => db.parkedSales.orderBy('date').reverse().toArray();
export const addParkedSale = async (sale: ParkedSale) => {
    await db.parkedSales.add(sale);
    syncService.notify('parkedSales');
};
export const getParkedSaleById = (saleId: string) => db.parkedSales.get(saleId);
export const deleteParkedSale = async (saleId: string) => {
    await db.parkedSales.delete(saleId);
    syncService.notify('parkedSales');
};

// Purchases
export const getPurchases = () => db.purchases.orderBy('date').reverse().toArray();
export const addPurchase = async (purchase: Purchase) => {
    await db.purchases.add(purchase);
    syncService.notify('purchases');
};
export const deletePurchase = async (purchaseId: string) => {
    await db.purchases.delete(purchaseId);
    syncService.notify('purchases');
};
export const getPurchaseById = (purchaseId: string) => db.purchases.get(purchaseId);

// Supplier Returns
export const getSupplierReturns = () => db.supplierReturns.orderBy('date').reverse().toArray();
export const addSupplierReturn = async (sReturn: SupplierReturn) => {
    await db.supplierReturns.add(sReturn);
    syncService.notify('supplierReturns');
};
export const deleteSupplierReturn = async (returnId: string) => {
    await db.supplierReturns.delete(returnId);
    syncService.notify('supplierReturns');
};
export const getSupplierReturnById = (returnId: string) => db.supplierReturns.get(returnId);


// Users
export const getUsers = () => db.users.toArray();
export const addUser = async (user: Omit<User, 'id'>) => {
    const newUser = { id: `USR-${Date.now()}`, ...user };
    await db.users.add(newUser);
    syncService.notify('users');
};
export const updateUser = async (user: User) => {
    await db.users.put(user);
    syncService.notify('users');
};
export const deleteUser = async (userId: string) => {
    await db.users.delete(userId);
    syncService.notify('users');
};

// Sessions & Expenses
export const getWorkSessions = () => db.workSessions.orderBy('startTime').reverse().toArray();
export const addWorkSession = async (session: WorkSession) => {
    await db.workSessions.add(session);
    syncService.notify('workSessions');
};
export const updateWorkSession = async (session: WorkSession) => {
    await db.workSessions.put(session);
    syncService.notify('workSessions');
};
export const getExpenses = () => db.expenses.orderBy('date').reverse().toArray();
export const addExpense = async (expense: Expense) => {
    await db.expenses.add(expense);
    syncService.notify('expenses');
};
export const getExpensesBySessionId = (sessionId: string) => db.expenses.where('sessionId').equals(sessionId).toArray();
export const getSalesBetweenDates = (start: string, end: string) => db.sales.where('date').between(start, end).toArray();

// Settings
export const getSetting = (key: string) => db.settings.get(key);
export const putSetting = async (setting: { key: string, value: any }) => {
    await db.settings.put(setting);
    syncService.notify('settings');
};

// Full DB transaction
export const performTransaction = (callback: () => Promise<void>) => {
    return db.transaction('rw', db.tables, callback);
}