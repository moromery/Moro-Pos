import React, { useState, useMemo } from 'react';
import { Sale, Product, Customer, Supplier } from '../types';
import StatCard from '../components/StatCard';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar, PieChart, Pie, Cell } from 'recharts';
import { useTranslation } from '../contexts/LanguageContext';

interface ReportsProps {
    sales: Sale[];
    products: Product[];
    customers: Customer[];
    suppliers: Supplier[];
}

const Reports: React.FC<ReportsProps> = ({ sales, products, customers, suppliers }) => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<'profit' | 'items' | 'expiry' | 'customersDebt' | 'suppliersDebt'>('profit');
    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0],
    });

    const formatCurrency = (amount: number) => new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP' }).format(amount);

    const filteredSales = useMemo(() => {
        const startDate = new Date(dateRange.start);
        const endDate = new Date(dateRange.end);
        endDate.setHours(23, 59, 59, 999); 
        return sales.filter(s => {
            const saleDate = new Date(s.date);
            return saleDate >= startDate && saleDate <= endDate;
        });
    }, [sales, dateRange]);

    const profitData = useMemo(() => {
        const totalRevenue = filteredSales.reduce((sum, s) => sum + s.total, 0);
        const totalCost = filteredSales.reduce((sum, s) => sum + s.totalCost, 0);
        const totalTax = filteredSales.reduce((sum, s) => sum + s.tax, 0);
        const totalProfit = totalRevenue - totalCost - totalTax;
        const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
        return { totalRevenue, totalCost, totalProfit, profitMargin };
    }, [filteredSales]);

    const itemAnalysisData = useMemo(() => {
        const productProfits: { [key: string]: { name: string, profit: number } } = {};
        const productSalesCount: { [key: string]: number } = {};
        
        filteredSales.forEach(sale => {
            sale.items.forEach(item => {
                const profit = (item.unit.price * item.quantity) - (item.costPrice * item.quantity);
                if (productProfits[item.id]) {
                    productProfits[item.id].profit += profit;
                } else {
                    productProfits[item.id] = { name: item.name, profit: profit };
                }
                productSalesCount[item.id] = (productSalesCount[item.id] || 0) + item.quantity;
            });
        });

        const mostProfitable = Object.values(productProfits).sort((a, b) => b.profit - a.profit).slice(0, 10);
        const slowMoving = products.filter(p => !productSalesCount[p.id] && p.stock > 0).slice(0, 10);

        return { mostProfitable, slowMoving };
    }, [filteredSales, products]);

    const expiryReportData = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const expiringBatches = products.flatMap(product => {
            const baseUnit = product.units.find(u => u.factor === 1);
            return product.batches
                .filter(batch => batch.expiryDate && new Date(batch.expiryDate) >= today)
                .map(batch => ({
                    productId: product.id,
                    productName: product.name,
                    batchId: batch.id,
                    quantity: batch.quantity,
                    expiryDate: batch.expiryDate!, 
                    unitName: baseUnit?.name || t('productModalUnit'),
                }));
        });

        expiringBatches.sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

        return expiringBatches;
    }, [products, t]);
    
    const calculateDaysRemaining = (expiryDate: string) => {
        const today = new Date();
        const expDate = new Date(expiryDate);
        const diffTime = expDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    const suppliersDebtData = useMemo(() => {
        const indebted = suppliers.filter(s => s.balance > 0).sort((a, b) => b.balance - a.balance);
        const total = indebted.reduce((sum, s) => sum + s.balance, 0);
        return { data: indebted, total };
    }, [suppliers]);

    const customersDebtData = useMemo(() => {
        const indebted = customers.filter(c => c.id !== 'c1' && c.balance > 0).sort((a, b) => b.balance - a.balance);
        const total = indebted.reduce((sum, c) => sum + c.balance, 0);
        return { data: indebted, total };
    }, [customers]);

    const reportTitles = {
        profit: t('reportsTabProfit'),
        items: t('reportsTabItems'),
        expiry: t('reportsTabExpiry'),
        customersDebt: t('reportsTabCustomersDebt'),
        suppliersDebt: t('reportsTabSuppliersDebt'),
    };

    const handlePrint = () => {
        const printContent = document.querySelector('.printable-area');
        if (!printContent) {
            console.error('Printable area not found!');
            return;
        }
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('Please allow popups for this website to print the report.');
            return;
        }
        const reportTitle = reportTitles[activeTab] || t('reportsTitle');
        let headContent = `<meta charset="UTF-8" /><title>${reportTitle}</title><script src="https://cdn.tailwindcss.com"></script><style>@page{size: A4; margin: 1.5cm;} body{font-family: 'Cairo', sans-serif;} .no-print{display: none !important;}</style>`;
        const bodyContent = printContent.innerHTML;
        printWindow.document.write(`<!DOCTYPE html><html lang="ar" dir="rtl"><head>${headContent}</head><body>${bodyContent}</body></html>`);
        printWindow.document.close();
        setTimeout(() => {
            printWindow.focus();
            printWindow.print();
            printWindow.close();
        }, 1000); 
    };

    const ICONS = {
        revenue: <svg className="h-8 w-8 text-green-800" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg>,
        profit: <svg className="h-8 w-8 text-blue-800" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01" /></svg>,
        margin: <svg className="h-8 w-8 text-yellow-800" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM14.5 9a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM4.5 19.5l15-15" /></svg>,
        print: <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v6a2 2 0 002 2h1v-4a1 1 0 011-1h8a1 1 0 011 1v4h1a2 2 0 002-2v-6a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" /></svg>,
    };

    return (
        <div>
            <div className="no-print">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-4xl font-bold text-gray-800">{t('reportsTitle')}</h1>
                    <button onClick={handlePrint} className="bg-gray-700 text-white px-4 py-3 rounded-lg font-semibold hover:bg-gray-800 transition-colors shadow-sm flex items-center gap-2">
                        {ICONS.print}
                        <span>{t('reportsPrintButton')}</span>
                    </button>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-md mb-6 flex items-center justify-between flex-wrap">
                     <div className="flex gap-2 flex-wrap">
                         <button onClick={() => setActiveTab('profit')} className={`px-4 py-2 rounded-lg font-semibold ${activeTab === 'profit' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>{t('reportsTabProfit')}</button>
                         <button onClick={() => setActiveTab('items')} className={`px-4 py-2 rounded-lg font-semibold ${activeTab === 'items' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>{t('reportsTabItems')}</button>
                         <button onClick={() => setActiveTab('expiry')} className={`px-4 py-2 rounded-lg font-semibold ${activeTab === 'expiry' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>{t('reportsTabExpiry')}</button>
                         <button onClick={() => setActiveTab('customersDebt')} className={`px-4 py-2 rounded-lg font-semibold ${activeTab === 'customersDebt' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>{t('reportsTabCustomersDebt')}</button>
                         <button onClick={() => setActiveTab('suppliersDebt')} className={`px-4 py-2 rounded-lg font-semibold ${activeTab === 'suppliersDebt' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>{t('reportsTabSuppliersDebt')}</button>
                     </div>
                     {!['expiry', 'suppliersDebt', 'customersDebt'].includes(activeTab) && (
                         <div className="flex items-center gap-4 mt-2 md:mt-0">
                             <input type="date" value={dateRange.start} onChange={e => setDateRange(p => ({...p, start: e.target.value}))} className="p-2 border rounded-lg" />
                             <span>{t('reportsDateTo')}</span>
                             <input type="date" value={dateRange.end} onChange={e => setDateRange(p => ({...p, end: e.target.value}))} className="p-2 border rounded-lg" />
                         </div>
                     )}
                </div>
            </div>
            
            <div className="printable-area">
                 <div className="hidden print:block mb-4 text-center border-b pb-4">
                    <h2 className="text-2xl font-bold">{reportTitles[activeTab]}</h2>
                    <p>{t('reportsPrintDate')}: {new Date().toLocaleString('ar-EG')}</p>
                    {!['expiry', 'suppliersDebt', 'customersDebt'].includes(activeTab) && (
                       <p>{t('reportsDateRange', dateRange.start, dateRange.end)}</p>
                    )}
                </div>

                {activeTab === 'profit' && (
                    <div>
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                            <StatCard title={t('reportsTotalRevenue')} value={formatCurrency(profitData.totalRevenue)} icon={ICONS.revenue} color="bg-green-100" />
                            <StatCard title={t('reportsTotalProfit')} value={formatCurrency(profitData.totalProfit)} icon={ICONS.profit} color="bg-blue-100" />
                            <StatCard title={t('reportsProfitMargin')} value={`${profitData.profitMargin.toFixed(2)}%`} icon={ICONS.margin} color="bg-yellow-100" />
                        </div>
                         <div className="bg-white p-6 rounded-xl shadow-md">
                            <h2 className="text-xl font-bold text-gray-700 mb-4">{t('reportsProfitSummary')}</h2>
                            <div className="overflow-x-auto max-h-96">
                                <table className="w-full text-right">
                                    <thead className="bg-gray-50"><tr><th className="p-3">{t('invoiceNumber')}</th><th className="p-3">{t('reportsRevenue')}</th><th className="p-3">{t('cost')}</th><th className="p-3">{t('profit')}</th></tr></thead>
                                    <tbody>
                                        {filteredSales.map(s => {
                                            const profit = s.total - s.tax - s.totalCost;
                                            return (<tr key={s.id} className="border-b"><td className="p-3">{s.id}</td><td className="p-3 text-green-600">{formatCurrency(s.total - s.tax)}</td><td className="p-3 text-red-600">{formatCurrency(s.totalCost)}</td><td className={`p-3 font-bold ${profit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{formatCurrency(profit)}</td></tr>)
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'items' && (
                     <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-xl shadow-md no-print">
                            <h2 className="text-xl font-bold text-gray-700 mb-4">{t('reportsMostProfitable')}</h2>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={itemAnalysisData.mostProfitable} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" /><XAxis type="number" tickFormatter={formatCurrency} /><YAxis dataKey="name" type="category" width={100} interval={0} /><Tooltip formatter={(value) => [formatCurrency(Number(value)), t('profit')]} /><Bar dataKey="profit" fill="#8884d8" name={t('reportsTotalProfit')} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-md">
                            <h2 className="text-xl font-bold text-gray-700 mb-4">{t('reportsSlowMoving')}</h2>
                            {itemAnalysisData.slowMoving.length > 0 ? (
                                <ul className="space-y-2 max-h-72 overflow-y-auto">
                                    {itemAnalysisData.slowMoving.map(p => (<li key={p.id} className="p-2 bg-gray-50 rounded-md flex justify-between"><span>{p.name}</span><span className="font-semibold">{t('quantity')}: {p.stock}</span></li>))}
                                </ul>
                            ) : (
                                <div className="h-[300px] flex items-center justify-center text-gray-500">{t('reportsNoSlowMoving')}</div>
                            )}
                        </div>
                     </div>
                )}
                
                {activeTab === 'expiry' && (
                    <div className="bg-white p-6 rounded-xl shadow-md">
                        <h2 className="text-xl font-bold text-gray-700 mb-4">{t('reportsExpiryTitle')}</h2>
                        <p className="text-sm text-gray-500 mb-4">{t('reportsExpiryDescription')}</p>
                        <div className="overflow-x-auto max-h-[600px]">
                            <table className="w-full text-right"><thead className="bg-gray-50 sticky top-0"><tr><th className="p-3 text-sm font-semibold">{t('inventoryTableProduct')}</th><th className="p-3 text-sm font-semibold">{t('reportsExpiryQuantity')}</th><th className="p-3 text-sm font-semibold">{t('productModalExpiryDate')}</th><th className="p-3 text-sm font-semibold">{t('reportsExpiryDaysLeft')}</th></tr></thead>
                                <tbody>
                                    {expiryReportData.map(item => {
                                        const daysRemaining = calculateDaysRemaining(item.expiryDate);
                                        let rowClass = 'border-b';
                                        if (daysRemaining <= 7) { rowClass += ' bg-red-50 text-red-900'; } else if (daysRemaining <= 30) { rowClass += ' bg-yellow-50 text-yellow-900'; }
                                        return (<tr key={item.batchId} className={rowClass}><td className="p-3 font-semibold">{item.productName}</td><td className="p-3">{item.quantity} {item.unitName}</td><td className="p-3">{new Date(item.expiryDate).toLocaleDateString('ar-EG')}</td><td className="p-3 font-bold">{daysRemaining}</td></tr>);
                                    })}
                                    {expiryReportData.length === 0 && (<tr><td colSpan={4} className="text-center p-8 text-gray-500">{t('reportsNoExpiry')}</td></tr>)}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'customersDebt' && (
                    <div className="bg-white p-6 rounded-xl shadow-md">
                        <h2 className="text-xl font-bold text-gray-700 mb-4">{t('reportsCustomersDebtTitle')}</h2>
                        <div className="overflow-x-auto max-h-[600px]">
                            <table className="w-full text-right"><thead className="bg-gray-50 sticky top-0"><tr><th className="p-3 text-sm font-semibold">{t('customer')}</th><th className="p-3 text-sm font-semibold">{t('customersTablePhone')}</th><th className="p-3 text-sm font-semibold">{t('reportsDebtBalance')}</th></tr></thead>
                                <tbody className="divide-y divide-gray-100">{customersDebtData.data.map(customer => (<tr key={customer.id}><td className="p-3 font-semibold">{customer.name}</td><td className="p-3 text-gray-600">{customer.phone}</td><td className="p-3 font-bold text-red-600">{formatCurrency(customer.balance)}</td></tr>))}</tbody>
                                <tfoot className="bg-gray-100"><tr><td colSpan={2} className="p-3 font-bold text-lg text-right">{t('total')}</td><td className="p-3 font-bold text-lg text-red-600">{formatCurrency(customersDebtData.total)}</td></tr></tfoot>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'suppliersDebt' && (
                    <div className="bg-white p-6 rounded-xl shadow-md">
                        <h2 className="text-xl font-bold text-gray-700 mb-4">{t('reportsSuppliersDebtTitle')}</h2>
                        <div className="overflow-x-auto max-h-[600px]">
                            <table className="w-full text-right"><thead className="bg-gray-50 sticky top-0"><tr><th className="p-3 text-sm font-semibold">{t('purchasesTableSupplier')}</th><th className="p-3 text-sm font-semibold">{t('customersTablePhone')}</th><th className="p-3 text-sm font-semibold">{t('reportsDebtBalance')}</th></tr></thead>
                                <tbody className="divide-y divide-gray-100">{suppliersDebtData.data.map(supplier => (<tr key={supplier.id}><td className="p-3 font-semibold">{supplier.company}</td><td className="p-3 text-gray-600">{supplier.phone}</td><td className="p-3 font-bold text-red-600">{formatCurrency(supplier.balance)}</td></tr>))}</tbody>
                                 <tfoot className="bg-gray-100"><tr><td colSpan={2} className="p-3 font-bold text-lg text-right">{t('total')}</td><td className="p-3 font-bold text-lg text-red-600">{formatCurrency(suppliersDebtData.total)}</td></tr></tfoot>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Reports;