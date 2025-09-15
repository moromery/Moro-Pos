import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Product, CartItem, Sale, Customer, Category, Unit, ParkedSale, SalePayment, PaymentMethod } from '../types';
import usePosState from '../hooks/usePosState';
import Receipt from '../components/Receipt';
import PaymentModal from '../components/PaymentModal';
import { useTranslation } from '../contexts/LanguageContext';

type PosProps = ReturnType<typeof usePosState>;
type DisplayItem = Product | (Category & { isCategory: true });

const WeightEntryModal: React.FC<{
    product: Product;
    onConfirm: (product: Product, weight: number) => void;
    onClose: () => void;
}> = ({ product, onConfirm, onClose }) => {
    const { t, language, currency } = useTranslation();
    const [weight, setWeight] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setTimeout(() => inputRef.current?.focus(), 100);
    }, []);

    const baseUnit = product.units.find(u => u.factor === 1) || product.units[0];
    const price = (parseFloat(weight) || 0) * baseUnit.price;
    const formatCurrency = (amount: number) => new Intl.NumberFormat(language === 'ar' ? 'ar-EG' : 'en-US', { style: 'currency', currency: currency }).format(amount);


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const weightValue = parseFloat(weight);
        if (weightValue > 0) {
            onConfirm(product, weightValue);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50" onClick={onClose}>
            <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold mb-2">{t('weightEntryTitle', product.name)}</h2>
                <p className="text-gray-600 mb-4">{t('pricePerUnit', baseUnit.name, formatCurrency(baseUnit.price))}</p>
                <input
                    ref={inputRef}
                    type="number"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder={t('weightPlaceholder', baseUnit.name)}
                    className="w-full p-4 border-2 rounded-lg text-center text-3xl font-bold"
                    step="0.001"
                    min="0"
                    required
                />
                <div className="bg-blue-100 text-blue-800 text-center p-4 rounded-xl mt-4">
                    <p className="font-semibold">{t('calculatedPrice')}</p>
                    <p className="text-3xl font-bold">{formatCurrency(price)}</p>
                </div>
                <div className="flex justify-end gap-4 mt-6">
                    <button type="button" onClick={onClose} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300">{t('cancel')}</button>
                    <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">{t('add')}</button>
                </div>
            </form>
        </div>
    );
};


const CustomerConfirmationModal: React.FC<{
    isOpen: boolean;
    customerName: string;
    onConfirm: (create: boolean) => void;
    onCancel: () => void;
    isDeferredSale: boolean;
}> = ({ isOpen, customerName, onConfirm, onCancel, isDeferredSale }) => {
    const { t } = useTranslation();
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-2xl font-bold mb-4">{t('unregisteredCustomerTitle')}</h2>
                <p className="text-gray-600 mb-6">
                    {t('unregisteredCustomerBody', customerName)}
                    {isDeferredSale && <strong className="block text-red-600 mt-2">{t('unregisteredCustomerDeferredNote')}</strong>}
                </p>
                <div className="flex justify-end gap-4">
                    <button onClick={() => onConfirm(false)} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold disabled:opacity-50 disabled:cursor-not-allowed" disabled={isDeferredSale}>
                        {isDeferredSale ? t('cancelSale') : t('continueSaleOnly')}
                    </button>
                    <button onClick={() => onConfirm(true)} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold">
                        {t('addAndContinue')}
                    </button>
                </div>
            </div>
        </div>
    );
};

