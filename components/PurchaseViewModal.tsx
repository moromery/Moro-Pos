import React from 'react';
import { Purchase } from '../types';
import { useTranslation } from '../contexts/LanguageContext';

interface PurchaseViewModalProps {
    purchase: Purchase;
    onClose: () => void;
}

const PurchaseViewModal: React.FC<PurchaseViewModalProps> = ({ purchase, onClose }) => {
    const { t } = useTranslation();
    const formatCurrency = (amount: number) => new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP' }).format(amount);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50" onClick={onClose}>
            <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-2xl font-bold mb-2">{t('purchaseDetailsTitle')}</h2>
                <p className="text-gray-500 mb-4">{purchase.id}</p>
                
                <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                    <p><strong>{t('purchasesTableSupplier')}:</strong> {purchase.supplierName}</p>
                    <p><strong>{t('date')}:</strong> {new Date(purchase.date).toLocaleString('ar-EG')}</p>
                </div>
                
                <div className="max-h-64 overflow-y-auto border-t border-b py-2 mb-4">
                    <table className="w-full text-right">
                        <thead>
                            <tr className="border-b">
                                <th className="p-2 font-semibold">{t('item')}</th>
                                <th className="p-2 font-semibold">{t('quantity')}</th>
                                <th className="p-2 font-semibold">{t('cost')}</th>
                                <th className="p-2 font-semibold text-left">{t('total')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {purchase.items.map((item, index) => (
                                <tr key={index} className="border-b last:border-none">
                                    <td className="p-2">{item.productName}</td>
                                    <td className="p-2">{item.quantity} {item.unitName}</td>
                                    <td className="p-2">{formatCurrency(item.costPrice)}</td>
                                    <td className="p-2 text-left font-semibold">{formatCurrency(item.subtotal)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-gray-100">
                    <div>
                        <p><strong>{t('total')}:</strong> <span className="font-bold text-lg">{formatCurrency(purchase.total)}</span></p>
                        <p><strong>{t('purchasesTablePaid')}:</strong> <span className="font-bold">{formatCurrency(purchase.amountPaid)}</span></p>
                        <p><strong>{t('purchaseDetailsRemaining')}:</strong> <span className="font-bold text-red-600">{formatCurrency(purchase.total - purchase.amountPaid)}</span></p>
                    </div>
                    <div className="text-left">
                         <p><strong>{t('paymentMethod')}:</strong> {t(purchase.paymentMethod === 'cash' ? 'paymentMethodCash' : 'paymentMethodDeferred')}</p>
                         {purchase.notes && <p><strong>{t('notes')}:</strong> {purchase.notes}</p>}
                    </div>
                </div>
                
                <div className="flex justify-end mt-6">
                    <button type="button" onClick={onClose} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">{t('close')}</button>
                </div>
            </div>
        </div>
    );
};

export default PurchaseViewModal;