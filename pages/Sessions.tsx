import React, { useState, useMemo } from 'react';
import { WorkSession, Expense, Sale } from '../types';
import usePosState from '../hooks/usePosState';
import SessionSummaryModal from '../components/SessionSummaryModal';
import { useTranslation } from '../contexts/LanguageContext';

type SessionsProps = ReturnType<typeof usePosState>;

const formatCurrency = (amount: number) => new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP' }).format(amount);
const formatDateTime = (isoString: string) => new Date(isoString).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' });

const StartSessionModal: React.FC<{
    onStart: (openingFloat: number) => void;
    onClose: () => void;
}> = ({ onStart, onClose }) => {
    const { t } = useTranslation();
    const [amount, setAmount] = useState('');
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const floatAmount = parseFloat(amount);
        if (!isNaN(floatAmount) && floatAmount >= 0) {
            onStart(floatAmount);
            onClose();
        } else {
            alert(t('sessionsInvalidAmountError'));
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md">
                <h2 className="text-2xl font-bold mb-6">{t('sessionsStartModalTitle')}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <label htmlFor="openingFloat" className="block text-sm font-medium text-gray-700">{t('sessionsStartModalLabel')}</label>
                    <input id="openingFloat" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="p-3 border rounded-lg w-full" required min="0" step="0.01" autoFocus />
                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onClose} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">{t('cancel')}</button>
                        <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{t('sessionsStartModalButton')}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const EndSessionModal: React.FC<{
    expectedCash: number;
    onEnd: (closingFloat: number) => void;
    onClose: () => void;
}> = ({ expectedCash, onEnd, onClose }) => {
    const { t } = useTranslation();
    const [actualAmount, setActualAmount] = useState('');
    const closingFloat = parseFloat(actualAmount) || 0;
    const difference = closingFloat - expectedCash;
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onEnd(closingFloat);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-lg">
                <h2 className="text-2xl font-bold mb-6">{t('sessionsEndModalTitle')}</h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="bg-gray-100 p-4 rounded-lg">
                        <p className="text-gray-600">{t('sessionsEndModalExpected')}</p>
                        <p className="text-2xl font-bold">{formatCurrency(expectedCash)}</p>
                    </div>
                    <div>
                        <label htmlFor="actualAmount" className="block font-medium text-gray-700">{t('sessionsEndModalActualLabel')}</label>
                        <input id="actualAmount" type="number" value={actualAmount} onChange={e => setActualAmount(e.target.value)} placeholder="0.00" className="mt-1 p-3 border rounded-lg w-full" required min="0" step="0.01" autoFocus />
                    </div>
                    <div className={`p-4 rounded-lg text-center ${difference === 0 ? 'bg-gray-100' : (difference > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800')}`}>
                        <p className="font-medium">{t('sessionsEndModalDifference')}</p>
                        <p className="text-2xl font-bold">{formatCurrency(difference)}</p>
                    </div>
                    <div className="flex justify-end gap-4 pt-4 border-t">
                        <button type="button" onClick={onClose} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">{t('cancel')}</button>
                        <button type="submit" className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">{t('sessionsEndModalButton')}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};


const Sessions: React.FC<SessionsProps> = ({ sales, workSessions, expenses, startSession, addExpense, endSession }) => {
    const { t } = useTranslation();
    const [isStartModalOpen, setStartModalOpen] = useState(false);
    const [isEndModalOpen, setEndModalOpen] = useState(false);
    const [expenseAmount, setExpenseAmount] = useState('');
    const [expenseReason, setExpenseReason] = useState('');
    const [selectedSession, setSelectedSession] = useState<WorkSession | null>(null);
    
    const activeSession = useMemo(() => workSessions.find(s => s.status === 'active'), [workSessions]);
    const closedSessions = useMemo(() => workSessions.filter(s => s.status === 'closed'), [workSessions]);
    
    const { sessionSales, sessionExpenses, totalCashSales, totalExpenses, expectedCash } = useMemo(() => {
        if (!activeSession) return { sessionSales: [], sessionExpenses: [], totalCashSales: 0, totalExpenses: 0, expectedCash: 0 };
        const ss = sales.filter(s => new Date(s.date) >= new Date(activeSession.startTime));
        const se = expenses.filter(e => e.sessionId === activeSession.id);
        const tcs = ss.reduce((sum, sale) => sum + (sale.payments.find(p => p.method === 'cash')?.amount || 0), 0);
        const te = se.reduce((sum, exp) => sum + exp.amount, 0);
        const ec = activeSession.openingFloat + tcs - te;
        return { sessionSales: ss, sessionExpenses: se, totalCashSales: tcs, totalExpenses: te, expectedCash: ec };
    }, [activeSession, sales, expenses]);

    const handleAddExpense = (e: React.FormEvent) => {
        e.preventDefault();
        const amount = parseFloat(expenseAmount);
        if (!isNaN(amount) && amount > 0 && expenseReason.trim()) {
            addExpense({ amount, reason: expenseReason });
            setExpenseAmount('');
            setExpenseReason('');
        } else {
            alert(t('sessionsInvalidExpenseError'));
        }
    };

    return (
        <div>
            <h1 className="text-4xl font-bold text-gray-800 mb-6">{t('sessionsTitle')}</h1>

            {activeSession ? (
                <div className="mb-8">
                    <div className="bg-white p-6 rounded-xl shadow-md">
                        <div className="flex justify-between items-center border-b pb-4 mb-4">
                            <div>
                                <h2 className="text-2xl font-bold text-green-600">{t('sessionsActiveTitle')}</h2>
                                <p className="text-gray-500">{t('sessionsStartedAt', formatDateTime(activeSession.startTime), activeSession.userName)}</p>
                            </div>
                            <button onClick={() => setEndModalOpen(true)} className="bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700">{t('sessionsEndButton')}</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                           <div className="bg-gray-100 p-4 rounded-lg text-center"><p className="text-sm text-gray-600">{t('sessionsOpeningFloat')}</p><p className="text-2xl font-bold">{formatCurrency(activeSession.openingFloat)}</p></div>
                           <div className="bg-green-100 p-4 rounded-lg text-center"><p className="text-sm text-green-800">{t('sessionsTotalCashSales')}</p><p className="text-2xl font-bold text-green-800">{formatCurrency(totalCashSales)}</p></div>
                           <div className="bg-red-100 p-4 rounded-lg text-center"><p className="text-sm text-red-800">{t('sessionsTotalExpenses')}</p><p className="text-2xl font-bold text-red-800">{formatCurrency(totalExpenses)}</p></div>
                           <div className="bg-blue-100 p-4 rounded-lg text-center"><p className="text-sm text-blue-800">{t('sessionsExpectedCash')}</p><p className="text-2xl font-bold text-blue-800">{formatCurrency(expectedCash)}</p></div>
                        </div>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                        <div className="bg-white p-6 rounded-xl shadow-md">
                             <h3 className="text-xl font-bold text-gray-700 mb-4">{t('sessionsRegisterExpense')}</h3>
                             <form onSubmit={handleAddExpense} className="space-y-3">
                                 <input type="number" value={expenseAmount} onChange={e => setExpenseAmount(e.target.value)} placeholder={t('customerPaymentModalAmount')} className="p-2 border rounded-lg w-full" required min="0.01" step="0.01" />
                                 <input type="text" value={expenseReason} onChange={e => setExpenseReason(e.target.value)} placeholder={t('sessionsExpenseReason')} className="p-2 border rounded-lg w-full" required />
                                 <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded-lg font-semibold hover:bg-blue-700">{t('sessionsAddExpenseButton')}</button>
                             </form>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-md">
                            <h3 className="text-xl font-bold text-gray-700 mb-4">{t('sessionsCurrentExpenses')}</h3>
                            <div className="max-h-40 overflow-y-auto">
                               {sessionExpenses.length > 0 ? (
                                    <ul className="divide-y">
                                        {sessionExpenses.map(exp => (<li key={exp.id} className="py-2 flex justify-between"><span>{exp.reason}</span><span className="font-bold">{formatCurrency(exp.amount)}</span></li>))}
                                    </ul>
                               ) : <p className="text-gray-500 text-center pt-8">{t('sessionsNoExpenses')}</p>}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-white p-8 rounded-xl shadow-md text-center mb-8">
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">{t('sessionsInactiveTitle')}</h2>
                    <p className="text-gray-500 mb-6">{t('sessionsInactiveBody')}</p>
                    <button onClick={() => setStartModalOpen(true)} className="bg-blue-600 text-white px-8 py-4 rounded-lg font-bold text-xl hover:bg-blue-700 transition-transform hover:scale-105">{t('sessionsStartButton')}</button>
                </div>
            )}
            
            <div className="bg-white p-6 rounded-xl shadow-md">
                <h2 className="text-2xl font-bold text-gray-700 mb-4">{t('sessionsHistoryTitle')}</h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-right">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="p-3 text-sm font-semibold">{t('sessionsTableStart')}</th>
                                <th className="p-3 text-sm font-semibold">{t('sessionsTableEnd')}</th>
                                <th className="p-3 text-sm font-semibold">{t('username')}</th>
                                <th className="p-3 text-sm font-semibold">{t('sessionsOpeningFloat')}</th>
                                <th className="p-3 text-sm font-semibold">{t('sessionsExpectedCash')}</th>
                                <th className="p-3 text-sm font-semibold">{t('sessionsClosingFloat')}</th>
                                <th className="p-3 text-sm font-semibold">{t('sessionsDifference')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {closedSessions.map(s => (
                                <tr key={s.id} onClick={() => setSelectedSession(s)} className="hover:bg-gray-50 cursor-pointer">
                                    <td className="p-3">{formatDateTime(s.startTime)}</td>
                                    <td className="p-3">{s.endTime ? formatDateTime(s.endTime) : '-'}</td>
                                    <td className="p-3">{s.userName}</td>
                                    <td className="p-3">{formatCurrency(s.openingFloat)}</td>
                                    <td className="p-3">{formatCurrency(s.expectedCash ?? 0)}</td>
                                    <td className="p-3">{formatCurrency(s.closingFloat ?? 0)}</td>
                                    <td className={`p-3 font-bold ${(s.difference ?? 0) === 0 ? 'text-gray-700' : (s.difference ?? 0) > 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(s.difference ?? 0)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {isStartModalOpen && <StartSessionModal onStart={startSession} onClose={() => setStartModalOpen(false)} />}
            {isEndModalOpen && activeSession && <EndSessionModal expectedCash={expectedCash} onEnd={endSession} onClose={() => setEndModalOpen(false)} />}
            {selectedSession && ( <SessionSummaryModal session={selectedSession} sales={sales} expenses={expenses} onClose={() => setSelectedSession(null)} /> )}
        </div>
    );
};

export default Sessions;