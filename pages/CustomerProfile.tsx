

import React, { useState } from 'react';
import { Customer, Sale, CustomerPayment, CartItem, Product } from '../types';
import SaleEditModal from '../components/SaleEditModal';
import Receipt from '../components/Receipt';
import { useTranslation } from '../contexts/LanguageContext';

interface CustomerProfileProps {
    customer: Customer;
    sales: Sale[];
    payments: CustomerPayment[];
    onBack: () => void;
    products: Product[];
    updateSale: (saleId: string, updatedItems: CartItem[]) => void;
    storeInfo: { name: string; address: string; phone: string; logoUrl: string };
    showTaxInReceipt: boolean;
}

const CustomerProfile: React.FC<CustomerProfileProps> = ({ customer, sales, payments, onBack, products, updateSale, storeInfo, showTaxInReceipt }) => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<'sales' | 'payments'>('sales');
    const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
    const [saleToPrint, setSaleToPrint] = useState<Sale | null>(null);
    const formatCurrency = (amount: number) => new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP' }).format(amount);

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-4xl font-bold text-gray-800">{t('customerProfileTitle', customer.name)}</h1>
                <button onClick={onBack} className="bg-gray-200 text-gray-800 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors">
                    &rarr; {t('customerProfileBackButton')}
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="md:col-span-2 bg-white p-6 rounded-xl shadow-md">
                    <h2 className="text-2xl font-bold text-gray-700 mb-4 border-b pb-2">{t('customerProfileData')}</h2>
                    <div className="grid grid-cols-2 gap-4 text-lg">
                        <p><strong className="text-gray-500">{t('customerProfilePhone')}:</strong> {customer.phone || '-'}</p>
                        <p><strong className="text-gray-500">{t('customerProfileEmail')}:</strong> {customer.email || '-'}</p>
                        <p className="col-span-2"><strong className="text-gray-500">{t('customerProfileAddress')}:</strong> {customer.address || '-'}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-md flex flex-col justify-center items-center">
                    <h2 className="text-xl font-bold text-gray-500 mb-2">{t('customerProfileCurrentBalance')}</h2>
                    <p className={`text-5xl font-bold ${customer.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCurrency(customer.balance)}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">{customer.balance > 0 ? t('customerProfileDue') : t('customerProfileCredit')}</p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-md">
                <div className="border-b">
                    <nav className="flex gap-4 p-4">
                        <button onClick={() => setActiveTab('sales')} className={`px-4 py-2 rounded-lg font-semibold ${activeTab === 'sales' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>{t('customerProfileInvoicesTab', sales.length)}</button>
                        <button onClick={() => setActiveTab('payments')} className={`px-4 py-2 rounded-lg font-semibold ${activeTab === 'payments' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}>{t('customerProfilePaymentsTab', payments.length)}</button>
                    </nav>
                </div>

                <div className="p-6">
                    {activeTab === 'sales' && (
                        <div className="overflow-x-auto max-h-96">
                            <table className="w-full text-right">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="p-3">{t('invoiceNumber')}</th>
                                        <th className="p-3">{t('date')}</th>
                                        <th className="p-3">{t('paymentMethod')}</th>
                                        <th className="p-3">{t('total')}</th>
                                        <th className="p-3">{t('actions')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {sales.map(sale => (
                                        <tr key={sale.id} className="hover:bg-gray-50">
                                            <td className="p-3 text-blue-600 font-semibold">{sale.id}</td>
                                            <td className="p-3">{new Date(sale.date).toLocaleString('ar-EG')}</td>
                                            <td className="p-3">{sale.payments.map(p => t(`paymentMethod${p.method.charAt(0).toUpperCase() + p.method.slice(1)}` as any)).join(', ')}</td>
                                            <td className="p-3 font-bold">{formatCurrency(sale.total)}</td>
                                            <td className="p-3 whitespace-nowrap">
                                                <button onClick={() => setSelectedSale(sale)} className="text-blue-500 hover:underline">
                                                    {t('returnEdit')}
                                                </button>
                                                <button onClick={() => setSaleToPrint(sale)} className="text-purple-600 hover:underline mr-4">
                                                    {t('print')}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
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
            {selectedSale && <SaleEditModal sale={selectedSale} onClose={() => setSelectedSale(null)} onSave={updateSale} products={products} />}
            {saleToPrint && (
                <Receipt
                    sale={saleToPrint}
                    customer={customer}
                    onClose={() => setSaleToPrint(null)}
                    showTax={showTaxInReceipt}
                    storeInfo={storeInfo}
                />
            )}
        </div>
    );
};

export default CustomerProfile;