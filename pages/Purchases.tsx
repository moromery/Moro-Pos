import React, { useState, useMemo, useEffect } from 'react';
import { Purchase, PurchaseItem, Supplier, Product, PurchasePaymentMethod } from '../types';
import usePosState from '../hooks/usePosState';
import { useTranslation } from '../contexts/LanguageContext';

type PurchasesProps = ReturnType<typeof usePosState>;

const formatCurrency = (amount: number) => new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP' }).format(amount);

const PurchaseDetailsModal: React.FC<{ purchase: Purchase; onClose: () => void }> = ({ purchase, onClose }) => {
    const { t } = useTranslation();
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50" onClick={onClose}>
            <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-2xl font-bold mb-2">{t('purchaseDetailsTitle')}</h2>
                <p className="text-gray-500 mb-4">{purchase.id}</p>
                 <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                    <p><strong>{t('purchasesTableSupplier')}:</strong> {purchase.supplierName}</p>
                    <p><strong>{t('date')}:</strong> {new Date(purchase.date).toLocaleString('ar-EG')}</p>
                    {purchase.referenceNumber && <p><strong>{t('purchaseModalReference')}:</strong> {purchase.referenceNumber}</p>}
                </div>

                <div className="border-t border-b py-2 mb-4 max-h-60 overflow-y-auto">
                    {purchase.items.map((item, index) => (
                        <div key={index} className="flex justify-between items-center py-2 border-b last:border-none">
                            <div>
                                <p className="font-semibold">{item.productName}</p>
                                <p className="text-sm text-gray-500">{item.quantity} {item.unitName} x {formatCurrency(item.costPrice)}</p>
                                {item.expiryDate && <p className="text-xs text-red-600">{t('purchaseModalExpiresOn', new Date(item.expiryDate).toLocaleDateString('ar-EG'))}</p>}
                            </div>
                            <p className="font-semibold">{formatCurrency(item.subtotal)}</p>
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-gray-100">
                    <div>
                        <p><strong>{t('total')}:</strong> <span className="font-bold text-lg">{formatCurrency(purchase.total)}</span></p>
                        <p><strong>{t('purchasesTablePaid')}:</strong> <span className="font-bold text-green-600">{formatCurrency(purchase.amountPaid)}</span></p>
                        <p><strong>{t('purchaseDetailsRemaining')}:</strong> <span className="font-bold text-red-600">{formatCurrency(purchase.total - purchase.amountPaid)}</span></p>
                    </div>
                    <div className="text-left">
                         <p><strong>{t('paymentMethod')}:</strong> {t(purchase.paymentMethod === 'cash' ? 'paymentMethodCash' : 'paymentMethodDeferred')}</p>
                         {purchase.notes && <p><strong>{t('notes')}:</strong> {purchase.notes}</p>}
                    </div>
                </div>
                <div className="text-left mt-6">
                    <button onClick={onClose} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{t('close')}</button>
                </div>
            </div>
        </div>
    );
};

const PurchaseModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (purchase: Omit<Purchase, 'id' | 'date' | 'supplierName'>) => void;
    suppliers: Supplier[];
    products: Product[];
}> = ({ isOpen, onClose, onSave, suppliers, products }) => {
    const { t } = useTranslation();
    const [supplierId, setSupplierId] = useState('');
    const [referenceNumber, setReferenceNumber] = useState('');
    const [items, setItems] = useState<PurchaseItem[]>([]);
    const [paymentMethod, setPaymentMethod] = useState<PurchasePaymentMethod>('cash');
    const [amountPaid, setAmountPaid] = useState<number | string>('');
    const [notes, setNotes] = useState('');
    
    const [currentItem, setCurrentItem] = useState<{ productId: string; unitId: string; quantity: string; costPrice: string; expiryDate: string }>({
        productId: '', unitId: '', quantity: '', costPrice: '', expiryDate: '',
    });

    const [productSearch, setProductSearch] = useState('');
    const [isSearchFocused, setIsSearchFocused] = useState(false);

    const total = useMemo(() => items.reduce((sum, item) => sum + item.subtotal, 0), [items]);
    
    const searchedProducts = useMemo(() => {
        if (!productSearch) return [];
        const lowercasedSearch = productSearch.toLowerCase();
        return products.filter(p => 
            p.name.toLowerCase().includes(lowercasedSearch) ||
            (p.sku && p.sku.toLowerCase().includes(lowercasedSearch))
        );
    }, [productSearch, products]);

    const selectedProduct = useMemo(() => products.find(p => p.id === currentItem.productId), [products, currentItem.productId]);

    useEffect(() => {
        if (paymentMethod === 'cash') {
            setAmountPaid(total);
        }
    }, [paymentMethod, total]);

    const handleCurrentItemChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setCurrentItem(prev => {
            const newState = { ...prev, [name]: value };
            if (name === 'productId') {
                newState.unitId = ''; 
            }
            return newState;
        });
    };

    const handleAddItem = () => {
        const product = products.find(p => p.id === currentItem.productId);
        const unit = product?.units.find(u => u.id === currentItem.unitId);
        const quantity = Number(currentItem.quantity);
        const costPrice = Number(currentItem.costPrice);

        if (product && unit && quantity > 0 && costPrice >= 0) {
            const newItem: PurchaseItem = {
                productId: product.id, productName: product.name, quantity, costPrice,
                unitName: unit.name, unitFactor: unit.factor, subtotal: quantity * costPrice,
                expiryDate: currentItem.expiryDate || undefined,
            };
            const existingItemIndex = items.findIndex(i => i.productId === newItem.productId && i.expiryDate === newItem.expiryDate);
            if (existingItemIndex > -1) {
                 const updatedItems = [...items];
                 const existingItem = updatedItems[existingItemIndex];
                 existingItem.quantity += newItem.quantity;
                 existingItem.subtotal += newItem.subtotal;
                 setItems(updatedItems);
            } else {
                 setItems(prev => [...prev, newItem]);
            }
           
            setCurrentItem({ productId: '', unitId: '', quantity: '', costPrice: '', expiryDate: '' });
            setProductSearch('');
        } else {
            alert(t('purchaseModalValidationError'));
        }
    };
    
    const handleRemoveItem = (index: number) => {
        setItems(prev => prev.filter((_, i) => i !== index));
    };

    const resetForm = () => {
        setSupplierId(suppliers[0]?.id || '');
        setReferenceNumber('');
        setItems([]);
        setCurrentItem({ productId: '', unitId: '', quantity: '', costPrice: '', expiryDate: '' });
        setProductSearch('');
        setPaymentMethod('cash');
        setAmountPaid('');
        setNotes('');
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const supplier = suppliers.find(s => s.id === supplierId);
        if (!supplier || items.length === 0) {
            alert(t('purchaseModalSupplierItemError'));
            return;
        }
        
        const finalAmountPaid = Number(amountPaid);
        if (isNaN(finalAmountPaid) || finalAmountPaid < 0 || finalAmountPaid > total) {
            alert(t('purchaseModalInvalidAmountError'));
            return;
        }
        
        const finalPaymentMethod: PurchasePaymentMethod = (paymentMethod === 'deferred' && finalAmountPaid === total) ? 'cash' : paymentMethod;

        onSave({
            supplierId, items, total, amountPaid: finalAmountPaid,
            paymentMethod: finalPaymentMethod, notes, referenceNumber
        });
        resetForm();
        onClose();
    };
    
    useEffect(() => {
        if(isOpen && suppliers.length > 0 && !supplierId){
            setSupplierId(suppliers[0].id);
        }
    }, [isOpen, suppliers, supplierId]);


    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-2xl font-bold mb-6">{t('purchaseModalTitle')}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <select name="supplierId" value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="p-3 border rounded-lg w-full" required>
                            <option value="" disabled>{t('purchaseModalSelectSupplier')}</option>
                            {suppliers.map(s => <option key={s.id} value={s.id}>{s.company}</option>)}
                         </select>
                        <input type="text" name="referenceNumber" value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} placeholder={t('purchaseModalReferenceOptional')} className="p-3 border rounded-lg w-full" />
                    </div>

                    <div className="border-t pt-4">
                        <h3 className="text-lg font-semibold mb-2">{t('purchaseModalItems')}</h3>
                        <div className="grid grid-cols-12 gap-2 items-center mb-4">
                            <div className="col-span-12 md:col-span-3 relative">
                                <input type="text" value={productSearch} onChange={(e) => { setProductSearch(e.target.value); if (currentItem.productId) { setCurrentItem(prev => ({...prev, productId: '', unitId: ''})); } }} onFocus={() => setIsSearchFocused(true)} onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)} placeholder={t('purchaseModalSearchProduct')} className="w-full p-2 border rounded-lg bg-gray-50" autoComplete="off" />
                                {isSearchFocused && searchedProducts.length > 0 && (
                                    <ul className="absolute z-10 w-full bg-white border rounded-lg mt-1 max-h-48 overflow-y-auto shadow-lg">{searchedProducts.map(p => (<li key={p.id} onMouseDown={() => { setCurrentItem(prev => ({...prev, productId: p.id, unitId: p.units[0]?.id || ''})); setProductSearch(p.name); setIsSearchFocused(false); }} className="p-2 hover:bg-gray-100 cursor-pointer">{p.name} <span className="text-xs text-gray-500">({p.sku})</span></li>))}</ul>
                                )}
                            </div>
                            <select name="unitId" value={currentItem.unitId} onChange={handleCurrentItemChange} className="col-span-6 md:col-span-2 p-2 border rounded-lg bg-gray-50" disabled={!selectedProduct}>
                                <option value="">{t('purchaseModalSelectUnit')}</option>
                                {selectedProduct?.units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                            </select>
                            <input type="number" name="quantity" value={currentItem.quantity} onChange={handleCurrentItemChange} placeholder={t('quantity')} className="col-span-6 md:col-span-1 p-2 border rounded-lg" min="1" />
                            <input type="number" name="costPrice" value={currentItem.costPrice} onChange={handleCurrentItemChange} placeholder={t('cost')} className="col-span-6 md:col-span-2 p-2 border rounded-lg" min="0" step="0.01" />
                            <input type="date" name="expiryDate" value={currentItem.expiryDate} onChange={handleCurrentItemChange} placeholder={t('productModalExpiryDate')} className="col-span-6 md:col-span-2 p-2 border rounded-lg" />
                            <button type="button" onClick={handleAddItem} className="col-span-12 md:col-span-2 bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 font-semibold">{t('add')}</button>
                        </div>
                        
                        <div className="max-h-48 overflow-y-auto border rounded-lg p-2 bg-gray-50">
                           {items.map((item, index) => (
                               <div key={`${item.productId}-${item.expiryDate || index}`} className="flex justify-between items-center p-2 bg-white rounded mb-1 shadow-sm">
                                    <div>
                                        <p>{item.productName} ({item.quantity} {item.unitName} @ {formatCurrency(item.costPrice)})</p>
                                        {item.expiryDate && <p className="text-xs text-red-600">{t('purchaseModalExpiresOn', new Date(item.expiryDate).toLocaleDateString('ar-EG'))}</p>}
                                    </div>
                                    <div className="flex items-center gap-2">
                                       <span className="font-semibold">{formatCurrency(item.subtotal)}</span>
                                       <button type="button" onClick={() => handleRemoveItem(index)} className="text-red-500 hover:text-red-700 font-bold">✕</button>
                                    </div>
                               </div>
                           ))}
                           {items.length === 0 && <p className="text-gray-400 text-center py-4">{t('purchaseModalNoItems')}</p>}
                        </div>
                    </div>
                     <div className="text-2xl font-bold text-left mt-4">
                        {t('total')}: {formatCurrency(total)}
                    </div>

                    <div className="border-t pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{t('paymentMethod')}</label>
                            <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as any)} className="p-3 border rounded-lg w-full bg-white">
                                <option value="cash">{t('paymentMethodCash')}</option>
                                <option value="deferred">{t('paymentMethodDeferred')}</option>
                            </select>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{t('purchaseModalAmountPaid')}</label>
                            <input type="number" value={amountPaid} onChange={e => setAmountPaid(e.target.value)} readOnly={paymentMethod === 'cash'} className={`p-3 border rounded-lg w-full ${paymentMethod === 'cash' ? 'bg-gray-200' : ''}`} max={total} min="0" step="0.01" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">{t('notes')}</label>
                            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder={t('purchaseModalNotesPlaceholder')} className="p-3 border rounded-lg w-full h-20" />
                        </div>
                    </div>

                    <div className="flex justify-end gap-4 mt-6">
                        <button type="button" onClick={onClose} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">{t('cancel')}</button>
                        <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{t('purchaseModalSaveButton')}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};


