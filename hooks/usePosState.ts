

import { useState, useCallback, useEffect, useMemo } from 'react';
import { Product, CartItem, Sale, Customer, Supplier, CustomerPayment, Category, SupplierPayment, Unit, Notification, SalePayment, ParkedSale, Adjustment, User, WorkSession, Expense, Purchase, PurchaseItem, Batch, SupplierReturn, SupplierReturnItem, PaymentMethod, AutoBackup } from '../types';
import { db } from '../db';
import * as apiClient from '../services/apiClient';
import * as syncService from '../services/syncService';
import { useTranslation } from '../contexts/LanguageContext';
import { importDB, exportDB } from 'dexie-export-import';

const initialCategories: Category[] = [
    { id: 'cat_hs', name: 'مشروبات ساخنة', parentId: null, imageUrl: 'https://picsum.photos/seed/hotdrinks/200' },
    { id: 'cat_b', name: 'مخبوزات', parentId: null, imageUrl: 'https://picsum.photos/seed/bakery/200' },
    { id: 'cat_cs', name: 'مشروبات باردة', parentId: null, imageUrl: 'https://picsum.photos/seed/colddrinks/200' },
    { id: 'cat_s', name: 'ساندويتشات', parentId: null, imageUrl: 'https://picsum.photos/seed/sandwiches/200' },
    { id: 'cat_sa', name: 'سلطات', parentId: null, imageUrl: 'https://picsum.photos/seed/salads/200' },
];

const generateExpiryDate = (days: number): string => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
};

const initialProducts: Product[] = [
    { id: 'p1', name: 'قهوة اسبريسو', categoryId: 'cat_hs', stock: 5, batches: [{ id: 'batch_p1', quantity: 5 }], sku: '800001', description: 'قهوة اسبريسو غنية وقوية.', imageUrl: 'https://picsum.photos/seed/espresso/200', units: [{ id: 'u1-1', name: 'كوب', price: 12.00, costPrice: 7.00, factor: 1 }], sellingMethod: 'unit' },
    { id: 'p2', name: 'كابتشينو', categoryId: 'cat_hs', stock: 45, batches: [{ id: 'batch_p2', quantity: 45 }], sku: '800002', description: 'مزيج مثالي من الاسبريسو والحليب المبخر.', imageUrl: 'https://picsum.photos/seed/cappuccino/200', units: [{ id: 'u2-1', name: 'كوب', price: 15.00, costPrice: 9.00, factor: 1 }], sellingMethod: 'unit' },
    { id: 'p3', name: 'كرواسون بالزبدة', categoryId: 'cat_b', stock: 8, batches: [{ id: 'batch_p3', quantity: 8, expiryDate: generateExpiryDate(5) }], sku: '800003', description: 'كرواسون فرنسي طازج وهش.', imageUrl: 'https://picsum.photos/seed/croissant/200', units: [{ id: 'u3-1', name: 'قطعة', price: 8.00, costPrice: 4.50, factor: 1 }, { id: 'u3-2', name: 'علبة (6 قطع)', price: 45.00, costPrice: 25.00, factor: 6 }], sellingMethod: 'unit' },
    { id: 'p4', name: 'عصير برتقال طازج', categoryId: 'cat_cs', stock: 25, batches: [{ id: 'batch_p4', quantity: 25, expiryDate: generateExpiryDate(20) }], sku: '800004', description: 'عصير برتقال معصور طازجًا.', imageUrl: 'https://picsum.photos/seed/juice/200', units: [{ id: 'u4-1', name: 'كوب', price: 10.00, costPrice: 6.00, factor: 1 }], sellingMethod: 'unit' },
    { id: 'p5', name: 'ساندويتش ديك رومي', categoryId: 'cat_s', stock: 20, batches: [{ id: 'batch_p5', quantity: 20, expiryDate: generateExpiryDate(40) }], sku: '800005', description: 'ساندويتش شهي بالديك الرومي المدخن.', imageUrl: 'https://picsum.photos/seed/sandwich/200', units: [{ id: 'u5-1', name: 'ساندويتش', price: 22.00, costPrice: 14.00, factor: 1 }], sellingMethod: 'unit' },
    { id: 'p6', name: 'سلطة سيزر', categoryId: 'cat_sa', stock: 15, batches: [{ id: 'batch_p6', quantity: 15, expiryDate: generateExpiryDate(2) }], sku: '800006', description: 'سلطة سيزر كلاسيكية مع الدجاج المشوي.', imageUrl: 'https://picsum.photos/seed/salad/200', units: [{ id: 'u6-1', name: 'طبق', price: 25.00, costPrice: 16.00, factor: 1 }], sellingMethod: 'unit' },
];

const initialCustomers: Customer[] = [
    { id: 'c1', name: 'زبون نقدي', phone: '-', email: '-', address: '-', balance: 0 },
    { id: 'c2', name: 'أحمد محمود', phone: '01001234567', email: 'ahmed@email.com', address: '123 شارع النصر, القاهرة', balance: 0 },
];

const initialSuppliers: Supplier[] = [
    { id: 's1', name: 'مورد القهوة', phone: '01112345678', email: 'coffee@supplier.com', company: 'شركة بن العالمية', balance: 0 },
];

const initialUsers: User[] = [
  { id: 'user1', username: 'admin', password: '123', role: 'admin' },
  { id: 'user2', username: 'cashier', password: '123', role: 'cashier' },
];

type SyncStatus = 'disconnected' | 'connecting' | 'connected';

