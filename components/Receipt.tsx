import React, { useCallback } from 'react';
import { Sale, Customer } from '../types';
import { useTranslation } from '../contexts/LanguageContext';

interface ReceiptProps {
    sale: Sale;
    customer: Customer;
    onClose: () => void;
    showTax: boolean;
    storeInfo: { name: string; address: string; phone: string; logoUrl:string };
    isExporting?: boolean;
}

const Receipt: React.FC<ReceiptProps> = ({ sale, customer, onClose, showTax, storeInfo, isExporting = false }) => {
    const { t, language, currency } = useTranslation();
    const formatCurrency = (amount: number) => new Intl.NumberFormat(language === 'ar' ? 'ar-EG' : 'en-US', { style: 'currency', currency: currency }).format(amount);
    const formatDate = (date: string) => new Date(date).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US');

    const handlePrint = useCallback(() => {
        const receiptContent = document.getElementById('receipt-content');
        if (!receiptContent) return;

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert(t('allowPopupsForPrinting'));
            return;
        }

        const dir = language === 'ar' ? 'rtl' : 'ltr';
        const textAlign = language === 'ar' ? 'right' : 'left';
        const reverseAlign = language === 'ar' ? 'left' : 'right';

        printWindow.document.write('<html><head><title>Receipt</title>');
        printWindow.document.write('<style>');
        printWindow.document.write(`
            body { 
                font-family: monospace; 
                direction: ${dir}; 
                margin: 0; 
                padding: 2mm; 
                width: 76mm; 
                font-size: 10pt;
            }
            .text-center { text-align: center; }
            .text-xs { font-size: 8pt; }
            .font-bold { font-weight: bold; }
            .mx-auto { margin-left: auto; margin-right: auto; }
            .h-16 { height: 4rem; }
            .w-auto { width: auto; }
            .mb-2 { margin-bottom: 0.5rem; }
            .border-t { border-top: 1px dashed black; }
            .border-b { border-bottom: 1px dashed black; }
            .my-3 { margin-top: 0.75rem; margin-bottom: 0.75rem; }
            .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
            .w-full { width: 100%; }
            table { border-collapse: collapse; }
            th, td { padding-top: 0.25rem; padding-bottom: 0.25rem; }
            .text-right { text-align: ${textAlign}; }
            .text-left { text-align: ${reverseAlign}; }
            .pb-1 { padding-bottom: 0.25rem; }
            .mt-3 { margin-top: 0.75rem; }
            .pt-2 { padding-top: 0.5rem; }
            .flex { display: flex; }
            .justify-between { justify-content: space-between; }
            .text-sm { font-size: 9pt; }
            .mt-1 { margin-top: 0.25rem; }
            .my-2 { margin-top: 0.5rem; margin-bottom: 0.5rem; }
            .mt-4 { margin-top: 1rem; }
            .no-print { display: none; }
        `);
        printWindow.document.write('</style></head><body>');
        printWindow.document.write(receiptContent.innerHTML);
        printWindow.document.write('</body></html>');
        printWindow.document.close();

        printWindow.onafterprint = () => printWindow.close();
        
        setTimeout(() => {
            printWindow.focus();
            printWindow.print();
        }, 250);
    }, [language, t]);

    const receiptInnerContent = (
        <>
            <div className="text-center">
                {storeInfo.logoUrl && (
                    <img src={storeInfo.logoUrl} alt={t('storeLogoAlt')} className="mx-auto h-16 w-auto mb-2" />
                )}
                <h1 className="text-xl font-bold">{storeInfo.name}</h1>
                <p className="text-xs">{storeInfo.address}</p>
                <p className="text-xs">{t('phoneLabel')}: {storeInfo.phone}</p>
            </div>
            <div className="border-t border-b border-dashed my-3 py-2 text-xs">
                <p>{t('invoiceNumber')}: {sale.id}</p>
                <p>{t('date')}: {formatDate(sale.date)}</p>
                <p>{t('customer')}: {sale.customerName}</p>
            </div>
            <div>
                <table className="w-full text-xs">
                    <thead>
                        <tr>
                            <th className="text-right font-semibold pb-1">{t('item')}</th>
                            <th className="text-center font-semibold pb-1">{t('quantity')}</th>
                            <th className="text-left font-semibold pb-1">{t('price')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sale.items.map(item => (
                            <tr key={`${item.id}-${item.unit.id}`}>
                                <td className="text-right py-1">{item.name}</td>
                                <td className="text-center py-1">{item.quantity}</td>
                                <td className="text-left py-1">{formatCurrency(item.unit.price * item.quantity)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="border-t border-dashed mt-3 pt-2 text-xs">
                <div className="flex justify-between"><span>{t('subtotal')}</span><span>{formatCurrency(sale.subtotal)}</span></div>
                    {sale.totalDiscount > 0 && (
                    <div className="flex justify-between"><span>{t('discount')}</span><span>{formatCurrency(sale.totalDiscount)}</span></div>
                )}
                {showTax && (
                    <div className="flex justify-between"><span>{t('tax')} ({sale.taxRate}%)</span><span>{formatCurrency(sale.tax)}</span></div>
                )}
                <div className="flex justify-between font-bold text-sm mt-1"><span>{t('total')}</span><span>{formatCurrency(sale.total)}</span></div>
                
                <div className="border-t border-dashed my-2"></div>

                {sale.payments.map((p, index) => {
                    const paymentMethodKey = `paymentMethod${p.method.charAt(0).toUpperCase() + p.method.slice(1)}`;
                    return (
                        <div key={index} className="flex justify-between"><span>{t('paidWith', t(paymentMethodKey as any))}</span><span>{formatCurrency(p.amount)}</span></div>
                    );
                })}
                
                {customer.id !== 'c1' && (
                    <div className="flex justify-between mt-1">
                        <span>{t('newBalance')}</span>
                        <span className={customer.balance > 0 ? 'font-bold' : 'font-bold'}>{formatCurrency(customer.balance)}</span>
                    </div>
                )}
            </div>
            <div className="text-center mt-4 text-xs">
                <p>{t('thankYouMessage')}</p>
            </div>
        </>
    );

    if (isExporting) {
        return (
            <div id="receipt-content-export" className="font-mono bg-white p-4 w-[304px]">
                {receiptInnerContent}
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 no-print">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm">
                <div id="receipt-content" className="font-mono">
                    {receiptInnerContent}
                </div>
                 <div className="flex justify-around mt-6 no-print">
                    <button onClick={onClose} className="px-6 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400">{t('close')}</button>
                    <button onClick={handlePrint} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{t('print')}</button>
                </div>
            </div>
        </div>
    );
};

export default Receipt;