const Purchases: React.FC<PurchasesProps> = ({ purchases, addPurchase, deletePurchase, suppliers, products }) => {
    const { t } = useTranslation();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-4xl font-bold text-gray-800">{t('purchasesTitle')}</h1>
                <button onClick={() => setIsAddModalOpen(true)} className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-md">
                    {t('purchasesAddButton')}
                </button>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md">
                <div className="overflow-x-auto">
                    <table className="w-full text-right">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="p-4 text-sm font-semibold tracking-wide">{t('purchasesTableInvoice')}</th>
                                <th className="p-4 text-sm font-semibold tracking-wide">{t('date')}</th>
                                <th className="p-4 text-sm font-semibold tracking-wide">{t('purchasesTableSupplier')}</th>
                                <th className="p-4 text-sm font-semibold tracking-wide">{t('total')}</th>
                                <th className="p-4 text-sm font-semibold tracking-wide">{t('purchasesTablePaid')}</th>
                                <th className="p-4 text-sm font-semibold tracking-wide">{t('actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {purchases.map(purchase => (
                                <tr key={purchase.id}>
                                    <td className="p-4 text-sm text-gray-700">{purchase.id}</td>
                                    <td className="p-4 text-sm text-gray-700">{new Date(purchase.date).toLocaleDateString('ar-EG')}</td>
                                    <td className="p-4 text-sm text-gray-700">{purchase.supplierName}</td>
                                    <td className="p-4 text-sm text-gray-700 font-bold">{formatCurrency(purchase.total)}</td>
                                    <td className="p-4 text-sm text-green-600">{formatCurrency(purchase.amountPaid)}</td>
                                    <td className="p-4 text-sm">
                                        <button onClick={() => setSelectedPurchase(purchase)} className="text-blue-500 hover:underline">
                                            {t('purchasesTableView')}
                                        </button>
                                         <button onClick={() => {
                                             if (window.confirm(t('purchasesDeleteConfirm'))) {
                                                deletePurchase(purchase.id)
                                             }
                                            }} className="text-red-500 hover:underline mr-4">
                                            {t('delete')}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            {selectedPurchase && <PurchaseDetailsModal purchase={selectedPurchase} onClose={() => setSelectedPurchase(null)} />}
            <PurchaseModal 
                isOpen={isAddModalOpen} 
                onClose={() => setIsAddModalOpen(false)} 
                onSave={addPurchase} 
                suppliers={suppliers}
                products={products}
            />
        </div>
    );
};

export default Purchases;