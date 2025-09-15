



import React, { useMemo } from 'react';
import StatCard from '../components/StatCard';
import { Sale, Product, Notification } from '../types';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar } from 'recharts';
// FIX: Added TranslationKey to handle type change in Notification interface
import { useTranslation, TranslationKey } from '../contexts/LanguageContext';

interface DashboardProps {
  sales: Sale[];
  products: Product[];
  notifications: Notification[];
  dismissNotification: (id: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ sales, products, notifications, dismissNotification }) => {
  const { t, language, currency } = useTranslation();
  
  const totalSales = sales.reduce((sum, sale) => sum + sale.total, 0);
  const totalTransactions = sales.length;
  const totalProducts = products.length;
  const lowStockProducts = products.filter(p => p.stock < 10).length;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(language === 'ar' ? 'ar-EG' : 'en-US', { style: 'currency', currency: currency }).format(amount);
  };

  const weeklySalesData = useMemo(() => {
    const days = language === 'ar' 
        ? ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
        : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const salesByDay = Array(7).fill(0).map((_, i) => ({ name: days[i], total: 0 }));

    const today = new Date();
    // Assuming Sunday is day 0
    const firstDayOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
    firstDayOfWeek.setHours(0, 0, 0, 0);

    const lastDayOfWeek = new Date(firstDayOfWeek);
    lastDayOfWeek.setDate(lastDayOfWeek.getDate() + 6);
    lastDayOfWeek.setHours(23, 59, 59, 999);

    sales.forEach(sale => {
      const saleDate = new Date(sale.date);
      if (saleDate >= firstDayOfWeek && saleDate <= lastDayOfWeek) {
        salesByDay[saleDate.getDay()].total += sale.total;
      }
    });

    return salesByDay;
  }, [sales, language]);

  const slowMovingProductsData = useMemo(() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const soldProductIds = new Set<string>();
    sales.forEach(sale => {
      if (new Date(sale.date) >= thirtyDaysAgo) {
        sale.items.forEach(item => soldProductIds.add(item.id));
      }
    });

    return products
      .filter(p => p.stock > 0 && !soldProductIds.has(p.id))
      .slice(0, 10); // Show top 10 slow-moving products
  }, [sales, products]);

  const ICONS = {
    sales: <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-800" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01" /></svg>,
    transactions: <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-800" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
    products: <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-800" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>,
    lowStock: <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-800" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
  };

  const NOTIFICATION_ICONS = {
    low_stock: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
    expiry: <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  };

  return (
    <div>
      {notifications.length > 0 && (
        <div className="mb-6 space-y-3">
          {notifications.map(notification => {
            const isLowStock = notification.type === 'low_stock';
            const bgColor = isLowStock ? 'bg-yellow-100 border-yellow-400' : 'bg-red-100 border-red-400';
            const textColor = isLowStock ? 'text-yellow-800' : 'text-red-800';
            const icon = NOTIFICATION_ICONS[notification.type];
            const borderDir = language === 'ar' ? 'border-r-4' : 'border-l-4';

            return (
              <div key={notification.id} className={`p-4 ${borderDir} rounded-lg shadow-sm flex items-center justify-between ${bgColor}`}>
                <div className="flex items-center">
                  <div className={`${language === 'ar' ? 'ml-4' : 'mr-4'} ${textColor}`}>{icon}</div>
                  {/* FIX: Cast messageKey to TranslationKey due to circular dependency fix in types.ts */}
                  <p className={`font-semibold ${textColor}`}>{t(notification.messageKey as TranslationKey, ...(notification.messageArgs || []))}</p>
                </div>
                <button 
                  onClick={() => dismissNotification(notification.id)} 
                  className={`p-1 rounded-full hover:bg-black/10 transition-colors ${textColor}`}
                  aria-label={t('dismissAlert')}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      )}
      <h1 className="text-4xl font-bold text-gray-800 mb-6">{t('dashboardTitle')}</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title={t('totalSales')} value={formatCurrency(totalSales)} icon={ICONS.sales} color="bg-green-100" />
        <StatCard title={t('totalTransactions')} value={totalTransactions} icon={ICONS.transactions} color="bg-blue-100" />
        <StatCard title={t('totalProducts')} value={totalProducts} icon={ICONS.products} color="bg-purple-100" />
        <StatCard title={t('lowStockProducts')} value={lowStockProducts} icon={ICONS.lowStock} color="bg-red-100" />
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-md">
          <h2 className="text-xl font-bold text-gray-700 mb-4">{t('weeklySales')}</h2>
          {weeklySalesData.some(day => day.total > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={weeklySalesData} margin={{ top: 5, right: language === 'ar' ? 20 : 0, left: language === 'ar' ? -10 : 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(value) => formatCurrency(Number(value))} orientation={language === 'ar' ? 'right' : 'left'}/>
                <Tooltip formatter={(value) => [formatCurrency(Number(value)), t('totalSales')]} />
                <Bar dataKey="total" fill="#3b82f6" name={t('totalSales')} />
              </BarChart>
            </ResponsiveContainer>
           ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
                {t('noSalesThisWeek')}
            </div>
           )}
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md">
          <h2 className="text-xl font-bold text-gray-700 mb-4">{t('slowMovingProducts')}</h2>
          {slowMovingProductsData.length > 0 ? (
            <div className="h-[300px] overflow-y-auto">
              <ul className={`space-y-3 ${language === 'ar' ? 'pr-2' : 'pl-2'}`}>
                {slowMovingProductsData.map(product => (
                  <li key={product.id} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                    <span className="font-medium text-gray-700">{product.name}</span>
                    <span className="font-bold bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full text-sm">
                      {t('stockLabel')}: {Math.floor(product.stock)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
                {t('noSlowMovingProducts')}
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 bg-white p-6 rounded-xl shadow-md">
        <h2 className="text-2xl font-bold text-gray-700 mb-4">{t('latestSales')}</h2>
        <div className="overflow-x-auto">
          <table className={`w-full ${language === 'ar' ? 'text-right' : 'text-left'}`}>
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-sm font-semibold tracking-wide">{t('invoiceNumber')}</th>
                <th className="p-3 text-sm font-semibold tracking-wide">{t('date')}</th>
                <th className="p-3 text-sm font-semibold tracking-wide">{t('paymentMethod')}</th>
                <th className="p-3 text-sm font-semibold tracking-wide">{t('total')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sales.slice(0, 5).map(sale => {
                const paymentMethodKey = sale.payments.length > 1 ? 'paymentMethodMultiple' : sale.payments[0] ? `paymentMethod${sale.payments[0].method.charAt(0).toUpperCase() + sale.payments[0].method.slice(1)}` : 'paymentMethodUnspecified';
                const paymentMethod = t(paymentMethodKey as any);

                const paymentColor =
                    sale.payments.length > 1 ? 'bg-purple-200 text-purple-800' :
                    sale.payments[0]?.method === 'cash' ? 'bg-green-200 text-green-800' :
                    sale.payments[0]?.method === 'card' ? 'bg-blue-200 text-blue-800' :
                    sale.payments[0]?.method === 'deferred' ? 'bg-orange-200 text-orange-800' :
                    'bg-gray-200 text-gray-800';

                return (
                  <tr key={sale.id}>
                    <td className="p-3 text-sm text-gray-700">{sale.id}</td>
                    <td className="p-3 text-sm text-gray-700">{new Date(sale.date).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}</td>
                    <td className="p-3 text-sm text-gray-700">
                      <span className={`p-1.5 text-xs font-medium uppercase tracking-wider rounded-lg ${paymentColor}`}>
                        {paymentMethod}
                      </span>
                    </td>
                    <td className="p-3 text-sm text-gray-700 font-bold">{formatCurrency(sale.total)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