const useDataSync = (setters: { [key: string]: (data: any) => void }, onSyncStatusChange: (status: SyncStatus) => void) => {
    useEffect(() => {
        const handleSyncMessage = async (event: MessageEvent) => {
            try {
                const message = JSON.parse(event.data);
                if (message.type === 'DATA_CHANGED' && message.payload.table) {
                    const table = message.payload.table;
                    console.log(`Sync received: ${table} updated. Refetching...`);
                    const setterKey = `set${table.charAt(0).toUpperCase() + table.slice(1)}`;
                    if (apiClient[`get${table.charAt(0).toUpperCase() + table.slice(1)}` as keyof typeof apiClient] && setters[setterKey]) {
                        const data = await (apiClient[`get${table.charAt(0).toUpperCase() + table.slice(1)}` as keyof typeof apiClient] as any)();
                        setters[setterKey](data);
                    }
                }
            } catch (error) {
                console.error("Error handling sync message:", error);
            }
        };

        const removeListener = syncService.listen(handleSyncMessage);

        const initializeSync = async () => {
            const syncUrlSetting = await db.settings.get('syncServerUrl');
            if (syncUrlSetting?.value) {
                syncService.initialize(syncUrlSetting.value, onSyncStatusChange);
            }
        };

        initializeSync();

        return () => {
            removeListener();
        };
    }, [setters, onSyncStatusChange]);
};


