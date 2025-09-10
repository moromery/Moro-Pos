import { useState, useCallback, useEffect } from 'react';
// FIX: Import Purchase and PurchaseItem types.
import { Product, CartItem, Sale, Customer, Supplier, CustomerPayment, Category, SupplierPayment, Unit, Notification, SalePayment, ParkedSale, Adjustment, User, WorkSession, Expense, Purchase, PurchaseItem, Batch, SupplierReturn, SupplierReturnItem, PaymentMethod } from '../types';
import { db } from '../db';
import { useTranslation } from '../contexts/LanguageContext';

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
    { id: 's1', name: 'مورد القهوة', phone: '01112345678', email: 'coffee@supplier.com', company: 'شركة حبوب البن الذهبية', balance: 0 },
    { id: 's2', name: 'مورد المخبوزات', phone: '01223456789', email: 'bakery@supplier.com', company: 'مخبز الفجر', balance: 150.75 },
];

const initialUsers: User[] = [
    { id: 'user_admin', username: 'admin', password: 'password', role: 'admin' },
    { id: 'user_cashier', username: 'cashier', password: 'password', role: 'cashier' },
];

const initialStoreInfo = {
    name: 'اسم المتجر',
    address: '123 شارع التجارة, المدينة',
    phone: '0123456789',
    logoUrl: '',
};

const getDateDaysAgo = (days: number): string => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString();
};

const initialPurchases: Purchase[] = [
    {
        id: 'pur_1',
        date: getDateDaysAgo(25),
        supplierId: 's1',
        supplierName: 'شركة حبوب البن الذهبية',
        items: [{
            productId: 'p1',
            productName: 'قهوة اسبريسو',
            quantity: 100,
            costPrice: 6.80,
            unitName: 'كوب',
            unitFactor: 1,
            subtotal: 680,
        }],
        total: 680,
        amountPaid: 680,
        paymentMethod: 'cash',
        notes: 'دفعة أولى من حبوب القهوة الإثيوبية',
    },
    {
        id: 'pur_2',
        date: getDateDaysAgo(20),
        supplierId: 's2',
        supplierName: 'مخبز الفجر',
        items: [{
            productId: 'p3',
            productName: 'كرواسون بالزبدة',
            quantity: 20,
            costPrice: 24.50,
            unitName: 'علبة (6 قطع)',
            unitFactor: 6,
            subtotal: 490,
            expiryDate: generateExpiryDate(25)
        }],
        total: 490,
        amountPaid: 400,
        paymentMethod: 'deferred',
        notes: '',
    },
    {
        id: 'pur_3',
        date: getDateDaysAgo(15),
        supplierId: 's1',
        supplierName: 'شركة حبوب البن الذهبية',
        items: [{
            productId: 'p2',
            productName: 'كابتشينو',
            quantity: 50,
            costPrice: 8.90,
            unitName: 'كوب',
            unitFactor: 1,
            subtotal: 445,
        }],
        total: 445,
        amountPaid: 0,
        paymentMethod: 'deferred',
        notes: 'سيتم السداد الأسبوع القادم',
    },
    {
        id: 'pur_4',
        date: getDateDaysAgo(10),
        supplierId: 's2',
        supplierName: 'مخبز الفجر',
        items: [
            {
                productId: 'p3',
                productName: 'كرواسون بالزبدة',
                quantity: 150,
                costPrice: 4.50,
                unitName: 'قطعة',
                unitFactor: 1,
                subtotal: 675,
                expiryDate: generateExpiryDate(15)
            },
            {
                productId: 'p5',
                productName: 'ساندويتش ديك رومي',
                quantity: 30,
                costPrice: 13.50,
                unitName: 'ساندويتش',
                unitFactor: 1,
                subtotal: 405,
                expiryDate: generateExpiryDate(50)
            }
        ],
        total: 1080,
        amountPaid: 1080,
        paymentMethod: 'cash',
        notes: 'توريد يومي',
    },
    {
        id: 'pur_5',
        date: getDateDaysAgo(5),
        supplierId: 's1',
        supplierName: 'شركة حبوب البن الذهبية',
        items: [{
            productId: 'p4',
            productName: 'عصير برتقال طازج',
            quantity: 80,
            costPrice: 5.75,
            unitName: 'كوب',
            unitFactor: 1,
            subtotal: 460,
            expiryDate: generateExpiryDate(25)
        }],
        total: 460,
        amountPaid: 200,
        paymentMethod: 'deferred',
        notes: 'دفعة تحت الحساب',
    }
];

// Pre-process initial data based on purchases for a more realistic demo state
const processInitialData = () => {
    const products = JSON.parse(JSON.stringify(initialProducts)) as Product[];
    const suppliers = JSON.parse(JSON.stringify(initialSuppliers)) as Supplier[];

    const productStockUpdates = new Map<string, Batch[]>();
    const supplierBalanceUpdates = new Map<string, number>();

    for (const purchase of initialPurchases) {
        // Update product stock with batches
        for (const item of purchase.items) {
            const currentBatches = productStockUpdates.get(item.productId) || [];
            const newBatch: Batch = {
                id: `batch_${purchase.id}_${item.productId}`,
                quantity: item.quantity * item.unitFactor,
                expiryDate: item.expiryDate,
                purchaseId: purchase.id
            };
            productStockUpdates.set(item.productId, [...currentBatches, newBatch]);
        }

        // Update supplier balance
        const dueAmount = purchase.total - purchase.amountPaid;
        if (dueAmount > 0) {
            const currentUpdate = supplierBalanceUpdates.get(purchase.supplierId) || 0;
            supplierBalanceUpdates.set(purchase.supplierId, currentUpdate + dueAmount);
        }
    }

    products.forEach(p => {
        if (productStockUpdates.has(p.id)) {
            const newBatches = productStockUpdates.get(p.id)!;
            p.batches.push(...newBatches);
            p.stock = p.batches.reduce((sum, batch) => sum + batch.quantity, 0);
        }
    });

    suppliers.forEach(s => {
        if (supplierBalanceUpdates.has(s.id)) {
            s.balance += supplierBalanceUpdates.get(s.id)!;
        }
    });

    return { products, suppliers };
};