const UnitSelectionModal: React.FC<{
    product: Product;
    onSelect: (product: Product, unit: Unit) => void;
    onClose: () => void;
}> = ({ product, onSelect, onClose }) => {
    const { t, language, currency } = useTranslation();
    const formatCurrency = (amount: number) => new Intl.NumberFormat(language === 'ar' ? 'ar-EG' : 'en-US', { style: 'currency', currency: currency }).format(amount);
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50" onClick={onClose}>
            <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold mb-4">{t('selectUnitFor', product.name)}</h2>
                <div className="grid grid-cols-2 gap-4">
                    {product.units.map(unit => (
                        <button
                            key={unit.id}
                            onClick={() => onSelect(product, unit)}
                            className="p-4 border rounded-lg text-center hover:bg-blue-50 hover:border-blue-500 transition-colors"
                        >
                            <p className="font-bold text-lg">{unit.name}</p>
                            <p className="text-blue-600">{formatCurrency(unit.price)}</p>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

const ParkedSalesModal: React.FC<{
    parkedSales: ParkedSale[];
    onRetrieve: (saleId: string) => void;
    onDelete: (saleId: string) => void;
    onClose: () => void;
}> = ({ parkedSales, onRetrieve, onDelete, onClose }) => {
    const { t, language, currency } = useTranslation();
    const formatCurrency = (amount: number) => new Intl.NumberFormat(language === 'ar' ? 'ar-EG' : 'en-US', { style: 'currency', currency: currency }).format(amount);
    const formatDate = (date: string) => new Date(date).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US');

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50" onClick={onClose}>
            <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-2xl" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-bold mb-4">{t('parkedSalesTitle')}</h2>
                <div className="max-h-96 overflow-y-auto">
                    {parkedSales.length > 0 ? (
                        <ul className="space-y-3">
                            {parkedSales.map(sale => (
                                <li key={sale.id} className="p-3 bg-gray-50 rounded-lg flex justify-between items-center">
                                    <div>
                                        <p className="font-semibold">{t('parkedSaleOnDate', formatDate(sale.date))}</p>
                                        <p className="text-sm text-gray-600">{t('parkedSaleDetails', sale.items.length, formatCurrency(sale.total))}</p>
                                    </div>
                                    <div className="space-x-2 space-x-reverse">
                                        <button onClick={() => onRetrieve(sale.id)} className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600">{t('retrieve')}</button>
                                        <button onClick={() => onDelete(sale.id)} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">{t('delete')}</button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-center text-gray-500 py-8">{t('noParkedSales')}</p>
                    )}
                </div>
            </div>
        </div>
    );
};


const POS: React.FC<PosProps> = (props) => {
  const { products, cart, customers, categories, taxRate, addToCart, updateCartQuantity, removeFromCart, clearCart, completeSale, showTaxInReceipt, storeInfo, parkedSales, parkSale, retrieveSale, deleteParkedSale, workSessions, currentUser } = props;
  const { t, language, currency } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [barcode, setBarcode] = useState('');
  const [categoryPath, setCategoryPath] = useState<Category[]>([]);
  const [lastSaleInfo, setLastSaleInfo] = useState<{ sale: Sale; customer: Customer } | null>(null);
  const [customerName, setCustomerName] = useState<string>(t('cashCustomer'));
  const [unitSelectionProduct, setUnitSelectionProduct] = useState<Product | null>(null);
  const [weightEntryProduct, setWeightEntryProduct] = useState<Product | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isParkedSalesModalOpen, setIsParkedSalesModalOpen] = useState(false);
  const [discount, setDiscount] = useState<number>(0);
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const [customerConfirmation, setCustomerConfirmation] = useState<{ show: boolean, payments: SalePayment[] } | null>(null);

  useEffect(() => {
    if (customerName === 'زبون نقدي' || customerName === 'Cash Customer') {
        setCustomerName(t('cashCustomer'));
    }
  }, [t, customerName]);

  const activeSession = useMemo(() => workSessions.find(s => s.status === 'active'), [workSessions]);

  useEffect(() => {
      barcodeInputRef.current?.focus();
  }, []);

  const filterCategories = useMemo(() => [{ id: 'all', name: t('allCategories'), parentId: null }, ...categories.filter(c => c.parentId === null)], [categories, t]);

  const displayItems = useMemo((): DisplayItem[] => {
    if (searchTerm) {
        return products.filter(p => 
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }

    const currentParentId = categoryPath.length > 0 ? categoryPath[categoryPath.length - 1].id : null;

    const subcategories = categories
        .filter(c => c.parentId === currentParentId)
        .map(c => ({ ...c, isCategory: true as const }));

    if (subcategories.length > 0) {
        return subcategories;
    }

    const productsInCategory = products.filter(p => p.categoryId === currentParentId);
    return productsInCategory;
  }, [categoryPath, categories, products, searchTerm]);


  const subtotal = useMemo(() => cart.reduce((acc, item) => acc + item.unit.price * item.quantity, 0), [cart]);
  const subtotalAfterDiscount = subtotal - discount;
  const tax = subtotalAfterDiscount * (taxRate / 100);
  const total = subtotalAfterDiscount + tax;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(language === 'ar' ? 'ar-EG' : 'en-US', { style: 'currency', currency: currency }).format(amount);
  };
  
  const isExistingCustomer = useMemo(() => customers.some(c => c.name.trim().toLowerCase() === customerName.trim().toLowerCase()), [customers, customerName]);

  const proceedWithSale = async (payments: SalePayment[], createNewCustomer: boolean) => {
    try {
        const result = await completeSale(payments, customerName, discount, createNewCustomer);
        setLastSaleInfo(result);
        setDiscount(0);
        setCustomerName(t('cashCustomer'));
    } catch (error: any) {
        console.error("Failed to complete sale:", error);
        alert(t('saleFailedWithReason', error.message || t('saleCompletionError')));
    } finally {
        setIsPaymentModalOpen(false);
        setCustomerConfirmation(null);
    }
  };

  const handleSaleAttempt = (payments: SalePayment[]) => {
    if (cart.length === 0) return;
    
    const isNewCustomer = !isExistingCustomer && customerName.trim().toLowerCase() !== t('cashCustomer').toLowerCase();

    if (isNewCustomer) {
        setCustomerConfirmation({ show: true, payments });
    } else {
        proceedWithSale(payments, false); // false, because customer exists
    }
  };
  
  const handleCustomerConfirmation = (create: boolean) => {
    if (!customerConfirmation) return;

    const { payments } = customerConfirmation;
    const isDeferred = payments.some(p => p.method === 'deferred');
    
    if (isDeferred && !create) {
        alert(t('deferredSaleNoCreateError'));
    } else {
        proceedWithSale(payments, create);
    }

    setCustomerConfirmation(null);
  };
  
  const handlePaymentModalCompletion = (payments: SalePayment[]) => {
    handleSaleAttempt(payments);
  };
  
  const handleDeferredSale = () => {
    if (cart.length === 0 || customerName.trim() === t('cashCustomer')) {
        alert(t('deferredSaleCashCustomerError'));
        return;
    }
    const deferredPayments: SalePayment[] = [{ method: 'deferred', amount: total }];
    handleSaleAttempt(deferredPayments);
  };


  const handleParkSale = () => {
      const customer = customers.find(c => c.name === customerName) || { id: 'c1' };
      parkSale(customer.id, t('parkedSaleNote', customerName));
      setDiscount(0);
      setCustomerName(t('cashCustomer'));
  }
  
  const handleRetrieveSale = async (saleId: string) => {
      const retrievedCustomerName = await retrieveSale(saleId);
      if(retrievedCustomerName) {
          setCustomerName(retrievedCustomerName);
      }
      setIsParkedSalesModalOpen(false);
  }

  const handleProductClick = (product: Product) => {
      if (product.sellingMethod === 'weight') {
        setWeightEntryProduct(product);
      } else if (product.units.length === 1) {
        addToCart(product, product.units[0]);
      } else {
        setUnitSelectionProduct(product);
      }
  };
  
  const handleWeightConfirm = (product: Product, weight: number) => {
      const baseUnit = product.units.find(u => u.factor === 1) || product.units[0];
      if (baseUnit) {
          addToCart(product, baseUnit, weight);
      }
      setWeightEntryProduct(null);
  };

  const handleSelectUnit = (product: Product, unit: Unit) => {
    addToCart(product, unit);
    setUnitSelectionProduct(null);
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!barcode) return;
      const product = products.find(p => p.sku === barcode);
      if (product) {
          handleProductClick(product);
      } else {
          alert(t('productNotFound'));
      }
      setBarcode('');
  };

  const handleCategorySelect = (categoryId: string) => {
    if (categoryId === 'all') {
        setCategoryPath([]);
    } else {
        const category = categories.find(c => c.id === categoryId);
        if (category) {
            setCategoryPath([category]);
        }
    }
  };

  const posUI = (
    <div className="h-[calc(100vh-4rem)] flex gap-6">
      <div className="w-2/3 flex flex-col bg-white rounded-xl shadow-md p-6">
        <div className="flex gap-4 mb-4">
            <form onSubmit={handleBarcodeSubmit} className="flex-grow">
                <input
                    ref={barcodeInputRef}
                    type="text"
                    placeholder={t('scanBarcodePlaceholder')}
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
            </form>
            <input
                type="text"
                placeholder={t('searchProductsPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
        </div>
        <div className="flex-1 flex gap-4 overflow-hidden">
            <div className={`w-48 bg-gray-50 p-2 rounded-lg flex-shrink-0 flex flex-col`}>
                <h3 className={`text-lg font-bold text-gray-700 p-2 mb-2 border-b ${language === 'ar' ? 'text-right' : 'text-left'}`}>{t('categories')}</h3>
                <div className={`flex-1 overflow-y-auto space-y-1 ${language === 'ar' ? 'pr-1' : 'pl-1'}`}>
                    {filterCategories.map(category => {
                        const isActive = (categoryPath.length === 0 && category.id === 'all') || (categoryPath.length > 0 && categoryPath[0].id === category.id);
                        return (
                            <button
                              key={category.id}
                              onClick={() => handleCategorySelect(category.id)}
                              className={`w-full px-4 py-3 rounded-lg font-semibold transition-colors text-sm ${language === 'ar' ? 'text-right' : 'text-left'} ${
                                isActive
                                  ? 'bg-blue-600 text-white shadow-md'
                                  : 'bg-white text-gray-700 hover:bg-blue-50 border'
                              }`}
                            >
                              {category.name}
                            </button>
                        )
                    })}
                </div>
            </div>
            
            <div className="flex-1 flex flex-col overflow-y-auto p-2">
                {searchTerm === '' && (
                    <div className="flex items-center gap-2 mb-2 text-sm text-gray-500 flex-wrap">
                        <button onClick={() => setCategoryPath([])} className="hover:underline">{t('home')}</button>
                        {categoryPath.map((cat, index) => (
                            <React.Fragment key={cat.id}>
                                <span>/</span>
                                <button 
                                    onClick={() => setCategoryPath(prev => prev.slice(0, index + 1))}
                                    className="hover:underline font-semibold"
                                >
                                    {cat.name}
                                </button>
                            </React.Fragment>
                        ))}
                    </div>
                )}

                <div className="flex-1 overflow-y-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {displayItems.map(item => {
                    if ('isCategory' in item && item.isCategory) {
                      const { isCategory, ...cat } = item;
                      return (
                        <div
                          key={item.id}
                          onClick={() => setCategoryPath(prev => [...prev, cat])}
                          className="border rounded-lg flex flex-col items-center justify-center text-center cursor-pointer hover:shadow-lg hover:border-blue-500 transition-all duration-200 bg-gray-900 text-white overflow-hidden relative group"
                        >
                            <img src={cat.imageUrl || `https://via.placeholder.com/200x200.png?text=${encodeURIComponent(cat.name)}`} alt={cat.name} className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-75 group-hover:scale-110 transition-all duration-300" />
                            <div className="relative z-10 p-2">
                                <h3 className="font-bold text-lg flex-grow drop-shadow-md">{item.name}</h3>
                            </div>
                        </div>
                      );
                    } else {
                      const product = item as Product;
                      const isOutOfStock = product.stock <= 0;
                      const baseUnit = product.units.find(u => u.factor === 1) || product.units[0];
                      const stockDisplay = product.sellingMethod === 'weight' ? product.stock.toFixed(2) : Math.floor(product.stock);

                      return (
                        <div
                          key={product.id}
                          onClick={() => !isOutOfStock && handleProductClick(product)}
                          className={`border rounded-lg p-3 flex flex-col items-center text-center transition-all duration-200 relative
                            ${isOutOfStock 
                              ? 'bg-gray-100 cursor-not-allowed' 
                              : 'cursor-pointer hover:shadow-lg hover:border-blue-500'}`
                          }
                        >
                          <div className={`absolute top-1 right-1 px-2 py-0.5 text-xs font-bold text-white rounded-full shadow-md
                            ${product.stock <= 0 ? 'bg-red-600' : product.stock <= 10 ? 'bg-amber-500' : 'bg-green-600'}`
                          }>
                            {`${stockDisplay} ${baseUnit.name}`}
                          </div>

                          <img 
                            src={product.imageUrl} 
                            alt={product.name} 
                            className={`w-24 h-24 object-cover rounded-md mb-2 ${isOutOfStock ? 'filter grayscale' : ''}`} 
                          />
                          <h3 className={`font-bold text-gray-700 flex-grow text-sm leading-tight ${isOutOfStock ? 'text-gray-400' : ''}`}>{product.name}</h3>
                          <p className={`font-semibold mt-1 text-sm ${isOutOfStock ? 'text-gray-400' : 'text-blue-600'}`}>
                            {formatCurrency(product.units[0].price)}
                          </p>
                        </div>
                      );
                    }
                  })}
                  {displayItems.length === 0 && (
                      <div className="col-span-full h-full flex items-center justify-center text-gray-500">
                          <p>{t('noItemsToDisplay')}</p>
                      </div>
                  )}
                </div>
            </div>
        </div>
      </div>

      <div className="w-1/3 flex flex-col bg-white rounded-xl shadow-md p-6">
        <div className="flex justify-between items-center border-b pb-4 mb-4">
            <h2 className="text-2xl font-bold">{t('posBill')}</h2>
            <button onClick={() => setIsParkedSalesModalOpen(true)} className="px-3 py-2 bg-yellow-500 text-white rounded-lg text-sm font-bold hover:bg-yellow-600">
                {t('parkedSalesTitle')} ({parkedSales.length})
            </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {cart.length === 0 ? (
            <p className="text-gray-500 text-center mt-8">{t('posEmptyCart')}</p>
          ) : (
            <ul className="divide-y">
              {cart.map(item => {
                  const product = products.find(p => p.id === item.id);
                  const isWeight = product?.sellingMethod === 'weight';
                  return (
                    <li key={`${item.id}-${item.unit.id}`} className="py-3 flex items-center gap-2">
                      <img src={item.imageUrl} alt={item.name} className="w-12 h-12 object-cover rounded-md" />
                      <div className={`flex-1 ${language === 'ar' ? 'mr-2' : 'ml-2'}`}>
                        <p className="font-semibold text-sm">{item.name} {isWeight ? '' : `(${item.unit.name})`}</p>
                        <p className="text-xs text-gray-500">{formatCurrency(item.unit.price)} {isWeight ? `/ ${item.unit.name}`: ''}</p>
                      </div>
                      <div className="flex items-center">
                          {isWeight ? (
                               <span className="w-14 p-1 text-center font-semibold">{item.quantity.toFixed(3)}</span>
                          ) : (
                               <input type="number" value={item.quantity} onChange={(e) => updateCartQuantity(item.id, item.unit.id, parseInt(e.target.value, 10))} className="w-14 p-1 border rounded text-center" min="0"/>
                          )}
                      </div>
                      <p className={`w-20 font-semibold text-sm ${language === 'ar' ? 'text-left' : 'text-right'}`}>{formatCurrency(item.unit.price * item.quantity)}</p>
                      <button onClick={() => removeFromCart(item.id, item.unit.id)} className="text-red-500 hover:text-red-700 p-1"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                    </li>
                  );
              })}
            </ul>
          )}
        </div>
        <div className="border-t pt-4">
          <div className="flex justify-between mb-2"><span>{t('subtotal')}</span><span>{formatCurrency(subtotal)}</span></div>
          <div className="flex justify-between items-center mb-2">
            <span>{t('discount')}</span>
            <input type="number" value={discount} onChange={e => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))} className="w-24 p-1 border rounded text-center"/>
          </div>
          <div className="flex justify-between mb-2"><span>{t('tax')} ({taxRate}%)</span><span>{formatCurrency(tax)}</span></div>
          <div className="flex justify-between font-bold text-xl mb-4"><span>{t('total')}</span><span>{formatCurrency(total)}</span></div>
          <div className="mb-4">
            <label htmlFor="customer-input" className="block text-sm font-medium text-gray-700 mb-1">{t('customer')}</label>
            <input 
              id="customer-input"
              type="text"
              list="customers-datalist"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full p-2 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder={t('customerNamePlaceholder')}
            />
            <datalist id="customers-datalist">
              {customers.map(customer => (<option key={customer.id} value={customer.name} />))}
            </datalist>
             {!isExistingCustomer && customerName !== t('cashCustomer') && (
                <p className="text-xs text-blue-600 mt-1">{t('newCustomerWillBeCreated')}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3 mb-3">
              <button 
                  onClick={() => setIsPaymentModalOpen(true)} 
                  className="w-full bg-blue-600 text-white p-4 rounded-lg font-bold text-xl hover:bg-blue-700 transition-colors disabled:bg-gray-300" 
                  disabled={cart.length === 0}>
                  {t('pay')}
              </button>
              <button 
                  onClick={handleDeferredSale}
                  className="w-full bg-amber-500 text-white p-4 rounded-lg font-bold text-xl hover:bg-amber-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                  disabled={cart.length === 0 || customerName.trim() === t('cashCustomer')}
                  title={customerName.trim() === t('cashCustomer') ? t('deferredSaleCashCustomerError') : ''}
              >
                  {t('deferredSale')}
              </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
           <button onClick={handleParkSale} className="w-full bg-orange-500 text-white p-2 rounded-lg font-semibold hover:bg-orange-600 transition-colors disabled:bg-gray-300" disabled={cart.length === 0}>{t('parkSale')}</button>
           <button onClick={() => { clearCart(); setDiscount(0); }} className="w-full bg-red-500 text-white p-2 rounded-lg font-semibold hover:bg-red-600 transition-colors disabled:bg-gray-300" disabled={cart.length === 0}>{t('cancel')}</button>
          </div>
        </div>
      </div>
      {lastSaleInfo && <Receipt sale={lastSaleInfo.sale} customer={lastSaleInfo.customer} onClose={() => setLastSaleInfo(null)} showTax={showTaxInReceipt} storeInfo={storeInfo} />}
      {unitSelectionProduct && <UnitSelectionModal product={unitSelectionProduct} onSelect={handleSelectUnit} onClose={() => setUnitSelectionProduct(null)} />}
      {weightEntryProduct && <WeightEntryModal product={weightEntryProduct} onConfirm={handleWeightConfirm} onClose={() => setWeightEntryProduct(null)} />}
      {isPaymentModalOpen && <PaymentModal total={total} onCompleteSale={handlePaymentModalCompletion} onClose={() => setIsPaymentModalOpen(false)} />}
      {isParkedSalesModalOpen && <ParkedSalesModal parkedSales={parkedSales} onRetrieve={handleRetrieveSale} onDelete={deleteParkedSale} onClose={() => setIsParkedSalesModalOpen(false)} />}
      <CustomerConfirmationModal
        isOpen={!!customerConfirmation}
        customerName={customerName}
        onConfirm={handleCustomerConfirmation}
        onCancel={() => setCustomerConfirmation(null)}
        isDeferredSale={customerConfirmation?.payments.some(p => p.method === 'deferred') || false}
      />
    </div>
  );

  if (currentUser?.role === 'cashier' && !activeSession) {
    return (
        <div className="relative h-[calc(100vh-4rem)]">
            <div className="absolute inset-0 bg-white bg-opacity-80 backdrop-blur-sm flex flex-col items-center justify-center z-10 rounded-xl p-8 text-center" role="alert" aria-live="assertive">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 text-amber-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <h2 className="text-3xl font-bold text-gray-800 mb-2">{t('sessionClosedTitle')}</h2>
                <p className="text-lg text-gray-600">
                    {t('sessionClosedBody')}
                </p>
            </div>
            <div className="blur-sm pointer-events-none" aria-hidden="true">
                {posUI}
            </div>
        </div>
    );
  }

  return posUI;
};

export default POS;