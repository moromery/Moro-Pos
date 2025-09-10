import React, { useState, useMemo, useEffect } from 'react';
import { SalePayment } from '../types';
import { useTranslation } from '../contexts/LanguageContext';

interface PaymentModalProps {
    total: number;
    onClose: () => void;
    onCompleteSale: (payments: SalePayment[]) => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ total, onClose, onCompleteSale }) => {
    const { t, language } = useTranslation();
    const [amountReceivedStr, setAmountReceivedStr] = useState<string>('');

    const amountReceived = useMemo(() => parseFloat(amountReceivedStr) || 0, [amountReceivedStr]);
    const change = useMemo(() => (amountReceived > total ? amountReceived - total : 0), [amountReceived, total]);
    const canComplete = useMemo(() => amountReceived >= total, [amountReceived, total]);

    // Auto-focus the input on mount
    const inputRef = React.useRef<HTMLInputElement>(null);
    useEffect(() => {
        setTimeout(() => inputRef.current?.focus(), 100);
    }, []);

    const formatCurrency = (amount: number) => new Intl.NumberFormat(language === 'ar' ? 'ar-EG' : 'en-US', { style: 'currency', currency: 'EGP' }).format(amount);

    const handleFinalizeSale = () => {
        if (canComplete) {
            onCompleteSale([{ method: 'cash', amount: total }]);
        }
    };

    const handleQuickCash = (amount: number) => {
        setAmountReceivedStr(String(amount));
    };
    
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && canComplete) {
            handleFinalizeSale();
        }
    };
    
    const QUICK_CASH_VALUES = [50, 100, 200, 500];


    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50" onClick={onClose}>
            <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()} onKeyDown={handleKeyDown}>
                <h2 className="text-3xl font-bold mb-6 text-center text-gray-800">{t('cashPaymentTitle')}</h2>
                
                {/* Total Amount Display */}
                <div className="bg-blue-600 text-white text-center p-4 rounded-xl mb-6 shadow-lg">
                    <p className="text-lg font-semibold">{t('totalAmountDue')}</p>
                    <p className="text-5xl font-extrabold tracking-tight">{formatCurrency(total)}</p>
                </div>
                
                {/* Payment Input Section */}
                <div className="space-y-4">
                     <div>
                        <label htmlFor="amount-received" className="block text-center text-lg font-medium text-gray-700 mb-2">{t('amountReceivedFromCustomer')}</label>
                        <input 
                            ref={inputRef}
                            id="amount-received"
                            type="number"
                            value={amountReceivedStr}
                            onChange={e => setAmountReceivedStr(e.target.value)}
                            placeholder="0.00"
                            className="w-full p-4 border-2 border-gray-300 rounded-lg text-center text-3xl font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                        />
                    </div>
                    
                    {/* Quick Cash Buttons */}
                    <div className="flex flex-wrap justify-center gap-3">
                        <button onClick={() => handleQuickCash(total)} className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 transition">{t('exactAmount')}</button>
                        {QUICK_CASH_VALUES.map(value => total < value && (
                            <button key={value} onClick={() => handleQuickCash(value)} className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 transition">{formatCurrency(value)}</button>
                        ))}
                    </div>
                </div>

                {/* Change Display */}
                <div className="bg-green-100 text-green-800 text-center p-4 rounded-xl mt-6">
                    <p className="text-lg font-semibold">{t('changeDueToCustomer')}</p>
                    <p className="text-4xl font-bold">{formatCurrency(change)}</p>
                </div>

                {/* Actions */}
                <div className="mt-8 border-t pt-6 flex justify-between items-center">
                    <button onClick={onClose} className="px-8 py-3 bg-gray-200 text-gray-800 rounded-lg font-bold hover:bg-gray-300 transition">{t('cancel')}</button>
                    <button 
                        onClick={handleFinalizeSale}
                        className="px-10 py-4 bg-blue-600 text-white rounded-lg text-xl font-bold hover:bg-blue-700 transition transform hover:scale-105 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:scale-100"
                        disabled={!canComplete}
                    >
                        {t('completeSale')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PaymentModal;