

import React, { useState } from 'react';
import { Supplier, SupplierPayment, Purchase } from '../types';
import PurchaseViewModal from '../components/PurchaseViewModal';
import { useTranslation } from '../contexts/LanguageContext';

interface SupplierProfileProps {
    supplier: Supplier;
    purchases: Purchase[];
    payments: SupplierPayment[];
    onBack: () => void;
}

const SupplierProfile: React.FC<SupplierProfileProps> = ({ supplier, purchases, payments, onBack }) => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<'purchases' | 'payments'>('purchases');
    const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);

    const formatCurrency = (amount: number) => new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP' }).format(amount);

    const getPurchaseStatus = (purchase: Purchase) => {
        if (purchase.amountPaid >= purchase.total) return { text: t('purchaseStatusPaid'), color: 'bg-green-200 text-green-800' };
        if (purchase.amountPaid === 0 && purchase.total > 0) return { text: t('purchaseStatusUnpaid'), color: 'bg-red-200 text-red-800' };
        if (purchase.amountPaid < purchase.total && purchase.amountPaid > 0) return { text: t('purchaseStatusPartial'), color: 'bg-yellow-200 text-yellow-800' };
        return { text: t('purchaseStatusPaid'), color: 'bg-green-200 text-green-800' };
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-4xl font-bold text-gray-800">{t('supplierProfileTitle', supplier.company)}</h1>
                <button onClick={onBack} className="bg-gray-200 text-gray-800 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors">
                    &rarr; {t('supplierProfileBackButton')}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="md:col-span-2 bg-white p-6 rounded-xl shadow-md">
                    <h2 className="text-2xl font-bold text-gray-700 mb-4 border-b pb-2">{t('supplierProfileData')}</h2>
                    <div className="grid grid-cols-2 gap-4 text-lg">
                        <p><strong className="text-gray-500">{t('supplierProfileContact')}:</strong> {supplier.name || '-'}</p>
                        <p><strong className="text-gray-500">{t('customerProfilePhone')}:</strong> {supplier.phone || '-'}</p>
                        <p className="col-span-2"><strong className="text-gray-500">{t('customerProfileEmail')}:</strong> {supplier.email || '-'}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-md flex flex-col justify-center items-center">
                    <h2 className="text-xl font-bold text-gray-500 mb-2">{t('customerProfileCurrentBalance')}</h2>
                    <p className={`text-5xl font-bold ${supplier.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCurrency(supplier.balance)}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">{supplier.balance > 0 ? t('supplierProfileDue') : t('supplierProfileDebit')}</p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-md">
                <div className="border-b">
                    <nav className="flex gap-4 p-4">
                        <button onClick={() => setActiveTab('purchases')} className={`px-4 py-2 rounded-lg font-semibold ${activeTab === 'purchases' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>{t('supplierProfilePurchasesTab', purchases.length)}</button>
                        <button onClick={() => setActiveTab('payments')} className={`px-4 py-2 rounded-lg font-semibold ${activeTab === 'payments' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>{t('customerProfilePaymentsTab', payments.length)}</button>
                    </nav>
                </div>

                <div className="p-6">
                    {activeTab === 'purchases' && (
                        <div className="overflow-x-auto max-h-96">
                            <table className="w-full text-right">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="p-3">{t('invoiceNumber')}</th>
                                        <th className="p-3">{t('date')}</th>
                                        <th className="p-3">{t('total')}</th>
                                        <th className="p-3">{t('supplierProfileStatus')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {purchases.map(purchase => {
                                        const status = getPurchaseStatus(purchase);
                                        return (
                                            <tr key={purchase.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedPurchase(purchase)}>
                                                <td className="p-3 text-blue-600 font-semibold">{purchase.id}</td>
                                                <td className="p-3">{new Date(purchase.date).toLocaleDateString('ar-EG')}</td>
                                                <td className="p-3 font-bold">{formatCurrency(purchase.total)}</td>
                                                <td className="p-3">
                                                    <span className={`p-1.5 text-xs font-medium uppercase tracking-wider rounded-lg ${status.color}`}>
                                                        {status.text}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {activeTab === 'payments' && (
                        <div className="overflow-x-auto max-h-96">
                            <table className="w-full text-right">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="p-3">{t('date')}</th>
                                        <th className="p-3">{t('customerPaymentModalAmount')}</th>
                                        <th className="p-3">{t('notes')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {payments.map(payment => (
                                        <tr key={payment.id}>
                                            <td className="p-3">{new Date(payment.date).toLocaleString('ar-EG')}</td>
                                            <td className="p-3 font-bold text-green-600">{formatCurrency(payment.amount)}</td>
                                            <td className="p-3">{payment.notes || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
            {selectedPurchase && <PurchaseViewModal purchase={selectedPurchase} onClose={() => setSelectedPurchase(null)} />}
        </div>
    );
};

export default SupplierProfile;