const { products: processedInitialProducts, suppliers: processedInitialSuppliers } = processInitialData();

const usePosState = () => {
    const { t } = useTranslation();
    const [isLoading, setIsLoading] = useState(true);
    const [products, setProducts] = useState<Product[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [sales, setSales] = useState<Sale[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [customerPayments, setCustomerPayments] = useState<CustomerPayment[]>([]);
    const [taxRate, setTaxRate] = useState<number>(15);
    const [categories, setCategories] = useState<Category[]>([]);
    const [supplierPayments, setSupplierPayments] = useState<SupplierPayment[]>([]);
    const [showTaxInReceipt, setShowTaxInReceipt] = useState<boolean>(true);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [parkedSales, setParkedSales] = useState<ParkedSale[]>([]);
    const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
    const [storeInfo, setStoreInfo] = useState(initialStoreInfo);
    const [users, setUsers] = useState<User[]>([]);
    const [currentUser, setCurrentUser] = useState<User | null>(() => {
        try {
            const userJson = window.sessionStorage.getItem('pos_current_user');
            return userJson ? JSON.parse(userJson) : null;
        } catch (error) {
            return null;
        }
    });
    const [workSessions, setWorkSessions] = useState<WorkSession[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    // FIX: Add state for purchases.
    const [purchases, setPurchases] = useState<Purchase[]>([]);
    const [supplierReturns, setSupplierReturns] = useState<SupplierReturn[]>([]);


    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                const userCount = await db.users.count();
                if (userCount === 0) {
                    await db.transaction('rw', db.tables, async () => {
                        await db.categories.bulkAdd(initialCategories);
                        await db.products.bulkAdd(processedInitialProducts);
                        await db.customers.bulkAdd(initialCustomers);
                        await db.suppliers.bulkAdd(processedInitialSuppliers);
                        await db.users.bulkAdd(initialUsers);
                        await db.purchases.bulkAdd(initialPurchases);
                        await db.settings.bulkAdd([
                            { key: 'taxRate', value: 15 },
                            { key: 'showTaxInReceipt', value: true },
                            { key: 'storeInfo', value: initialStoreInfo }
                        ]);
                    });
                }
                
                const [
                    dbProducts, dbCategories, dbSales, dbCustomers, dbSuppliers,
                    dbCustomerPayments, dbSupplierPayments, dbAdjustments,
                    dbParkedSales, dbUsers, taxRateSetting, showTaxSetting, storeInfoSetting,
                    dbWorkSessions, dbExpenses, dbPurchases, dbSupplierReturns
                ] = await Promise.all([
                    db.products.orderBy('name').toArray(),
                    db.categories.toArray(),
                    db.sales.orderBy('date').reverse().toArray(),
                    db.customers.orderBy('name').toArray(),
                    db.suppliers.orderBy('name').toArray(),
                    db.customerPayments.orderBy('date').reverse().toArray(),
                    db.supplierPayments.orderBy('date').reverse().toArray(),
                    db.adjustments.orderBy('date').reverse().toArray(),
                    db.parkedSales.orderBy('date').reverse().toArray(),
                    db.users.toArray(),
                    db.settings.get('taxRate'),
                    db.settings.get('showTaxInReceipt'),
                    db.settings.get('storeInfo'),
                    db.workSessions.orderBy('startTime').reverse().toArray(),
                    db.expenses.orderBy('date').reverse().toArray(),
                    db.purchases.orderBy('date').reverse().toArray(),
                    db.supplierReturns.orderBy('date').reverse().toArray(),
                ]);

                // Backward compatibility: ensure batches exist and stock is correct
                dbProducts.forEach(p => {
                    if (!p.batches) p.batches = [];
                    const totalStockFromBatches = p.batches.reduce((sum, batch) => sum + batch.quantity, 0);
                    if (p.stock !== totalStockFromBatches) {
                        p.stock = totalStockFromBatches;
                    }
                    if (!p.sellingMethod) {
                        p.sellingMethod = 'unit'; // Default for old products
                    }
                });

                setProducts(dbProducts);
                setCategories(dbCategories);
                setSales(dbSales);
                setCustomers(dbCustomers);
                setSuppliers(dbSuppliers);
                setCustomerPayments(dbCustomerPayments);
                setSupplierPayments(dbSupplierPayments);
                setAdjustments(dbAdjustments);
                setParkedSales(dbParkedSales);
                setUsers(dbUsers);
                setTaxRate(taxRateSetting?.value ?? 15);
                setShowTaxInReceipt(showTaxSetting?.value ?? true);
                setStoreInfo(storeInfoSetting?.value ?? initialStoreInfo);
                setWorkSessions(dbWorkSessions);
                setExpenses(dbExpenses);
                setPurchases(dbPurchases);
                setSupplierReturns(dbSupplierReturns);

            } catch (error) {
                console.error("Failed to load data from database", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, []);


    const login = useCallback((username, password): boolean => {
        const user = users.find(u => u.username === username && u.password === password);
        if (user) {
            setCurrentUser(user);
            window.sessionStorage.setItem('pos_current_user', JSON.stringify(user));
            return true;
        }
        return false;
    }, [users]);

    const logout = useCallback(() => {
        setCurrentUser(null);
        window.sessionStorage.removeItem('pos_current_user');
    }, []);

    const updateStoreInfo = useCallback(async (newInfo: Partial<typeof storeInfo>) => {
        const updatedInfo = { ...storeInfo, ...newInfo };
        await db.settings.put({ key: 'storeInfo', value: updatedInfo });
        setStoreInfo(updatedInfo);
    }, [storeInfo]);

    useEffect(() => {
        // Low stock notifications
        const lowStockProducts = products.filter(p => p.stock > 0 && p.stock < 10);
        
        // Expiry notifications
        const EXPIRY_THRESHOLD_DAYS = 30;
        const thresholdDate = new Date();
        thresholdDate.setDate(thresholdDate.getDate() + EXPIRY_THRESHOLD_DAYS);
        const today = new Date();
        today.setHours(0,0,0,0);


        const expiringProducts = products.filter(p => 
            p.batches.some(b => b.expiryDate && new Date(b.expiryDate) <= thresholdDate && new Date(b.expiryDate) >= today)
        );

        setNotifications(prevNotifications => {
            const newNotifications: Notification[] = [];
            const existingProductIdsInNotif = new Set(prevNotifications.map(n => n.productId));
    
            lowStockProducts.forEach(p => {
                if (!existingProductIdsInNotif.has(p.id)) {
                    newNotifications.push({
                        id: `notif_low_${p.id}_${Date.now()}`,
                        productId: p.id,
                        messageKey: 'notifLowStock',
                        messageArgs: [p.name, Math.floor(p.stock)],
                        type: 'low_stock',
                        read: false,
                    });
                }
            });

            expiringProducts.forEach(p => {
                if (!existingProductIdsInNotif.has(p.id)) {
                    newNotifications.push({
                        id: `notif_exp_${p.id}_${Date.now()}`,
                        productId: p.id,
                        messageKey: 'notifExpiry',
                        messageArgs: [p.name],
                        type: 'expiry',
                        read: false,
                    });
                }
            });
    
            const relevantProductIds = new Set([...lowStockProducts.map(p => p.id), ...expiringProducts.map(p => p.id)]);
            const stillRelevantNotifications = prevNotifications.filter(n => relevantProductIds.has(n.productId));
    
            return [...stillRelevantNotifications, ...newNotifications];
        });
    
    }, [products, t]);
    
    const dismissNotification = useCallback((notificationId: string) => {
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
    }, []);

    const updateShowTaxInReceipt = useCallback(async (show: boolean) => {
        await db.settings.put({ key: 'showTaxInReceipt', value: show });
        setShowTaxInReceipt(show);
    }, []);

    const addToCart = useCallback((product: Product, unit: Unit, quantity: number = 1) => {
        setCart(prevCart => {
            const existingItem = prevCart.find(item => item.id === product.id && item.unit.id === unit.id);
            if (existingItem) {
                return prevCart.map(item =>
                    item.id === product.id && item.unit.id === unit.id ? { ...item, quantity: item.quantity + quantity } : item
                );
            }
            return [...prevCart, { id: product.id, name: product.name, quantity: quantity, imageUrl: product.imageUrl, unit, costPrice: unit.costPrice }];
        });
    }, []);

    const updateCartQuantity = useCallback((productId: string, unitId: string, quantity: number) => {
        setCart(prevCart => {
            if (quantity <= 0) {
                return prevCart.filter(item => !(item.id === productId && item.unit.id === unitId));
            }
            return prevCart.map(item =>
                (item.id === productId && item.unit.id === unitId) ? { ...item, quantity } : item
            );
        });
    }, []);

    const removeFromCart = useCallback((productId: string, unitId: string) => {
        setCart(prevCart => prevCart.filter(item => !(item.id === productId && item.unit.id === unitId)));
    }, []);

    const clearCart = useCallback(() => {
        setCart([]);
    }, []);

    const completeSale = useCallback(async (payments: SalePayment[], customerName: string, discount: number, createNewCustomer: boolean): Promise<{ sale: Sale, customer: Customer } | null> => {
        if (cart.length === 0) return null;

        let customerToUse: Customer | undefined = customers.find(c => c.name.trim().toLowerCase() === customerName.trim().toLowerCase());
        let finalCustomerForReceipt: Customer;

        if (!customerToUse) {
            if (createNewCustomer) {
                const newCustomer: Customer = { id: `CUS-${Date.now().toString().slice(-7)}`, balance: 0, name: customerName.trim(), phone: '', email: '', address: '' };
                await db.customers.add(newCustomer);
                setCustomers(prev => [newCustomer, ...prev].sort((a,b) => a.name.localeCompare(b.name)));
                customerToUse = newCustomer;
                finalCustomerForReceipt = newCustomer;
            } else {
                customerToUse = customers.find(c => c.id === 'c1');
                if (!customerToUse) {
                    console.error("Cash customer (c1) not found!");
                    return null;
                }
                finalCustomerForReceipt = { ...customerToUse, name: customerName };
            }
        } else {
            finalCustomerForReceipt = customerToUse;
        }
        
        const customerIdToUse = customerToUse.id;
        const customerNameToUse = createNewCustomer || customerToUse.id !== 'c1' ? customerToUse.name : customerName;

        const subtotal = cart.reduce((acc, item) => acc + item.unit.price * item.quantity, 0);
        const totalDiscount = discount;
        const subtotalAfterDiscount = subtotal - totalDiscount;
        const tax = subtotalAfterDiscount * (taxRate / 100);
        const total = subtotalAfterDiscount + tax;
        const totalCost = cart.reduce((acc, item) => acc + item.costPrice * item.quantity, 0);

        const amountPaid = payments.reduce((sum, p) => p.method !== 'deferred' ? sum + p.amount : sum, 0);
        const amountDue = total - amountPaid;

        if (amountDue > 0 && customerIdToUse !== 'c1') {
            const updatedBalance = customerToUse.balance + amountDue;
            await db.customers.update(customerIdToUse, { balance: updatedBalance });
            setCustomers(prevCustomers => prevCustomers.map(c => c.id === customerIdToUse ? {...c, balance: updatedBalance} : c));
            finalCustomerForReceipt = { ...finalCustomerForReceipt, balance: updatedBalance };
        }

        const newSale: Sale = {
            id: `INV-${Date.now().toString().slice(-7)}`, items: cart, subtotal, tax, totalDiscount, total, taxRate,
            payments, date: new Date().toISOString(), customerId: customerIdToUse, customerName: customerNameToUse, totalCost,
        };
        
        await db.sales.add(newSale);
        setSales(prevSales => [newSale, ...prevSales]);

        // FEFO Stock Deduction Logic
        const updatedProducts = new Map<string, Product>();

        for (const item of cart) {
            const product = updatedProducts.get(item.id) || await db.products.get(item.id);
            if (!product) continue;

            let quantityToDeduct = item.quantity * item.unit.factor;

            const sortedBatches = [...product.batches].sort((a, b) => {
                if (!a.expiryDate && !b.expiryDate) return 0;
                if (!a.expiryDate) return 1;
                if (!b.expiryDate) return -1;
                return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
            });

            const remainingBatches: Batch[] = [];
            for (const batch of sortedBatches) {
                if (quantityToDeduct <= 0) {
                    remainingBatches.push(batch);
                    continue;
                }
                if (batch.quantity > quantityToDeduct) {
                    batch.quantity -= quantityToDeduct;
                    quantityToDeduct = 0;
                    remainingBatches.push(batch);
                } else {
                    quantityToDeduct -= batch.quantity;
                }
            }
            product.batches = remainingBatches;
            product.stock = product.batches.reduce((sum, b) => sum + b.quantity, 0);
            
            await db.products.put(product);
            updatedProducts.set(product.id, product);
        }

        setProducts(prevProducts => prevProducts.map(p => updatedProducts.get(p.id) || p));

        clearCart();
        return { sale: newSale, customer: finalCustomerForReceipt };
    }, [cart, clearCart, customers, taxRate, t]);
    
    const addProduct = useCallback(async (product: Omit<Product, 'id' | 'batches'> & { expiryDate?: string }) => {
        const { expiryDate, ...productData } = product;
        
        const newProduct: Product = {
            id: `PROD-${Date.now().toString().slice(-7)}`, 
            ...productData,
            sellingMethod: productData.sellingMethod || 'unit',
            units: productData.units.map((u, index) => ({...u, id: `u_${Date.now()}_${index}`})),
            batches: [],
        };

        if (!newProduct.sku || newProduct.sku.trim() === '') {
            newProduct.sku = `SKU${Math.floor(100000 + Math.random() * 900000)}`;
        }

        if (newProduct.stock > 0) {
            newProduct.batches.push({
                id: `batch_initial_${newProduct.id}`,
                quantity: newProduct.stock,
                expiryDate: expiryDate
            });
        }

        if (!newProduct.imageUrl) newProduct.imageUrl = `https://via.placeholder.com/200x200.png?text=${encodeURIComponent(newProduct.name)}`;
        
        await db.products.add(newProduct);
        setProducts(prev => [newProduct, ...prev]);
    }, []);
    
    const updateProduct = useCallback(async (updatedProduct: Product) => {
        if (!updatedProduct.imageUrl) updatedProduct.imageUrl = `https://via.placeholder.com/200x200.png?text=${encodeURIComponent(updatedProduct.name)}`;
        updatedProduct.units = updatedProduct.units.map((u, index) => ({...u, id: u.id || `u_${updatedProduct.id}_${index}`}));
        if (!updatedProduct.sellingMethod) updatedProduct.sellingMethod = 'unit';

        await db.products.put(updatedProduct);
        setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
    }, []);

    const deleteProduct = useCallback(async (productId: string) => {
        await db.products.delete(productId);
        setProducts(prev => prev.filter(p => p.id !== productId));
    }, []);

    const addCustomer = useCallback(async (customer: Omit<Customer, 'id' | 'balance'>) => {
        const newCustomer: Customer = { id: `CUS-${Date.now().toString().slice(-7)}`, balance: 0, ...customer };
        await db.customers.add(newCustomer);
        setCustomers(prev => [newCustomer, ...prev]);
    }, []);

    const updateCustomer = useCallback(async (updatedCustomer: Customer) => {
        await db.customers.put(updatedCustomer);
        setCustomers(prev => prev.map(c => c.id === updatedCustomer.id ? updatedCustomer : c));
    }, []);

    const deleteCustomer = useCallback(async (customerId: string) => {
        await db.customers.delete(customerId);
        setCustomers(prev => prev.filter(c => c.id !== customerId));
    }, []);

    const addSupplier = useCallback(async (supplier: Omit<Supplier, 'id' | 'balance'>) => {
        const newSupplier: Supplier = { id: `SUP-${Date.now().toString().slice(-7)}`, balance: 0, ...supplier };
        await db.suppliers.add(newSupplier);
        setSuppliers(prev => [newSupplier, ...prev]);
    }, []);
    
    const updateSupplier = useCallback(async (updatedSupplier: Supplier) => {
        await db.suppliers.put(updatedSupplier);
        setSuppliers(prev => prev.map(s => s.id === updatedSupplier.id ? updatedSupplier : s));
    }, []);

    const deleteSupplier = useCallback(async (supplierId: string) => {
        await db.suppliers.delete(supplierId);
        setSuppliers(prev => prev.filter(s => s.id !== supplierId));
    }, []);

    const updateTaxRate = useCallback(async (newRate: number) => {
        if (newRate >= 0) {
            await db.settings.put({ key: 'taxRate', value: newRate });
            setTaxRate(newRate);
        }
    }, []);

    const addCustomerPayment = useCallback(async (payment: Omit<CustomerPayment, 'id' | 'date'>) => {
        const newPayment: CustomerPayment = { id: `PAY-C-${Date.now().toString().slice(-7)}`, date: new Date().toISOString(), ...payment };
        await db.customerPayments.add(newPayment);
        setCustomerPayments(prev => [newPayment, ...prev]);

        await db.customers.where('id').equals(payment.customerId).modify(c => { c.balance -= payment.amount; });
        setCustomers(prev => prev.map(c => c.id === payment.customerId ? { ...c, balance: c.balance - payment.amount } : c));
    }, []);

    const addCategory = useCallback(async (category: Omit<Category, 'id'>) => {
        const newCategory: Category = {
            id: `CAT-${Date.now().toString().slice(-7)}`,
            ...category,
            imageUrl: category.imageUrl || `https://via.placeholder.com/200x200.png?text=${encodeURIComponent(category.name)}`
        };
        await db.categories.add(newCategory);
        setCategories(prev => [newCategory, ...prev]);
    }, []);

    const updateCategory = useCallback(async (updatedCategory: Category) => {
        if (!updatedCategory.imageUrl) {
            updatedCategory.imageUrl = `https://via.placeholder.com/200x200.png?text=${encodeURIComponent(updatedCategory.name)}`;
        }
        await db.categories.put(updatedCategory);
        setCategories(prev => prev.map(c => c.id === updatedCategory.id ? updatedCategory : c));
    }, []);

    const deleteCategory = useCallback(async (categoryId: string): Promise<boolean> => {
        const descendantIds: string[] = [];
        const queue = [categoryId];
        while (queue.length > 0) {
            const currentId = queue.shift()!;
            descendantIds.push(currentId);
            const children = await db.categories.where('parentId').equals(currentId).toArray();
            children.forEach(child => queue.push(child.id));
        }

        const isCategoryInUse = (await db.products.where('categoryId').anyOf(descendantIds).count()) > 0;
        if (isCategoryInUse) {
            alert(t('categoryInUseError'));
            return false;
        }

        await db.categories.bulkDelete(descendantIds);
        setCategories(prev => prev.filter(c => !descendantIds.includes(c.id)));
        return true;
    }, [t]);

    const updateSale = useCallback(async (saleId: string, updatedItems: CartItem[]) => {
        const originalSale = await db.sales.get(saleId);
        if (!originalSale) return;

        // 1. Calculate stock adjustments for returned items
        const stockAdjustments = new Map<string, number>(); // <productId, quantityChangeInBaseUnit>
        const originalItemsMap = new Map(originalSale.items.map(i => [`${i.id}-${i.unit.id}`, i]));

        originalSale.items.forEach(originalItem => {
            const updatedItem = updatedItems.find(item => item.id === originalItem.id && item.unit.id === originalItem.unit.id);
            const returnedQuantity = originalItem.quantity - (updatedItem?.quantity || 0);
            
            if (returnedQuantity > 0) {
                const quantityInBaseUnit = returnedQuantity * originalItem.unit.factor;
                stockAdjustments.set(originalItem.id, (stockAdjustments.get(originalItem.id) || 0) + quantityInBaseUnit);
            }
        });

        const updatedProductsMap = new Map<string, Product>();
        for (const [productId, quantityToAdd] of stockAdjustments.entries()) {
            const product = await db.products.get(productId);
            if (product) {
                product.stock += quantityToAdd;
                product.batches.push({
                    id: `batch_return_${saleId}_${Date.now()}`,
                    quantity: quantityToAdd,
                });
                await db.products.put(product);
                updatedProductsMap.set(productId, product);
            }
        }
        
        // 2. Calculate financial adjustments
        const newSubtotal = updatedItems.reduce((acc, item) => acc + item.unit.price * item.quantity, 0);
        const newTotalCost = updatedItems.reduce((acc, item) => acc + item.costPrice * item.quantity, 0);
        const subtotalAfterDiscount = newSubtotal - originalSale.totalDiscount;
        const newTax = subtotalAfterDiscount * (originalSale.taxRate / 100);
        const newTotal = subtotalAfterDiscount + newTax;
        
        const refundAmount = originalSale.total - newTotal;
        
        // 3. Update customer balance (credit them for the return)
        if (originalSale.customerId && originalSale.customerId !== 'c1' && refundAmount > 0) {
            await db.customers.where('id').equals(originalSale.customerId).modify(c => {
                c.balance -= refundAmount;
            });
            setCustomers(prev => prev.map(c => 
                c.id === originalSale.customerId ? { ...c, balance: c.balance - refundAmount } : c
            ));
        }

        // 4. Update the sale record
        const updatedSale = { ...originalSale, items: updatedItems, subtotal: newSubtotal, tax: newTax, total: newTotal, totalCost: newTotalCost };
        await db.sales.put(updatedSale);
        
        // 5. Update state
        setSales(prev => prev.map(s => s.id === saleId ? updatedSale : s));
        setProducts(prev => prev.map(p => updatedProductsMap.get(p.id) || p));
        
        alert(t('saleUpdatedSuccess'));
    }, [t]);

    const addSupplierPayment = useCallback(async (payment: Omit<SupplierPayment, 'id' | 'date'>) => {
        const newPayment: SupplierPayment = { id: `PAY-S-${Date.now().toString().slice(-7)}`, date: new Date().toISOString(), ...payment };
        await db.supplierPayments.add(newPayment);
        setSupplierPayments(prev => [newPayment, ...prev]);
        
        await db.suppliers.where('id').equals(payment.supplierId).modify(s => { s.balance -= payment.amount; });
        setSuppliers(prev => prev.map(s => s.id === payment.supplierId ? { ...s, balance: s.balance - payment.amount } : s));
    }, []);
    
    const parkSale = useCallback(async (customerId: string, notes?: string) => {
        if (cart.length === 0) return;
        const subtotal = cart.reduce((acc, item) => acc + item.unit.price * item.quantity, 0);
        const tax = subtotal * (taxRate / 100);
        const total = subtotal + tax;
        
        const newParkedSale: ParkedSale = { id: `PARK-${Date.now().toString().slice(-7)}`, date: new Date().toISOString(), items: cart, customerId, notes, total };
        await db.parkedSales.add(newParkedSale);
        setParkedSales(prev => [newParkedSale, ...prev]);
        clearCart();
    }, [cart, taxRate, clearCart]);

    const retrieveSale = useCallback(async (saleId: string): Promise<string | null> => {
        const saleToRetrieve = await db.parkedSales.get(saleId);
        if (saleToRetrieve) {
            const customer = await db.customers.get(saleToRetrieve.customerId);
            setCart(saleToRetrieve.items);
            await db.parkedSales.delete(saleId);
            setParkedSales(prev => prev.filter(s => s.id !== saleId));
            return customer ? customer.name : 'زبون نقدي';
        }
        return null;
    }, []);
    
    const deleteParkedSale = useCallback(async (saleId: string) => {
        await db.parkedSales.delete(saleId);
        setParkedSales(prev => prev.filter(s => s.id !== saleId));
    }, []);

    const addAdjustment = useCallback(async (adjustment: Omit<Adjustment, 'id' | 'date'>) => {
        const newAdjustment: Adjustment = { id: `ADJ-${Date.now().toString().slice(-7)}`, date: new Date().toISOString(), ...adjustment };
        await db.adjustments.add(newAdjustment);
        setAdjustments(prev => [newAdjustment, ...prev]);
        
        const updatedProductsMap = new Map<string, Product>();

        for (const item of adjustment.items) {
            const product = updatedProductsMap.get(item.productId) || await db.products.get(item.productId);
            if (!product) continue;
            
            const quantityInBase = item.quantityChange * item.unitFactor;
            product.stock += quantityInBase;
            
            if (quantityInBase > 0) {
                 product.batches.push({
                    id: `batch_adj_${Date.now()}`,
                    quantity: quantityInBase,
                 });
            } else {
                // Simplified deduction: remove from latest batches first. For accurate expiry, FEFO would be needed here too.
                let quantityToDeduct = Math.abs(quantityInBase);
                product.batches.reverse(); // LIFO for adjustments
                product.batches = product.batches.filter(b => {
                    if (quantityToDeduct <= 0) return true;
                    if (b.quantity > quantityToDeduct) {
                        b.quantity -= quantityToDeduct;
                        quantityToDeduct = 0;
                        return true;
                    } else {
                        quantityToDeduct -= b.quantity;
                        return false;
                    }
                }).reverse();
            }

            await db.products.put(product);
            updatedProductsMap.set(product.id, product);
        }
        setProducts(prev => prev.map(p => updatedProductsMap.get(p.id) || p));
    }, []);

    const addPurchase = useCallback(async (purchaseData: Omit<Purchase, 'id' | 'date' | 'supplierName'>) => {
        const supplier = suppliers.find(s => s.id === purchaseData.supplierId);
        if (!supplier) {
            alert(t("supplierNotFound"));
            return;
        }

        const newPurchase: Purchase = {
            id: `PUR-${Date.now().toString().slice(-7)}`,
            date: new Date().toISOString(),
            supplierName: supplier.name,
            ...purchaseData,
        };
        
        const updatedProductsMap = new Map<string, Product>();

        try {
            await db.transaction('rw', db.purchases, db.products, db.suppliers, async () => {
                await db.purchases.add(newPurchase);

                for (const item of newPurchase.items) {
                    const product = await db.products.get(item.productId);
                    if (!product) continue;

                    const newBatch: Batch = {
                        id: `batch_${newPurchase.id}_${item.productId}`,
                        quantity: item.quantity * item.unitFactor,
                        expiryDate: item.expiryDate,
                        purchaseId: newPurchase.id,
                    };
                    product.batches.push(newBatch);
                    product.stock = product.batches.reduce((sum, b) => sum + b.quantity, 0);
                    
                    await db.products.put(product);
                    updatedProductsMap.set(product.id, product);
                }
                
                const amountDue = newPurchase.total - newPurchase.amountPaid;
                if (amountDue > 0) {
                    await db.suppliers.where('id').equals(newPurchase.supplierId).modify(s => {
                        s.balance += amountDue;
                    });
                }
            });
            
            setPurchases(prev => [newPurchase, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            setProducts(prev => prev.map(p => updatedProductsMap.get(p.id) || p));
            
            const amountDue = newPurchase.total - newPurchase.amountPaid;
            if (amountDue > 0) {
                setSuppliers(prev => prev.map(s => s.id === newPurchase.supplierId ? { ...s, balance: s.balance + amountDue } : s));
            }
        } catch(error) {
            console.error("Failed to add purchase:", error);
            alert(t("addPurchaseError"));
        }
    }, [suppliers, t]);

    const deletePurchase = useCallback(async (purchaseId: string) => {
        const purchaseToDelete = await db.purchases.get(purchaseId);
        if (!purchaseToDelete) {
            alert(t('purchaseNotFound'));
            return;
        }

        const updatedProductsMap = new Map<string, Product>();

        try {
            await db.transaction('rw', db.purchases, db.products, db.suppliers, async () => {
                // Revert stock by removing batches associated with this purchase
                for (const item of purchaseToDelete.items) {
                    const product = await db.products.get(item.productId);
                    if (!product) continue;
                    
                    const originalBatchCount = product.batches.length;
                    product.batches = product.batches.filter(b => b.purchaseId !== purchaseId);
                    
                    if (product.batches.length < originalBatchCount) {
                       product.stock = product.batches.reduce((sum, b) => sum + b.quantity, 0);
                       await db.products.put(product);
                       updatedProductsMap.set(product.id, product);
                    }
                }
                
                // Revert supplier balance
                const amountDue = purchaseToDelete.total - purchaseToDelete.amountPaid;
                if (amountDue > 0) {
                    await db.suppliers.where('id').equals(purchaseToDelete.supplierId).modify(s => {
                        s.balance -= amountDue;
                    });
                }

                // Delete purchase
                await db.purchases.delete(purchaseId);
            });

            // Update state
            setPurchases(prev => prev.filter(p => p.id !== purchaseId));
            setProducts(prev => prev.map(p => updatedProductsMap.get(p.id) || p));

            const amountDue = purchaseToDelete.total - purchaseToDelete.amountPaid;
            if (amountDue > 0) {
                setSuppliers(prev => prev.map(s => s.id === purchaseToDelete.supplierId ? { ...s, balance: s.balance - amountDue } : s));
            }

        } catch(error) {
            console.error("Failed to delete purchase:", error);
            alert(t("deletePurchaseError"));
        }
    }, [t]);

    const addSupplierReturn = useCallback(async (returnData: Omit<SupplierReturn, 'id' | 'date' | 'supplierName'>) => {
        const supplier = suppliers.find(s => s.id === returnData.supplierId);
        if (!supplier) {
            alert(t("supplierNotFound"));
            return;
        }

        const newReturn: SupplierReturn = {
            id: `SRET-${Date.now().toString().slice(-7)}`,
            date: new Date().toISOString(),
            supplierName: supplier.name,
            ...returnData,
        };

        const updatedProductsMap = new Map<string, Product>();

        try {
            await db.transaction('rw', db.supplierReturns, db.products, db.suppliers, async () => {
                await db.supplierReturns.add(newReturn);

                for (const item of newReturn.items) {
                    const product = await db.products.get(item.productId);
                    if (!product) continue;

                    let quantityToDeduct = item.quantity * item.unitFactor;
                    product.stock -= quantityToDeduct;

                    // LIFO stock deduction for returns
                    product.batches.reverse();
                    const remainingBatches: Batch[] = [];
                    for (const batch of product.batches) {
                        if (quantityToDeduct <= 0) {
                            remainingBatches.push(batch);
                            continue;
                        }
                        if (batch.quantity > quantityToDeduct) {
                            batch.quantity -= quantityToDeduct;
                            quantityToDeduct = 0;
                            remainingBatches.push(batch);
                        } else {
                            quantityToDeduct -= batch.quantity;
                        }
                    }
                    product.batches = remainingBatches.reverse();
                    
                    await db.products.put(product);
                    updatedProductsMap.set(product.id, product);
                }
                
                // Update supplier balance
                await db.suppliers.where('id').equals(newReturn.supplierId).modify(s => {
                    s.balance -= newReturn.total;
                });
            });
            
            // Update state
            setSupplierReturns(prev => [newReturn, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            setProducts(prev => prev.map(p => updatedProductsMap.get(p.id) || p));
            setSuppliers(prev => prev.map(s => s.id === newReturn.supplierId ? { ...s, balance: s.balance - newReturn.total } : s));
        } catch(error) {
            console.error("Failed to add supplier return:", error);
            alert(t("addSupplierReturnError"));
        }
    }, [suppliers, t]);

    const deleteSupplierReturn = useCallback(async (returnId: string) => {
        const returnToDelete = await db.supplierReturns.get(returnId);
        if (!returnToDelete) {
            alert(t('supplierReturnNotFound'));
            return;
        }
    
        const updatedProductsMap = new Map<string, Product>();
    
        try {
            await db.transaction('rw', db.supplierReturns, db.products, db.suppliers, async () => {
                // Revert stock changes by adding stock back
                for (const item of returnToDelete.items) {
                    const product = await db.products.get(item.productId);
                    if (product) {
                        const quantityToAdd = item.quantity * item.unitFactor;
                        product.stock += quantityToAdd;
                        product.batches.push({
                            id: `batch_del_sret_${returnId}_${Date.now()}`,
                            quantity: quantityToAdd,
                        });
                        await db.products.put(product);
                        updatedProductsMap.set(product.id, product);
                    }
                }
                
                // Revert supplier balance
                await db.suppliers.where('id').equals(returnToDelete.supplierId).modify(s => {
                    s.balance += returnToDelete.total;
                });
                
                // Delete the return
                await db.supplierReturns.delete(returnId);
            });
            
            // Update state
            setSupplierReturns(prev => prev.filter(r => r.id !== returnId));
            setProducts(prev => prev.map(p => updatedProductsMap.get(p.id) || p));
            setSuppliers(prev => prev.map(s => s.id === returnToDelete.supplierId ? { ...s, balance: s.balance + returnToDelete.total } : s));
        } catch (error) {
            console.error("Failed to delete supplier return:", error);
            alert(t("deleteSupplierReturnError"));
        }
    }, [t]);

    const importData = useCallback(async (data: any) => {
        try {
            if (data.products && data.sales && data.customers) {
                await db.transaction('rw', db.tables, async () => {
                    await Promise.all(db.tables.map(table => table.clear()));
                    for (const tableName of Object.keys(data)) {
                        if (db.table(tableName)) {
                            await db.table(tableName).bulkAdd(data[tableName]);
                        }
                    }
                });
                alert(t('importSuccess'));
                window.location.reload(); 
            } else {
                alert(t('importInvalidFile'));
            }
        } catch (error) {
            alert(t('importProcessError'));
            console.error("Import failed", error);
        }
    }, [t]);

    const addUser = useCallback(async (user: Omit<User, 'id'>) => {
        const newUser: User = { id: `USR-${Date.now().toString().slice(-7)}`, ...user };
        await db.users.add(newUser);
        setUsers(prev => [newUser, ...prev]);
    }, []);

    const updateUser = useCallback(async (updatedUser: User) => {
        await db.users.put(updatedUser);
        setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
        if (currentUser?.id === updatedUser.id) {
            setCurrentUser(updatedUser);
            window.sessionStorage.setItem('pos_current_user', JSON.stringify(updatedUser));
        }
    }, [currentUser]);

    const deleteUser = useCallback(async (userId: string) => {
        if (currentUser?.id === userId) {
            alert(t('cannotDeleteCurrentUser'));
            return;
        }
        await db.users.delete(userId);
        setUsers(prev => prev.filter(u => u.id !== userId));
    }, [currentUser, t]);

    const startSession = useCallback(async (openingFloat: number) => {
        if (!currentUser) {
            alert(t('noCurrentUser'));
            return;
        }
        if (workSessions.some(s => s.status === 'active')) {
            alert(t('sessionAlreadyActive'));
            return;
        }
        const newSession: WorkSession = {
            id: `SES-${Date.now().toString().slice(-7)}`,
            startTime: new Date().toISOString(),
            endTime: null,
            openingFloat,
            status: 'active',
            userId: currentUser.id,
            userName: currentUser.username,
        };
        await db.workSessions.add(newSession);
        setWorkSessions(prev => [newSession, ...prev]);
    }, [currentUser, workSessions, t]);

    const addExpense = useCallback(async (expenseData: { amount: number; reason: string }) => {
        const activeSession = workSessions.find(s => s.status === 'active');
        if (!activeSession) {
            alert(t('mustStartSessionFirst'));
            return;
        }
        const newExpense: Expense = {
            id: `EXP-${Date.now().toString().slice(-7)}`,
            sessionId: activeSession.id,
            date: new Date().toISOString(),
            ...expenseData,
        };
        await db.expenses.add(newExpense);
        setExpenses(prev => [newExpense, ...prev]);
    }, [workSessions, t]);

    const endSession = useCallback(async (closingFloat: number) => {
        const activeSession = workSessions.find(s => s.status === 'active');
        if (!activeSession) {
            alert(t('noActiveSessionToEnd'));
            return;
        }

        const sessionSales = await db.sales.where('date').between(activeSession.startTime, new Date().toISOString()).toArray();
        const sessionExpenses = await db.expenses.where('sessionId').equals(activeSession.id).toArray();

        const totalCashSales = sessionSales.reduce((sum, sale) => {
            const cashPayment = sale.payments.find(p => p.method === 'cash');
            return sum + (cashPayment?.amount || 0);
        }, 0);
        
        const totalCardSales = sessionSales.reduce((sum, sale) => {
             const cardPayments = sale.payments.filter(p => p.method === 'card');
            return sum + cardPayments.reduce((s, p) => s + p.amount, 0);
        }, 0);
        
        const totalDeferredSales = sessionSales.reduce((sum, sale) => {
            const deferredPayment = sale.payments.find(p => p.method === 'deferred');
            return sum + (deferredPayment?.amount || 0);
        }, 0);
        
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
            difference,
        };

        await db.workSessions.put(updatedSession);
        setWorkSessions(prev => prev.map(s => s.id === updatedSession.id ? updatedSession : s));
    }, [workSessions, t]);


    return {
        isLoading,
        products, cart, sales, customers, suppliers, taxRate, customerPayments, categories,
        supplierPayments, showTaxInReceipt, notifications, storeInfo, parkedSales,
        adjustments, users, currentUser, workSessions, expenses,
        purchases, supplierReturns,
        login, logout, addUser, updateUser, deleteUser, dismissNotification,
        addToCart, updateCartQuantity, removeFromCart, clearCart, completeSale,
        addProduct, updateProduct, deleteProduct, addCustomer, updateCustomer, deleteCustomer,
        addSupplier, updateSupplier, deleteSupplier, updateTaxRate, addCustomerPayment,
        addCategory, updateCategory, deleteCategory, updateSale, addSupplierPayment,
        updateShowTaxInReceipt, updateStoreInfo, parkSale, retrieveSale, deleteParkedSale,
        addAdjustment, addPurchase, deletePurchase, importData, startSession, addExpense, endSession,
        addSupplierReturn, deleteSupplierReturn,
    };
};

export default usePosState;