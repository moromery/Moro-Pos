import React, { useState, useEffect } from 'react';
import { Sale, CartItem, Product } from '../types';
import { useTranslation } from '../contexts/LanguageContext';

const SaleEditModal: React.FC<{ 
    sale: Sale; 
    onClose: () => void; 
    onSave: (saleId: string, updatedItems: CartItem[]) => void;
    products: Product[];
}> = ({ sale, onClose, onSave, products }) => {
    const { t } = useTranslation();
    const [editableItems, setEditableItems] = useState<CartItem[]>([]);

    useEffect(() => {
        setEditableItems(JSON.parse(JSON.stringify(sale.items)));
    }, [sale]);

    const formatCurrency = (amount: number) => new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP' }).format(amount);

    const originalTotal = sale.total;
    const newSubtotal = editableItems.reduce((acc, item) => acc + item.unit.price * item.quantity, 0);
    const subtotalAfterDiscount = newSubtotal - sale.totalDiscount;
    const newTax = subtotalAfterDiscount * (sale.taxRate / 100);
    const newTotal = subtotalAfterDiscount + newTax;
    const difference = originalTotal - newTotal;

    const handleQuantityChange = (productId: string, unitId: string, newQuantityStr: string) => {
        const newQuantity = parseInt(newQuantityStr, 10);
        
        if (isNaN(newQuantity) || newQuantity < 0) return;

        const originalItem = sale.items.find(item => item.id === productId && item.unit.id === unitId);
        if (newQuantity > (originalItem?.quantity || 0)) {
            alert(t('saleEditModalQuantityError', originalItem?.quantity));
            return;
        }

        setEditableItems(prevItems => {
            if (newQuantity === 0) {
                return prevItems.filter(item => !(item.id === productId && item.unit.id === unitId));
            }
            return prevItems.map(item =>
                item.id === productId && item.unit.id === unitId ? { ...item, quantity: newQuantity } : item
            );
        });
    };
    
    const handleSave = () => {
        onSave(sale.id, editableItems);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50" onClick={onClose}>
            <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-2xl font-bold mb-4">{t('saleEditModalTitle', sale.id)}</h2>
                <p className="text-gray-600 mb-4">{t('date')}: {new Date(sale.date).toLocaleString('ar-EG')}</p>
                
                <div className="max-h-64 overflow-y-auto border-t border-b py-2 mb-4">
                    <table className="w-full text-right">
                        <thead>
                            <tr className="border-b">
                                <th className="p-2 font-semibold">{t('item')}</th>
                                <th className="p-2 font-semibold text-center">{t('quantity')}</th>
                                <th className="p-2 font-semibold text-left">{t('total')}</th>
                            </tr>
                        </thead>
                        <tbody>
                        {editableItems.map(item => (
                             <tr key={`${item.id}-${item.unit.id}`} className="border-b last:border-none">
                                <td className="p-2">
                                     <p className="font-semibold">{item.name} <span className="text-gray-500">({item.unit.name})</span></p>
                                     <p className="text-sm text-gray-500">{formatCurrency(item.unit.price)}</p>
                                </td>
                                <td className="p-2 text-center">
                                    <input 
                                        type="number" 
                                        value={item.quantity}
                                        onChange={(e) => handleQuantityChange(item.id, item.unit.id, e.target.value)}
                                        className="w-20 p-1 border rounded text-center"
                                        min="0"
                                        max={sale.items.find(i => i.id === item.id)?.quantity || 0}
                                        aria-label={t('saleEditModalNewLabel', item.name)}
                                    />
                                </td>
                                <td className="p-2 text-left font-semibold">{formatCurrency(item.unit.price * item.quantity)}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4 p-4 rounded-lg bg-gray-100">
                    <div className="text-right">
                        <p>{t('saleEditModalOriginalTotal')}: <span className="font-bold">{formatCurrency(originalTotal)}</span></p>
                        <p>{t('saleEditModalNewTotal')}: <span className="font-bold">{formatCurrency(newTotal)}</span></p>
                    </div>
                    <div className={`text-center p-2 rounded-md ${difference >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        <p className="font-semibold">{t('saleEditModalDifference')}</p>
                        <p className="font-bold text-lg">{formatCurrency(difference)}</p>
                        <p className="text-xs">{difference > 0 ? t('saleEditModalRefund') : t('saleEditModalAdditional')}</p>
                    </div>
                </div>
                
                <div className="flex justify-end gap-4 mt-6">
                    <button type="button" onClick={onClose} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">{t('cancel')}</button>
                    <button type="button" onClick={handleSave} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{t('saleEditModalSave')}</button>
                </div>
            </div>
        </div>
    );
};

export default SaleEditModal;