const usePosState = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [sales, setSales] = useState<Sale[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [customerPayments, setCustomerPayments] = useState<CustomerPayment[]>([]);
    const [supplierPayments, setSupplierPayments] = useState<SupplierPayment[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [parkedSales, setParkedSales] = useState<ParkedSale[]>([]);
    const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
    const [purchases, setPurchases] = useState<Purchase[]>([]);
    const [supplierReturns, setSupplierReturns] = useState<SupplierReturn[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [workSessions, setWorkSessions] = useState<WorkSession[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [autoBackups, setAutoBackups] = useState<AutoBackup[]>([]);

    // Settings state
    const [taxRate, setTaxRate] = useState(14);
    const [showTaxInReceipt, setShowTaxInReceipt] = useState(true);
    const [storeInfo, setStoreInfo] = useState({ name: 'متجر مورو POS', address: '123 شارع التجارة, القاهرة', phone: '01234567890', logoUrl: '' });
    const [syncServerUrl, setSyncServerUrl] = useState('');
    const [syncStatus, setSyncStatus] = useState<SyncStatus>('disconnected');
    const [autoBackupTime, setAutoBackupTime] = useState('23:00');
    const [backupDirectoryHandle, setBackupDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null);


    const [isLoading, setIsLoading] = useState(true);
    const { t } = useTranslation();

    const dataSetters = useMemo(() => ({
        setProducts, setSales, setCustomers, setSuppliers, setCustomerPayments, setSupplierPayments,
        setCategories, setParkedSales, setAdjustments, setPurchases, setSupplierReturns, setUsers,
        setWorkSessions, setExpenses
    }), []);

    useDataSync(dataSetters, setSyncStatus);
    
    const checkStockAndExpiry = useCallback(() => {
        let newNotifications: Notification[] = [];
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

        products.forEach(p => {
            // Low stock check
            if (p.stock <= 10 && p.stock > 0) {
                newNotifications.push({ id: `low_${p.id}`, messageKey: 'notifLowStock', messageArgs: [p.name, Math.floor(p.stock)], type: 'low_stock', read: false, productId: p.id });
            }
            // Expiry check
            const hasExpiringBatch = (p.batches || []).some(batch => 
                batch.expiryDate && new Date(batch.expiryDate) <= thirtyDaysFromNow
            );
            if (hasExpiringBatch) {
                newNotifications.push({ id: `exp_${p.id}`, messageKey: 'notifExpiry', messageArgs: [p.name], type: 'expiry', read: false, productId: p.id });
            }
        });
        
        setNotifications(newNotifications);
    }, [products]);
    
    const fetchAutoBackups = useCallback(async () => {
        try {
          const backups = await db.autoBackups.orderBy('id').reverse().toArray();
          setAutoBackups(backups);
        } catch (error) {
          console.error("Failed to fetch auto backups:", error);
        }
    }, []);

    const checkAndPerformAutomaticBackup = useCallback(async (backupTime: string, dirHandle: FileSystemDirectoryHandle | null) => {
        try {
            const lastBackup = await db.autoBackups.orderBy('id').reverse().first();
            const lastBackupDateStr = lastBackup?.id;

            const now = new Date();
            const [hours, minutes] = backupTime.split(':').map(Number);

            const scheduledTimeToday = new Date();
            scheduledTimeToday.setHours(hours, minutes, 0, 0);

            let backupTargetDate = new Date();
            if (now < scheduledTimeToday) {
                // If current time is before today's scheduled time, the last potential backup was for yesterday.
                backupTargetDate.setDate(backupTargetDate.getDate() - 1);
            }

            const backupTargetDateStr = backupTargetDate.toISOString().split('T')[0];

            if (!lastBackupDateStr || lastBackupDateStr < backupTargetDateStr) {
                console.log(`Performing automatic backup for date: ${backupTargetDateStr}`);
                const blob = await exportDB(db);

                // Save to IndexedDB (as before)
                await db.autoBackups.put({ id: backupTargetDateStr, blob, createdAt: new Date() });

                // Save to file system if handle exists
                if (dirHandle) {
                    try {
                        // FIX: Cast dirHandle to 'any' to resolve missing type definitions for File System Access API
                        const permission = await (dirHandle as any).queryPermission({ mode: 'readwrite' });
                        if (permission === 'granted' || (await (dirHandle as any).requestPermission({ mode: 'readwrite' })) === 'granted') {
                            const fileName = `pos-autobackup-${backupTargetDateStr}.json`;
                            const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
                            const writable = await fileHandle.createWritable();
                            await writable.write(blob);
                            await writable.close();
                            console.log(t('autoBackupSavedToFile'));
                        } else {
                            console.error(t('autoBackupFileSaveError'));
                        }
                    } catch (fsError) {
                        console.error(t('autoBackupFileSaveError'), fsError);
                    }
                }

                // Cleanup old backups (keep last 7)
                const allBackups = await db.autoBackups.orderBy('id').reverse().toArray();
                if (allBackups.length > 7) {
                    const toDelete = allBackups.slice(7).map(b => b.id);
                    await db.autoBackups.bulkDelete(toDelete);
                    console.log(`Deleted ${toDelete.length} old backups.`);
                }
                await fetchAutoBackups(); // Refresh the list in state
            } else {
                console.log("Automatic backup is up to date.");
            }
        } catch (error) {
            console.error("Automatic backup check failed:", error);
        }
    }, [fetchAutoBackups, t]);


    useEffect(() => {
        const loadInitialData = async () => {
            setIsLoading(true);
            try {
                const dbIsEmpty = await db.products.count() === 0;
                if (dbIsEmpty) {
                    // FIX: Replaced multiple arguments with an array for the list of tables in a transaction.
                    await db.transaction('rw', [db.products, db.categories, db.customers, db.suppliers, db.users], async () => {
                        await db.products.bulkAdd(initialProducts as any);
                        await db.categories.bulkAdd(initialCategories);
                        await db.customers.bulkAdd(initialCustomers);
                        await db.suppliers.bulkAdd(initialSuppliers);
                        await db.users.bulkAdd(initialUsers);
                    });
                }
                const [
                    productsData, categoriesData, salesData, customersData, suppliersData,
                    customerPaymentsData, supplierPaymentsData, parkedSalesData, adjustmentsData,
                    purchasesData, supplierReturnsData, usersData, workSessionsData, expensesData,
                    taxRateSetting, showTaxSetting, storeInfoSetting, syncUrlSetting, autoBackupTimeSetting,
                    backupDirHandleSetting
                ] = await Promise.all([
                    apiClient.getProducts(), apiClient.getCategories(), apiClient.getSales(), apiClient.getCustomers(), apiClient.getSuppliers(),
                    apiClient.getCustomerPayments(), apiClient.getSupplierPayments(), apiClient.getParkedSales(), apiClient.getAdjustments(),
                    apiClient.getPurchases(), apiClient.getSupplierReturns(), apiClient.getUsers(), apiClient.getWorkSessions(), apiClient.getExpenses(),
                    db.settings.get('taxRate'), db.settings.get('showTaxInReceipt'), db.settings.get('storeInfo'), db.settings.get('syncServerUrl'), db.settings.get('autoBackupTime'),
                    db.settings.get('backupDirectoryHandle')
                ]);

                setProducts(productsData);
                setCategories(categoriesData);
                setSales(salesData);
                setCustomers(customersData);
                setSuppliers(suppliersData);
                setCustomerPayments(customerPaymentsData);
                setSupplierPayments(supplierPaymentsData);
                setParkedSales(parkedSalesData);
                setAdjustments(adjustmentsData);
                setPurchases(purchasesData);
                setSupplierReturns(supplierReturnsData);
                setUsers(usersData);
                setWorkSessions(workSessionsData);
                setExpenses(expensesData);

                if (taxRateSetting) setTaxRate(taxRateSetting.value);
                if (showTaxSetting) setShowTaxInReceipt(showTaxSetting.value);
                if (storeInfoSetting) setStoreInfo(storeInfoSetting.value);
                if (syncUrlSetting) setSyncServerUrl(syncUrlSetting.value);
                if (backupDirHandleSetting) setBackupDirectoryHandle(backupDirHandleSetting.value);
                
                const backupTime = autoBackupTimeSetting?.value || '23:00';
                setAutoBackupTime(backupTime);

                const loggedInUser = sessionStorage.getItem('currentUser');
                if(loggedInUser) {
                    setCurrentUser(JSON.parse(loggedInUser));
                }
                
                checkAndPerformAutomaticBackup(backupTime, backupDirHandleSetting?.value || null);
                fetchAutoBackups();

            } catch (error) {
                console.error("Failed to load initial data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        loadInitialData();
    }, [checkAndPerformAutomaticBackup, fetchAutoBackups]);
    
    useEffect(() => {
        checkStockAndExpiry();
    }, [products, checkStockAndExpiry]);

    const login = useCallback((username, password) => {
        const user = users.find(u => u.username === username && u.password === password);
        if (user) {
            setCurrentUser(user);
            sessionStorage.setItem('currentUser', JSON.stringify(user));
            return true;
        }
        return false;
    }, [users]);

    const logout = useCallback(() => {
        setCurrentUser(null);
        sessionStorage.removeItem('currentUser');
    }, []);

    const dismissNotification = (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const addToCart = useCallback((product: Product, unit: Unit, quantity: number = 1) => {
        if(product.stock <= 0) {
            alert(t('productNotFoundInStock', product.name));
            return;
        }
        setCart(prevCart => {
            const existingItem = prevCart.find(item => item.id === product.id && item.unit.id === unit.id);
            if (existingItem) {
                return prevCart.map(item =>
                    item.id === product.id && item.unit.id === unit.id
                        ? { ...item, quantity: item.quantity + quantity }
                        : item
                );
            } else {
                return [...prevCart, { id: product.id, name: product.name, quantity, imageUrl: product.imageUrl, unit, costPrice: unit.costPrice }];
            }
        });
    }, [t]);

    const updateCartQuantity = useCallback((productId: string, unitId: string, quantity: number) => {
        if(quantity < 0) return;
        setCart(prevCart => {
             if (quantity === 0) {
                return prevCart.filter(item => !(item.id === productId && item.unit.id === unitId));
            }
            return prevCart.map(item =>
                item.id === productId && item.unit.id === unitId ? { ...item, quantity } : item
            );
        });
    }, []);

    const removeFromCart = useCallback((productId: string, unitId: string) => {
        setCart(prevCart => prevCart.filter(item => !(item.id === productId && item.unit.id === unitId)));
    }, []);

    const clearCart = useCallback(() => {
        setCart([]);
    }, []);
    
    const completeSale = useCallback(async (payments: SalePayment[], customerName: string, totalDiscount: number, createNewCustomer: boolean): Promise<{sale: Sale, customer: Customer}> => {
        if (cart.length === 0) throw new Error("Cart is empty");
        
        let customer: Customer | undefined;
        if (createNewCustomer) {
            const newCustomer = await apiClient.addCustomer({ name: customerName, phone: '', email: '', address: '' });
            setCustomers(prev => [...prev, newCustomer]);
            customer = newCustomer;
        } else {
             customer = customers.find(c => c.name.trim().toLowerCase() === customerName.trim().toLowerCase()) || customers.find(c => c.id === 'c1');
        }

        if(!customer) throw new Error("Customer not found");

        const subtotal = cart.reduce((acc, item) => acc + item.unit.price * item.quantity, 0);
        const subtotalAfterDiscount = subtotal - totalDiscount;
        const tax = subtotalAfterDiscount * (taxRate / 100);
        const total = subtotalAfterDiscount + tax;
        const totalCost = cart.reduce((acc, item) => acc + item.costPrice * item.quantity, 0);

        const sale: Sale = {
            id: `SALE-${Date.now()}`,
            items: cart,
            subtotal,
            tax,
            totalDiscount,
            total,
            taxRate,
            payments,
            date: new Date().toISOString(),
            customerId: customer.id,
            customerName: customer.name,
            totalCost,
        };

        const stockUpdates: Map<string, number> = new Map();
        for (const item of cart) {
            const stockChange = item.quantity * item.unit.factor;
            stockUpdates.set(item.id, (stockUpdates.get(item.id) || 0) + stockChange);
        }

        const productsToUpdate: Product[] = [];
        for (const p of products) {
            if (stockUpdates.has(p.id)) {
                productsToUpdate.push(p);
            }
        }
        
        let updatedCustomer: Customer = customer;

        await apiClient.performTransaction(async () => {
            for (const product of productsToUpdate) {
                const stockChange = stockUpdates.get(product.id)!;
                if(product.stock < stockChange) {
                    throw new Error(t('insufficientStockError', product.name, stockChange, product.stock));
                }

                let remainingChange = stockChange;
                const updatedBatches = [...product.batches];

                // Sort batches: those with expiry dates first, then by addition date (implicitly by order)
                updatedBatches.sort((a, b) => {
                    if (a.expiryDate && b.expiryDate) return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
                    if (a.expiryDate) return -1;
                    if (b.expiryDate) return 1;
                    return 0; 
                });
                
                for (let i = 0; i < updatedBatches.length && remainingChange > 0; i++) {
                    const batch = updatedBatches[i];
                    const amountToDeduct = Math.min(batch.quantity, remainingChange);
                    batch.quantity -= amountToDeduct;
                    remainingChange -= amountToDeduct;
                }
                
                product.stock -= stockChange;
                product.batches = updatedBatches.filter(b => b.quantity > 0);
            }
            await apiClient.bulkUpdateProducts(productsToUpdate);

            // Update customer balance for deferred payments
            const deferredAmount = payments.find(p => p.method === 'deferred')?.amount || 0;
            if (customer && customer.id !== 'c1' && deferredAmount > 0) {
                customer.balance += deferredAmount;
                updatedCustomer = {...customer};
                await apiClient.updateCustomer(customer);
            }
            
            await apiClient.addSale(sale);
        });

        setProducts(prev => prev.map(p => productsToUpdate.find(up => up.id === p.id) || p));
        if (customer.id !== 'c1') {
            setCustomers(prev => prev.map(c => c.id === customer!.id ? updatedCustomer : c));
        }
        setSales(prev => [sale, ...prev]);
        clearCart();
        return { sale, customer: updatedCustomer };
    }, [cart, customers, taxRate, products, clearCart, t]);

    // FIX: Renamed from `updateSaleItems` to `updateSale` to match component props.
    const updateSale = useCallback(async (saleId: string, updatedItems: CartItem[]) => {
        const originalSale = await db.sales.get(saleId);
        if (!originalSale) return;

        const originalItemsMap = new Map(originalSale.items.map(item => [`${item.id}-${item.unit.id}`, item]));
        const updatedItemsMap = new Map(updatedItems.map(item => [`${item.id}-${item.unit.id}`, item]));
        const stockChanges = new Map<string, number>();

        // Calculate stock changes
        originalItemsMap.forEach((originalItem, key) => {
            const updatedItem = updatedItemsMap.get(key);
            const quantityChange = (updatedItem?.quantity || 0) - originalItem.quantity; // negative if returned
            const stockChange = quantityChange * originalItem.unit.factor;
            stockChanges.set(originalItem.id, (stockChanges.get(originalItem.id) || 0) + stockChange);
        });
        
        const newSubtotal = updatedItems.reduce((sum, item) => sum + (item.unit.price * item.quantity), 0);
        const newSubtotalAfterDiscount = newSubtotal - originalSale.totalDiscount;
        const newTax = newSubtotalAfterDiscount * (originalSale.taxRate / 100);
        const newTotal = newSubtotalAfterDiscount + newTax;
        const newTotalCost = updatedItems.reduce((sum, item) => sum + (item.costPrice * item.quantity), 0);

        const balanceDifference = newTotal - originalSale.total;

        const updatedSale: Sale = {
            ...originalSale,
            items: updatedItems,
            subtotal: newSubtotal,
            total: newTotal,
            tax: newTax,
            totalCost: newTotalCost
        };

        const productsToUpdate = await db.products.where('id').anyOf(...Array.from(stockChanges.keys())).toArray();

        await apiClient.performTransaction(async () => {
             // Revert stock
            for(const product of productsToUpdate) {
                const stockChange = stockChanges.get(product.id)!;
                product.stock -= stockChange; // Subtracting the change (e.g., stock - (-5) = stock + 5 for returns)
                // Note: Batch management for returns is complex and simplified here. We add stock back to a generic or new batch.
                if (stockChange < 0) { // Item was returned, add stock back
                    const returnedQuantity = Math.abs(stockChange);
                    const mainBatch = product.batches[0];
                    if (mainBatch) {
                        mainBatch.quantity += returnedQuantity;
                    } else {
                        product.batches.push({ id: `ret_${saleId}_${product.id}`, quantity: returnedQuantity });
                    }
                }
            }
            await apiClient.bulkUpdateProducts(productsToUpdate);
            
            // Update customer balance if applicable
            if (originalSale.customerId && originalSale.customerId !== 'c1') {
                await apiClient.updateCustomerBalance(originalSale.customerId, balanceDifference);
            }
            
            await apiClient.updateSale(updatedSale);
        });
        
        setProducts(await apiClient.getProducts());
        setSales(await apiClient.getSales());
        if(originalSale.customerId) setCustomers(await apiClient.getCustomers());
        alert(t('saleUpdatedSuccess'));
    }, [t]);

    // Parked Sales handlers
    const parkSale = useCallback(async (customerId: string, notes?: string) => {
        if (cart.length === 0) return;
        const total = cart.reduce((acc, item) => acc + item.unit.price * item.quantity, 0);
        const parkedSale: ParkedSale = {
            id: `PARK-${Date.now()}`,
            date: new Date().toISOString(),
            items: cart,
            customerId,
            notes,
            total
        };
        await apiClient.addParkedSale(parkedSale);
        setParkedSales(prev => [parkedSale, ...prev]);
        clearCart();
    }, [cart, clearCart]);

    const retrieveSale = useCallback(async (saleId: string): Promise<string | undefined> => {
        const parkedSale = await apiClient.getParkedSaleById(saleId);
        if (parkedSale) {
            setCart(parkedSale.items);
            await apiClient.deleteParkedSale(saleId);
            setParkedSales(prev => prev.filter(s => s.id !== saleId));
            const customer = customers.find(c => c.id === parkedSale.customerId);
            return customer?.name;
        }
    }, [customers]);

    const deleteParkedSale = useCallback(async (saleId: string) => {
        await apiClient.deleteParkedSale(saleId);
        setParkedSales(prev => prev.filter(s => s.id !== saleId));
    }, []);

    // Products
    const addProduct = useCallback(async (productData: Omit<Product, 'id' | 'batches'> & { expiryDate?: string }) => {
        const { expiryDate, ...restProductData } = productData;
        const newProduct: Product = {
            id: `PROD-${Date.now()}`,
            batches: [],
            ...restProductData
        };
        if (newProduct.stock > 0) {
            newProduct.batches.push({
                id: `batch_initial_${newProduct.id}`,
                quantity: newProduct.stock,
                expiryDate: expiryDate || undefined,
            });
        }
        await apiClient.addProduct(newProduct as any);
        setProducts(await apiClient.getProducts());
    }, []);
    
    const updateProduct = useCallback(async (product: Product) => {
        await apiClient.updateProduct(product);
        setProducts(await apiClient.getProducts());
    }, []);
    
    const deleteProduct = useCallback(async (productId: string) => {
        await apiClient.deleteProduct(productId);
        setProducts(await apiClient.getProducts());
    }, []);

    // Categories
    const addCategory = useCallback(async (category: Omit<Category, 'id'>) => {
        await apiClient.addCategory(category);
        setCategories(await apiClient.getCategories());
    }, []);
    const updateCategory = useCallback(async (category: Category) => {
        await apiClient.updateCategory(category);
        setCategories(await apiClient.getCategories());
    }, []);
    const deleteCategory = useCallback(async (id: string) => {
        const productCount = await apiClient.countProductsInCategory([id]);
        if(productCount > 0){
            alert(t('categoryInUseError'));
            return false;
        }
        await apiClient.deleteCategoryAndChildren(id);
        setCategories(await apiClient.getCategories());
        return true;
    }, [t]);

    // Customers
    const addCustomer = useCallback(async (customer: Omit<Customer, 'id'|'balance'>) => {
        const newCustomer = { id: `CUS-${Date.now()}`, balance: 0, ...customer };
        await db.customers.add(newCustomer);
        syncService.notify('customers');
        setCustomers(await apiClient.getCustomers());
    }, []);

    const updateCustomer = useCallback(async (customer: Customer) => {
        await apiClient.updateCustomer(customer);
        setCustomers(await apiClient.getCustomers());
    }, []);

    const deleteCustomer = useCallback(async (id: string) => {
        await apiClient.deleteCustomer(id);
        setCustomers(await apiClient.getCustomers());
    }, []);

    const addCustomerPayment = useCallback(async (payment: Omit<CustomerPayment, 'id'|'date'>) => {
        await apiClient.addCustomerPayment(payment);
        setCustomerPayments(await apiClient.getCustomerPayments());
        setCustomers(await apiClient.getCustomers());
    }, []);

    // Suppliers
    const addSupplier = useCallback(async (supplier: Omit<Supplier, 'id'|'balance'>) => {
        await apiClient.addSupplier(supplier);
        setSuppliers(await apiClient.getSuppliers());
    }, []);

    const updateSupplier = useCallback(async (supplier: Supplier) => {
        await apiClient.updateSupplier(supplier);
        setSuppliers(await apiClient.getSuppliers());
    }, []);

    const deleteSupplier = useCallback(async (id: string) => {
        await apiClient.deleteSupplier(id);
        setSuppliers(await apiClient.getSuppliers());
    }, []);

    const addSupplierPayment = useCallback(async (payment: Omit<SupplierPayment, 'id'|'date'>) => {
        await apiClient.addSupplierPayment(payment);
        setSupplierPayments(await apiClient.getSupplierPayments());
        setSuppliers(await apiClient.getSuppliers());
    }, []);
    
    const addAdjustment = useCallback(async (adjustmentData: Omit<Adjustment, 'id' | 'date'>) => {
        const productsToUpdate = await db.products.where('id').anyOf(adjustmentData.items.map(i => i.productId)).toArray();

        await apiClient.performTransaction(async () => {
            for (const item of adjustmentData.items) {
                const product = productsToUpdate.find(p => p.id === item.productId);
                if (product) {
                    const quantityInBaseUnit = item.quantityChange * item.unitFactor;
                    product.stock += quantityInBaseUnit;
                    
                    // Simplified batch management for adjustments
                    if (quantityInBaseUnit > 0) { // Adding stock
                        const newBatchId = `adj_add_${Date.now()}`;
                        product.batches.push({ id: newBatchId, quantity: quantityInBaseUnit });
                    } else { // Removing stock
                        let quantityToRemove = -quantityInBaseUnit;
                        for (let i = product.batches.length - 1; i >= 0 && quantityToRemove > 0; i--) {
                            const batch = product.batches[i];
                            const amountToRemove = Math.min(batch.quantity, quantityToRemove);
                            batch.quantity -= amountToRemove;
                            quantityToRemove -= amountToRemove;
                        }
                        product.batches = product.batches.filter(b => b.quantity > 0);
                    }
                }
            }
            await apiClient.bulkUpdateProducts(productsToUpdate);
        });

        const newAdjustment = { id: `ADJ-${Date.now()}`, date: new Date().toISOString(), ...adjustmentData };
        await db.adjustments.add(newAdjustment);
        syncService.notify('adjustments');
        
        setProducts(await apiClient.getProducts());
        setAdjustments(await apiClient.getAdjustments());
    }, []);
    
    // Purchases
    const addPurchase = useCallback(async (purchaseData: Omit<Purchase, 'id'|'date'|'supplierName'>) => {
        try {
            await apiClient.performTransaction(async () => {
                const supplier = await db.suppliers.get(purchaseData.supplierId);
                if (!supplier) throw new Error("Supplier not found");

                const newPurchase: Purchase = {
                    id: `PUR-${Date.now()}`,
                    date: new Date().toISOString(),
                    supplierName: supplier.company,
                    ...purchaseData
                };

                const productsToUpdate = await db.products.where('id').anyOf(purchaseData.items.map(i => i.productId)).toArray();
                
                for (const item of purchaseData.items) {
                    const product = productsToUpdate.find(p => p.id === item.productId);
                    if (product) {
                        const quantityInBaseUnit = item.quantity * item.unitFactor;
                        product.stock += quantityInBaseUnit;
                        product.batches.push({
                            id: `batch_${newPurchase.id}_${item.productId}`,
                            quantity: quantityInBaseUnit,
                            expiryDate: item.expiryDate,
                            purchaseId: newPurchase.id,
                        });
                    }
                }
                
                await apiClient.bulkUpdateProducts(productsToUpdate);

                const balanceChange = purchaseData.total - purchaseData.amountPaid;
                await apiClient.updateSupplierBalance(purchaseData.supplierId, balanceChange);

                await db.purchases.add(newPurchase);
                syncService.notify('purchases');
            });

            setProducts(await apiClient.getProducts());
            setSuppliers(await apiClient.getSuppliers());
            setPurchases(await apiClient.getPurchases());

        } catch (error) {
            console.error("Error adding purchase:", error);
            alert(t('addPurchaseError'));
        }
    }, [t]);

    const deletePurchase = useCallback(async (purchaseId: string) => {
        try {
            await apiClient.performTransaction(async () => {
                const purchase = await apiClient.getPurchaseById(purchaseId);
                if (!purchase) throw new Error(t('purchaseNotFound'));

                const productsToUpdate = await db.products.where('id').anyOf(purchase.items.map(i => i.productId)).toArray();

                for (const item of purchase.items) {
                    const product = productsToUpdate.find(p => p.id === item.productId);
                    if (product) {
                        const quantityInBaseUnit = item.quantity * item.unitFactor;
                        product.stock -= quantityInBaseUnit;
                        // Remove the specific batch associated with this purchase
                        product.batches = product.batches.filter(b => b.purchaseId !== purchaseId);
                    }
                }
                
                await apiClient.bulkUpdateProducts(productsToUpdate);

                const balanceChange = purchase.total - purchase.amountPaid;
                await apiClient.updateSupplierBalance(purchase.supplierId, -balanceChange);

                await db.purchases.delete(purchaseId);
                syncService.notify('purchases');
            });
            
            setProducts(await apiClient.getProducts());
            setSuppliers(await apiClient.getSuppliers());
            setPurchases(await apiClient.getPurchases());

        } catch (error) {
            console.error("Error deleting purchase:", error);
            alert(t('deletePurchaseError'));
        }
    }, [t]);

    // Supplier Returns
    const addSupplierReturn = useCallback(async (returnData: Omit<SupplierReturn, 'id'|'date'|'supplierName'>) => {
        try {
            await apiClient.performTransaction(async () => {
                const supplier = await db.suppliers.get(returnData.supplierId);
                if (!supplier) throw new Error("Supplier not found");

                const newReturn: SupplierReturn = {
                    id: `RET-${Date.now()}`,
                    date: new Date().toISOString(),
                    supplierName: supplier.company,
                    ...returnData
                };

                const productsToUpdate = await db.products.where('id').anyOf(returnData.items.map(i => i.productId)).toArray();
                
                for (const item of returnData.items) {
                    const product = productsToUpdate.find(p => p.id === item.productId);
                    if (product) {
                        const quantityInBaseUnit = item.quantity * item.unitFactor;
                        product.stock -= quantityInBaseUnit;
                        // Note: Batch management for returns is complex. Simplification: remove from latest batches.
                        let quantityToRemove = quantityInBaseUnit;
                        for (let i = product.batches.length - 1; i >= 0 && quantityToRemove > 0; i--) {
                            const batch = product.batches[i];
                            const amountToRemove = Math.min(batch.quantity, quantityToRemove);
                            batch.quantity -= amountToRemove;
                            quantityToRemove -= amountToRemove;
                        }
                        product.batches = product.batches.filter(b => b.quantity > 0);
                    }
                }
                
                await apiClient.bulkUpdateProducts(productsToUpdate);
                await apiClient.updateSupplierBalance(returnData.supplierId, -returnData.total); // Debit the supplier
                await db.supplierReturns.add(newReturn);
                syncService.notify('supplierReturns');
            });

            setProducts(await apiClient.getProducts());
            setSuppliers(await apiClient.getSuppliers());
            setSupplierReturns(await apiClient.getSupplierReturns());
        } catch (error) {
            console.error("Error adding supplier return:", error);
            alert(t('addSupplierReturnError'));
        }
    }, [t]);

    const deleteSupplierReturn = useCallback(async (returnId: string) => {
         try {
            await apiClient.performTransaction(async () => {
                const sReturn = await apiClient.getSupplierReturnById(returnId);
                if (!sReturn) throw new Error(t('supplierReturnNotFound'));

                const productsToUpdate = await db.products.where('id').anyOf(sReturn.items.map(i => i.productId)).toArray();

                for (const item of sReturn.items) {
                    const product = productsToUpdate.find(p => p.id === item.productId);
                    if (product) {
                        const quantityInBaseUnit = item.quantity * item.unitFactor;
                        product.stock += quantityInBaseUnit;
                        // Add stock back to a generic new batch
                        product.batches.push({ id: `rev_ret_${returnId}_${item.productId}`, quantity: quantityInBaseUnit });
                    }
                }
                
                await apiClient.bulkUpdateProducts(productsToUpdate);
                await apiClient.updateSupplierBalance(sReturn.supplierId, sReturn.total);
                await db.supplierReturns.delete(returnId);
                syncService.notify('supplierReturns');
            });
            
            setProducts(await apiClient.getProducts());
            setSuppliers(await apiClient.getSuppliers());
            setSupplierReturns(await apiClient.getSupplierReturns());
        } catch (error) {
            console.error("Error deleting supplier return:", error);
            alert(t('deleteSupplierReturnError'));
        }
    }, [t]);

    const addUser = useCallback(async (user: Omit<User, 'id'>) => {
        await apiClient.addUser(user);
        setUsers(await apiClient.getUsers());
    }, []);

    const updateUser = useCallback(async (user: User) => {
        await apiClient.updateUser(user);
        setUsers(await apiClient.getUsers());
    }, []);

    const deleteUser = useCallback(async (userId: string) => {
        if (currentUser?.id === userId) {
            alert(t('cannotDeleteCurrentUser'));
            return;
        }
        await apiClient.deleteUser(userId);
        setUsers(await apiClient.getUsers());
    }, [currentUser, t]);

    const startSession = useCallback(async (openingFloat: number) => {
        if (!currentUser) { alert(t('noCurrentUser')); return; }
        const activeSession = workSessions.find(s => s.status === 'active');
        if (activeSession) { alert(t('sessionAlreadyActive')); return; }
        
        const newSession: WorkSession = {
            id: `SESS-${Date.now()}`,
            startTime: new Date().toISOString(),
            endTime: null,
            openingFloat,
            status: 'active',
            userId: currentUser.id,
            userName: currentUser.username,
        };
        await apiClient.addWorkSession(newSession);
        setWorkSessions(await apiClient.getWorkSessions());
    }, [currentUser, workSessions, t]);

    const addExpense = useCallback(async (expense: { amount: number; reason: string }) => {
        const activeSession = workSessions.find(s => s.status === 'active');
        if (!activeSession) { alert(t('mustStartSessionFirst')); return; }
        
        const newExpense: Expense = {
            id: `EXP-${Date.now()}`,
            sessionId: activeSession.id,
            date: new Date().toISOString(),
            ...expense,
        };
        await apiClient.addExpense(newExpense);
        setExpenses(await apiClient.getExpenses());
    }, [workSessions, t]);

    const endSession = useCallback(async (closingFloat: number) => {
        const activeSession = workSessions.find(s => s.status === 'active');
        if (!activeSession) { alert(t('noActiveSessionToEnd')); return; }

        const sessionSales = await apiClient.getSalesBetweenDates(activeSession.startTime, new Date().toISOString());
        const sessionExpenses = await apiClient.getExpensesBySessionId(activeSession.id);
        
        const totalCashSales = sessionSales.reduce((sum, sale) => sum + (sale.payments.find(p => p.method === 'cash')?.amount || 0), 0);
        const totalCardSales = sessionSales.reduce((sum, sale) => sum + (sale.payments.find(p => p.method === 'card')?.amount || 0), 0);
        const totalDeferredSales = sessionSales.reduce((sum, sale) => sum + (sale.payments.find(p => p.method === 'deferred')?.amount || 0), 0);
        const totalExpenses = sessionExpenses.reduce((sum, exp) => sum + exp.amount, 0);
        const expectedCash = activeSession.openingFloat + totalCashSales - totalExpenses;
        const difference = closingFloat - expectedCash;

        const updatedSession: WorkSession = {
            ...activeSession,
            endTime: new Date().toISOString(),
            status: 'closed',
            closingFloat,
            totalCashSales,
            totalCardSales,
            totalDeferredSales,
            totalExpenses,
            expectedCash,
            difference
        };
        
        await apiClient.updateWorkSession(updatedSession);
        setWorkSessions(await apiClient.getWorkSessions());
    }, [workSessions, t]);

    // Settings handlers
    const updateTaxRate = useCallback(async (newRate: number) => {
        await apiClient.putSetting({ key: 'taxRate', value: newRate });
        setTaxRate(newRate);
    }, []);
    
    const updateShowTaxInReceipt = useCallback(async (show: boolean) => {
        await apiClient.putSetting({ key: 'showTaxInReceipt', value: show });
        setShowTaxInReceipt(show);
    }, []);

    const updateStoreInfo = useCallback(async (info: Partial<typeof storeInfo>) => {
        const newInfo = { ...storeInfo, ...info };
        await apiClient.putSetting({ key: 'storeInfo', value: newInfo });
        setStoreInfo(newInfo);
    }, [storeInfo]);

    const updateSyncServerUrl = useCallback(async (url: string) => {
        await apiClient.putSetting({ key: 'syncServerUrl', value: url });
        setSyncServerUrl(url);
        syncService.initialize(url, setSyncStatus);
    }, []);
    
    const updateAutoBackupTime = useCallback(async (time: string) => {
        await apiClient.putSetting({ key: 'autoBackupTime', value: time });
        setAutoBackupTime(time);
    }, []);

    const setBackupDirectory = useCallback(async () => {
        if ('showDirectoryPicker' in window) {
            try {
                // FIX: Cast window to 'any' to resolve missing type definition for showDirectoryPicker.
                const handle = await (window as any).showDirectoryPicker();
                await db.settings.put({ key: 'backupDirectoryHandle', value: handle });
                setBackupDirectoryHandle(handle);
                alert(t('settingsFolderSetSuccess'));
            } catch (err) {
                console.error('Error selecting directory:', err);
            }
        } else {
            alert(t('settingsFileSystemNotSupported'));
        }
    }, [t]);

    const clearBackupDirectory = useCallback(async () => {
        await db.settings.delete('backupDirectoryHandle');
        setBackupDirectoryHandle(null);
        alert(t('settingsFolderCleared'));
    }, [t]);


    const importData = useCallback(async (blob: Blob) => {
        try {
          // FIX: The `importDB` function from newer versions of `dexie-export-import` 
          // does not take the database instance as the first argument. It infers the
          // database name from the blob.
          await importDB(blob, {
            clearTablesBeforeImport: true,
            overwriteValues: true,
          });
          alert(t('importSuccess'));
          window.location.reload();
        } catch (error) {
          console.error('Import failed (with decompression):', error);
          if (error instanceof Error && error.message.includes('r.eof is not a function')) {
            console.log('Retrying import without decompression...');
            try {
              // FIX: The `importDB` function from newer versions of `dexie-export-import` 
              // does not take the database instance as the first argument. It infers the
              // database name from the blob.
              await importDB(blob, {
                clearTablesBeforeImport: true,
                overwriteValues: true,
                noDecompression: true,
              });
              alert(t('importSuccess'));
              window.location.reload();
            } catch (retryError) {
              console.error('Import failed (without decompression):', retryError);
              alert(t('importFailed', (retryError as Error).message));
            }
          } else {
            alert(t('importFailed', (error as Error).message));
          }
        }
    }, [t]);

    const deleteAutoBackup = useCallback(async (id: string) => {
        await db.autoBackups.delete(id);
        await fetchAutoBackups();
    }, [fetchAutoBackups]);

    const restoreAutoBackup = useCallback(async (id: string) => {
        const backup = await db.autoBackups.get(id);
        if (backup) {
          await importData(backup.blob);
        } else {
            alert(t('backupNotFound'));
        }
    }, [importData, t]);


    return {
        products, cart, sales, customers, suppliers, categories, notifications, parkedSales, adjustments, purchases, supplierReturns, users, currentUser, workSessions, expenses, taxRate, showTaxInReceipt, storeInfo, isLoading, syncServerUrl, syncStatus, autoBackups, customerPayments, supplierPayments, autoBackupTime, backupDirectoryHandle,
        addToCart, updateCartQuantity, removeFromCart, clearCart, completeSale, updateSale, dismissNotification, parkSale, retrieveSale, deleteParkedSale, addProduct, updateProduct, deleteProduct,
        addCategory, updateCategory, deleteCategory, addCustomer, updateCustomer, deleteCustomer, addCustomerPayment,
        addSupplier, updateSupplier, deleteSupplier, addSupplierPayment, addAdjustment, addPurchase, deletePurchase, addSupplierReturn, deleteSupplierReturn,
        login, logout, addUser, updateUser, deleteUser, startSession, addExpense, endSession, updateTaxRate, updateShowTaxInReceipt, updateStoreInfo, updateSyncServerUrl, updateAutoBackupTime,
        importData, deleteAutoBackup, restoreAutoBackup, setBackupDirectory, clearBackupDirectory
    };
};

export default usePosState;
