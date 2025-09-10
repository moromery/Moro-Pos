import React from 'react';
import { WorkSession, Sale, Expense } from '../types';
import { useTranslation } from '../contexts/LanguageContext';

interface SessionSummaryModalProps {
    session: WorkSession;
    sales: Sale[];
    expenses: Expense[];
    onClose: () => void;
}

const formatCurrency = (amount: number) => new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP' }).format(amount);
const formatDateTime = (isoString: string | null) => isoString ? new Date(isoString).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' }) : '-';

const SessionSummaryModal: React.FC<SessionSummaryModalProps> = ({ session, sales, expenses, onClose }) => {
    const { t } = useTranslation();
    
    const sessionSales = sales.filter(s => {
        const saleDate = new Date(s.date);
        return saleDate >= new Date(session.startTime) && (session.endTime ? saleDate <= new Date(session.endTime) : true);
    });

    const sessionExpenses = expenses.filter(e => e.sessionId === session.id);

    const handlePrint = () => {
        window.print();
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 print:bg-white">
            <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" id="session-summary-content">
                <style>{`
                    @media print {
                        body * { visibility: hidden; }
                        #session-summary-content, #session-summary-content * { visibility: visible; }
                        #session-summary-content { position: absolute; left: 0; top: 0; width: 100%; height: 100%; padding: 2rem; margin: 0; border: none; box-shadow: none; border-radius: 0; overflow: auto; }
                        .no-print { display: none; }
                    }
                `}</style>

                <div className="border-b pb-4 mb-4">
                    <h2 className="text-2xl font-bold text-gray-800">{t('sessionSummaryTitle')}</h2>
                    <p className="text-sm text-gray-500">{t('sessionSummaryUser', session.userName)}</p>
                    <p className="text-sm text-gray-500">{t('sessionSummaryPeriod', formatDateTime(session.startTime), formatDateTime(session.endTime))}</p>
                </div>

                <div className="flex-1 overflow-y-auto pr-2">
                    <div className="bg-gray-50 p-4 rounded-lg mb-4 space-y-2">
                        <div className="flex justify-between"><span className="text-gray-600">{t('sessionsOpeningFloat')}:</span><span className="font-semibold">{formatCurrency(session.openingFloat)}</span></div>
                        <div className="flex justify-between"><span className="text-gray-600">{t('sessionsTotalCashSales')}:</span><span className="font-semibold text-green-600">+ {formatCurrency(session.totalCashSales ?? 0)}</span></div>
                        <div className="flex justify-between"><span className="text-gray-600">{t('sessionsTotalExpenses')}:</span><span className="font-semibold text-red-600">- {formatCurrency(session.totalExpenses ?? 0)}</span></div>
                        <hr className="my-1"/>
                        <div className="flex justify-between font-bold"><span className="text-gray-800">{t('sessionsExpectedCash')}:</span><span>{formatCurrency(session.expectedCash ?? 0)}</span></div>
                        <div className="flex justify-between"><span className="text-gray-600">{t('sessionsClosingFloat')}:</span><span className="font-semibold">{formatCurrency(session.closingFloat ?? 0)}</span></div>
                         <hr className="my-1"/>
                        <div className={`flex justify-between font-bold text-lg p-2 rounded-md ${(session.difference ?? 0) === 0 ? 'bg-gray-200' : (session.difference ?? 0) > 0 ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                            <span>{t('sessionsDifference')}:</span>
                            <span>{formatCurrency(session.difference ?? 0)}</span>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-blue-50 p-3 rounded-lg text-center">
                            <p className="text-sm text-blue-800">{t('sessionSummaryCardSales')}</p>
                            <p className="font-bold text-lg text-blue-800">{formatCurrency(session.totalCardSales ?? 0)}</p>
                        </div>
                        <div className="bg-orange-50 p-3 rounded-lg text-center">
                            <p className="text-sm text-orange-800">{t('sessionSummaryDeferredSales')}</p>
                            <p className="font-bold text-lg text-orange-800">{formatCurrency(session.totalDeferredSales ?? 0)}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h3 className="text-lg font-bold mb-2">{t('sessionSummarySalesDetails', sessionSales.length)}</h3>
                            <div className="max-h-48 overflow-y-auto border rounded-lg">
                                <table className="w-full text-sm text-right">
                                    <thead className="bg-gray-100 sticky top-0"><tr><th className="p-2">{t('sessionSummaryTime')}</th><th className="p-2">{t('total')}</th><th className="p-2">{t('sessionSummaryType')}</th></tr></thead>
                                    <tbody className="divide-y">
                                        {sessionSales.length > 0 ? sessionSales.map(sale => (<tr key={sale.id}><td className="p-2">{new Date(sale.date).toLocaleTimeString('ar-EG')}</td><td className="p-2">{formatCurrency(sale.total)}</td><td className="p-2">{sale.payments.map(p => t(`paymentMethod${p.method.charAt(0).toUpperCase() + p.method.slice(1)}` as any)).join(', ')}</td></tr>)) : (<tr><td colSpan={3} className="text-center p-4 text-gray-500">{t('sessionSummaryNoSales')}</td></tr>)}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div>
                             <h3 className="text-lg font-bold mb-2">{t('sessionSummaryExpensesDetails', sessionExpenses.length)}</h3>
                             <div className="max-h-48 overflow-y-auto border rounded-lg">
                                <table className="w-full text-sm text-right">
                                    {/* FIX: Replaced invalid translation key 'sessionsTableReason' with the correct key 'sessionsExpenseReason'. */}
                                    <thead className="bg-gray-100 sticky top-0"><tr><th className="p-2">{t('sessionsExpenseReason')}</th><th className="p-2">{t('customerPaymentModalAmount')}</th></tr></thead>
                                    <tbody className="divide-y">
                                        {sessionExpenses.length > 0 ? sessionExpenses.map(exp => (<tr key={exp.id}><td className="p-2">{exp.reason}</td><td className="p-2">{formatCurrency(exp.amount)}</td></tr>)) : (<tr><td colSpan={2} className="text-center p-4 text-gray-500">{t('sessionSummaryNoExpenses')}</td></tr>)}
                                    </tbody>
                                </table>
                             </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-4 mt-6 pt-4 border-t no-print">
                    <button onClick={onClose} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">{t('close')}</button>
                    <button onClick={handlePrint} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{t('print')}</button>
                </div>
            </div>
        </div>
    );
};

export default SessionSummaryModal;