import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Inventory from './pages/Inventory';
import Sales from './pages/Sales';
import Customers from './pages/Customers';
import Suppliers from './pages/Suppliers';
import Settings from './pages/Settings';
import Categories from './pages/Categories';
import { Page, Purchase } from './types';
import usePosState from './hooks/usePosState';
import Adjustments from './pages/Adjustments';
import Reports from './pages/Reports';
import CustomerProfile from './pages/CustomerProfile';
import SupplierProfile from './pages/SupplierProfile';
import Login from './pages/Login';
import Sessions from './pages/Sessions';
import { PERMISSIONS } from './permissions';
import Purchases from './pages/Purchases';
import SupplierReturns from './pages/SupplierReturns';
import { useTranslation } from './contexts/LanguageContext';
import { logo } from './assets/logo';

const App: React.FC = () => {
  const [activePage, setActivePage] = useState<Page>('dashboard');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const posState = usePosState();
  const { currentUser, login, logout, isLoading } = posState;
  const { t, language } = useTranslation();

  const viewProfile = (page: 'customerProfile' | 'supplierProfile', id: string) => {
    setActivePage(page);
    setSelectedId(id);
  };

  const goBackToList = (page: 'customers' | 'suppliers') => {
      setActivePage(page);
      setSelectedId(null);
  };

  if (isLoading) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="text-center">
                <img src={logo} alt="Moro POS Logo" className="w-48 mx-auto animate-pulse" />
                <h2 className="mt-4 text-2xl font-semibold text-gray-700">{t('loadingData')}...</h2>
                <p className="text-gray-500">{t('pleaseWait')}.</p>
            </div>
        </div>
    );
  }


  const renderPage = () => {
    if (!currentUser) return null; // Should not happen if logic is correct

    // Check permissions
    const allowedPages = PERMISSIONS[currentUser.role];
    let pageToCheck: Page = activePage;
    if (activePage === 'customerProfile') pageToCheck = 'customers';
    if (activePage === 'supplierProfile') pageToCheck = 'suppliers';
    
    if (!allowedPages.includes(pageToCheck)) {
        // If trying to access a restricted page, default to dashboard
        setActivePage('dashboard');
        return <Dashboard 
                  sales={posState.sales} 
                  products={posState.products}
                  notifications={posState.notifications}
                  dismissNotification={posState.dismissNotification}
                />;
    }


    switch (activePage) {
      case 'dashboard':
        return <Dashboard 
                  sales={posState.sales} 
                  products={posState.products}
                  notifications={posState.notifications}
                  dismissNotification={posState.dismissNotification}
                />;
      case 'pos':
        return <POS {...posState} />;
      case 'inventory':
        return <Inventory {...posState} />;
      case 'adjustments':
        return <Adjustments 
                  adjustments={posState.adjustments}
                  products={posState.products}
                  addAdjustment={posState.addAdjustment}
                />;
      case 'categories':
        return <Categories 
                  categories={posState.categories} 
                  products={posState.products}
                  addCategory={posState.addCategory} 
                  updateCategory={posState.updateCategory}
                  deleteCategory={posState.deleteCategory}
                />;
      case 'sales':
        return <Sales 
                  sales={posState.sales} 
                  products={posState.products} 
                  updateSale={posState.updateSale} 
                  customers={posState.customers}
                  storeInfo={posState.storeInfo}
                  showTaxInReceipt={posState.showTaxInReceipt}
                />;
      case 'purchases':
        return <Purchases {...posState} />;
      case 'supplierReturns':
        return <SupplierReturns {...posState} />;
      case 'customers':
        return <Customers {...posState} onViewProfile={id => viewProfile('customerProfile', id)} />;
      case 'suppliers':
        return <Suppliers {...posState} onViewProfile={id => viewProfile('supplierProfile', id)} />;
      case 'reports':
        return <Reports sales={posState.sales} products={posState.products} customers={posState.customers} suppliers={posState.suppliers} />;
      case 'sessions':
        return <Sessions {...posState} />;
      case 'settings':
        return <Settings {...posState} />;
      case 'customerProfile': {
        const customer = posState.customers.find(c => c.id === selectedId);
        if (!customer) {
            goBackToList('customers');
            return <div>{t('customerNotFound')}</div>;
        }
        const customerSales = posState.sales.filter(s => s.customerId === selectedId);
        const customerPayments = posState.customerPayments.filter(p => p.customerId === selectedId);
        return <CustomerProfile 
                  customer={customer} 
                  sales={customerSales} 
                  payments={customerPayments} 
                  onBack={() => goBackToList('customers')}
                  products={posState.products}
                  updateSale={posState.updateSale}
                  storeInfo={posState.storeInfo}
                  showTaxInReceipt={posState.showTaxInReceipt}
               />;
      }
      case 'supplierProfile': {
        const supplier = posState.suppliers.find(s => s.id === selectedId);
        if (!supplier) {
            goBackToList('suppliers');
            return <div>{t('supplierNotFound')}</div>;
        }
        const supplierPurchases = posState.purchases.filter(p => p.supplierId === selectedId);
        const supplierPayments = posState.supplierPayments.filter(p => p.supplierId === selectedId);
        return <SupplierProfile 
                    supplier={supplier} 
                    purchases={supplierPurchases} 
                    payments={supplierPayments} 
                    onBack={() => goBackToList('suppliers')} 
                />;
      }
      default:
        return <Dashboard 
                  sales={posState.sales} 
                  products={posState.products}
                  notifications={posState.notifications}
                  dismissNotification={posState.dismissNotification}
                />;
    }
  };

  if (!currentUser) {
    return <Login onLogin={login} />;
  }

  return (
    <div className={`bg-gray-100 min-h-screen flex ${language === 'ar' ? 'flex-row' : 'flex-row-reverse'}`}>
      <Sidebar 
        activePage={activePage} 
        setActivePage={(page) => {
          setSelectedId(null);
          setActivePage(page);
        }}
        currentUser={currentUser}
        logout={logout}
      />
      <main className="flex-1 p-8 overflow-auto">
        {renderPage()}
      </main>
    </div>
  );
};

export default App;