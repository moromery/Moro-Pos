
import { Page, Role } from './types';

export const PERMISSIONS: Record<Role, Page[]> = {
  admin: [
    'dashboard', 
    'pos', 
    'inventory', 
    'adjustments', 
    'categories', 
    'sales', 
    'purchases',
    'supplierReturns',
    'customers', 
    'suppliers', 
    'reports', 
    'sessions',
    'settings',
    'customerProfile',
    'supplierProfile'
  ],
  cashier: [
    'dashboard', 
    'pos', 
    'sales', 
    'customers',
    'customerProfile',
    'sessions'
  ],
};