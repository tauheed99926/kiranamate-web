import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { POS } from './pages/POS';
import { Products } from './pages/Products';
import { BarcodeScannerPage } from './pages/BarcodeScannerPage';
import { Bills } from './pages/Bills';
import { Purchases } from './pages/Purchases';
import { Alerts } from './pages/Alerts';
import { Reports } from './pages/Reports';
import { Categories } from './pages/Categories';
import { Customers } from './pages/Customers';
import { Suppliers } from './pages/Suppliers';
import { Settings } from './pages/Settings';

const AppContent: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [tabProps, setTabProps] = useState<any>({});

  const handleNavigate = (tab: string, state?: any) => {
    setCurrentTab(tab);
    setTabProps(state || {});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Keyboard shortcut listener: F2 switches to POS
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        handleNavigate('pos');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500 font-semibold tracking-wide">Starting KiranaMate...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <Layout currentTab={currentTab} onTabChange={handleNavigate}>
      {currentTab === 'dashboard' && <Dashboard onNavigate={handleNavigate} />}
      {currentTab === 'pos' && <POS />}
      {currentTab === 'scan' && <BarcodeScannerPage onNavigate={handleNavigate} />}
      {currentTab === 'products' && <Products initialState={tabProps} />}
      {currentTab === 'bills' && <Bills />}
      {currentTab === 'purchases' && <Purchases />}
      {currentTab === 'alerts' && <Alerts onNavigate={handleNavigate} />}
      {currentTab === 'reports' && <Reports />}
      {currentTab === 'categories' && <Categories />}
      {currentTab === 'customers' && <Customers />}
      {currentTab === 'suppliers' && <Suppliers />}
      {currentTab === 'settings' && <Settings />}
    </Layout>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
