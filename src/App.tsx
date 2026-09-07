import React, { useState, useEffect } from 'react';
import Calculator from './components/Calculator';
import Sales from './components/Sales';
import Purchases from './components/Purchases';
import Reports from './components/Reports';
import ProductsManager from './components/ProductsManager';
import Settings from './components/Settings';
import { UserSwitchModal, ActionPinModal } from './components/UserAuthModal';
import Warehouse from './components/Warehouse';
import { Transaction, Purchase, Product, User, StoreInfo, DEFAULT_STORE_INFO } from './types';
import { 
  ShoppingCart, 
  FileText, 
  BarChart3, 
  Store, 
  Package, 
  Boxes,
  Settings as SettingsIcon,
  UserCheck,
  RefreshCw,
  LogOut,
  Lock,
  ShieldCheck,
  Calculator as CalculatorIcon,
  Maximize,
  Minimize,
  Crown
} from 'lucide-react';

type Tab = 'sales' | 'purchases' | 'warehouse' | 'products' | 'reports' | 'settings';

const DEFAULT_USERS: User[] = [
  {
    id: 'u-super',
    name: 'مُعد النظام',
    username: 'developer',
    passwordPin: '9999',
    role: 'super_admin',
    isSuperAdmin: true,
    canAccessReports: true,
    canAccessPurchases: true,
    canDeleteData: true,
    canAccessSettings: true,
  },
  {
    id: 'u-1',
    name: 'مدير النظام',
    username: 'admin',
    passwordPin: '1234',
    role: 'admin',
    canAccessReports: true,
    canAccessPurchases: true,
    canDeleteData: true,
    canAccessSettings: true,
  },
  {
    id: 'u-2',
    name: 'علي المزداوي',
    username: 'ali',
    passwordPin: '1111',
    role: 'cashier',
    canAccessReports: false,
    canAccessPurchases: false,
    canDeleteData: false,
    canAccessSettings: false,
  },
];

const DEFAULT_PRODUCTS: Product[] = [
  { id: '1', name: 'حليب كامل الدسم', category: 'ألبان وأجبان', price: 3.5, stock: 4, reorderPoint: 5, isFavorite: true },
  { id: '2', name: 'خبز طازج', category: 'طازج ومخبوزات', price: 1.0, stock: 25, reorderPoint: 10, isFavorite: true },
  { id: '3', name: 'بيض (طبق)', category: 'طازج ومخبوزات', price: 12.0, stock: 2, reorderPoint: 5, isFavorite: true },
  { id: '4', name: 'جبنة شيدر', category: 'ألبان وأجبان', price: 8.5, stock: 12, reorderPoint: 3 },
  { id: '5', name: 'زيت زيتون', category: 'معلبات ومواد غذائية', price: 25.0, stock: 8, reorderPoint: 4 },
  { id: '6', name: 'أرز بسمتي 5 كجم', category: 'معلبات ومواد غذائية', price: 35.0, stock: 3, reorderPoint: 5 },
  { id: '7', name: 'سكر 1 كجم', category: 'معلبات ومواد غذائية', price: 2.5, stock: 15, reorderPoint: 5, isFavorite: true },
  { id: '8', name: 'شاي أسود', category: 'مشروبات وعصائر', price: 5.0, stock: 10, reorderPoint: 2 },
  { id: '9', name: 'طماطم معلبة', category: 'معلبات ومواد غذائية', price: 2.0, stock: 6, reorderPoint: 6 },
  { id: '10', name: 'مكرونة', category: 'معلبات ومواد غذائية', price: 1.5, stock: 20, reorderPoint: 5, isFavorite: true },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('sales');

  // Users State
  const [users, setUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem('pos_users');
      let loaded: User[] = saved ? JSON.parse(saved) : DEFAULT_USERS;
      loaded = loaded.map(u => ({
        ...u,
        name: u.name.replace(/ \(المدير الخارق\)|الخارق|خارق/g, '').trim()
      }));
      if (!loaded.some(u => u.role === 'super_admin' || u.isSuperAdmin || u.username === 'developer')) {
        loaded = [DEFAULT_USERS[0], ...loaded];
      }
      return loaded;
    } catch (e) {
      console.error('Error reading users from localStorage:', e);
      return DEFAULT_USERS;
    }
  });

  // Store Info State
  const [storeInfo, setStoreInfo] = useState<StoreInfo>(() => {
    try {
      const saved = localStorage.getItem('pos_store_info');
      return saved ? JSON.parse(saved) : DEFAULT_STORE_INFO;
    } catch (e) {
      return DEFAULT_STORE_INFO;
    }
  });

  // Current User State
  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('pos_current_user_id');
      return saved || 'u-2'; // Default to cashier
    } catch (e) {
      return 'u-2';
    }
  });

  const currentUser = users.find(u => u.id === currentUserId) || users[0] || DEFAULT_USERS[0];

  // Auth Modals State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isUserSwitchOpen, setIsUserSwitchOpen] = useState(false);
  const [pendingTabAccess, setPendingTabAccess] = useState<Tab | null>(null);
  const [showTabPinModal, setShowTabPinModal] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  
  // Load transactions, purchases, products, vat
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem('pos_transactions');
      if (!saved) return [];
      const loaded: Transaction[] = JSON.parse(saved);
      // Ensure all historical transactions have sequential invoice numbers ordered chronologically
      const sortedChronological = [...loaded].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      let currentSeq = 1;
      const seqMap = new Map<string, number>();
      sortedChronological.forEach(t => {
        if (t.invoiceNumber && typeof t.invoiceNumber === 'number' && t.invoiceNumber > 0) {
          currentSeq = Math.max(currentSeq, t.invoiceNumber + 1);
          seqMap.set(t.id, t.invoiceNumber);
        } else {
          seqMap.set(t.id, currentSeq++);
        }
      });

      return loaded.map(t => ({
        ...t,
        invoiceNumber: t.invoiceNumber || seqMap.get(t.id) || 1
      }));
    } catch (e) {
      console.error('Error reading transactions from localStorage:', e);
      return [];
    }
  });
  
  const [purchases, setPurchases] = useState<Purchase[]>(() => {
    try {
      const saved = localStorage.getItem('pos_purchases');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Error reading purchases from localStorage:', e);
      return [];
    }
  });

  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem('pos_products');
      return saved ? JSON.parse(saved) : DEFAULT_PRODUCTS;
    } catch (e) {
      console.error('Error reading products from localStorage:', e);
      return DEFAULT_PRODUCTS;
    }
  });

  const [vatRate, setVatRate] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('pos_vat_rate');
      return saved !== null ? parseFloat(saved) : 0;
    } catch (e) {
      console.error('Error reading vatRate from localStorage:', e);
      return 0;
    }
  });

  // Save State Effects
  useEffect(() => {
    localStorage.setItem('pos_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('pos_store_info', JSON.stringify(storeInfo));
  }, [storeInfo]);

  useEffect(() => {
    localStorage.setItem('pos_current_user_id', currentUserId);
  }, [currentUserId]);

  useEffect(() => {
    localStorage.setItem('pos_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('pos_purchases', JSON.stringify(purchases));
  }, [purchases]);

  useEffect(() => {
    localStorage.setItem('pos_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('pos_vat_rate', vatRate.toString());
  }, [vatRate]);

  // Fullscreen effect listener & auto-fullscreen on first launch/interaction
  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', onFullscreenChange);

    // Auto-fullscreen on first user interaction if enabled or on launch
    const handleFirstInteraction = () => {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {
          // Ignore browser restriction errors in sandboxed frames
        });
      }
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };

    window.addEventListener('click', handleFirstInteraction, { once: true });
    window.addEventListener('keydown', handleFirstInteraction, { once: true });

    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };
  }, []);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  // Tab Switch Guard
  const handleTabClick = (tab: Tab) => {
    if (tab === 'purchases' && !currentUser.canAccessPurchases && currentUser.role !== 'admin') {
      setPendingTabAccess('purchases');
      setShowTabPinModal(true);
      return;
    }

    if (tab === 'reports' && !currentUser.canAccessReports && currentUser.role !== 'admin') {
      setPendingTabAccess('reports');
      setShowTabPinModal(true);
      return;
    }

    if (tab === 'settings' && !currentUser.canAccessSettings && currentUser.role !== 'admin') {
      setPendingTabAccess('settings');
      setShowTabPinModal(true);
      return;
    }

    setActiveTab(tab);
  };

  const handleTabPinSuccess = () => {
    if (pendingTabAccess) {
      setActiveTab(pendingTabAccess);
      setPendingTabAccess(null);
    }
  };

  // User Handlers
  const handleSwitchUser = (user: User) => {
    setCurrentUserId(user.id);
    setIsAuthenticated(true);
  };

  const handleAddUser = (user: User) => {
    setUsers(prev => [...prev, user]);
  };

  const handleUpdateUser = (updatedUser: User) => {
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
  };

  const handleDeleteUser = (userId: string) => {
    setUsers(prev => prev.filter(u => u.id !== userId));
  };

  // Transaction Handler
  const handleTransactionComplete = (transaction: Transaction) => {
    let nextInvoiceNumber = transaction.invoiceNumber;
    if (!nextInvoiceNumber) {
      const highestExisting = transactions.reduce((max, t) => {
        return (t.invoiceNumber && t.invoiceNumber > max) ? t.invoiceNumber : max;
      }, 0);
      nextInvoiceNumber = Math.max(highestExisting, transactions.length) + 1;
    }

    const newTransaction: Transaction = { 
      ...transaction, 
      invoiceNumber: nextInvoiceNumber,
      status: 'completed' as const 
    };
    setTransactions(prev => [newTransaction, ...prev]);

    // Automatically decrement product stock if defined
    setProducts(prevProducts =>
      prevProducts.map(product => {
        const matchingItems = newTransaction.items.filter(item => item.id === product.id);
        if (matchingItems.length > 0 && product.stock !== undefined) {
          const totalPiecesDeducted = matchingItems.reduce(
            (sum, item) => sum + item.quantity * (item.unitMultiplier || 1),
            0
          );
          const newStock = Math.max(0, product.stock - totalPiecesDeducted);
          return { ...product, stock: newStock };
        }
        return product;
      })
    );
  };

  const handleCancelTransaction = (id: string) => {
    setTransactions(prev => {
      const tx = prev.find(t => t.id === id);
      if (tx && tx.status !== 'cancelled') {
        // Automatically increment product stock if defined
        setProducts(prevProducts =>
          prevProducts.map(product => {
            const matchingItems = tx.items.filter(item => item.id === product.id);
            if (matchingItems.length > 0 && product.stock !== undefined) {
              const totalPiecesRestored = matchingItems.reduce(
                (sum, item) => sum + item.quantity * (item.unitMultiplier || 1),
                0
              );
              return { ...product, stock: product.stock + totalPiecesRestored };
            }
            return product;
          })
        );
      }
      return prev.map(t => t.id === id ? { ...t, status: 'cancelled' } : t);
    });
  };

  const handleAddPurchase = (purchase: Purchase) => {
    setPurchases(prev => [purchase, ...prev]);
  };

  const handleAddProduct = (product: Product) => {
    setProducts(prev => [product, ...prev]);
  };

  const handleUpdateProduct = (updatedProduct: Product) => {
    setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
  };

  const handleDeleteProduct = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const handleToggleFavoriteProduct = (id: string) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, isFavorite: !p.isFavorite } : p));
  };

  const handleRestoreData = (
    restored: { products: Product[]; transactions: Transaction[]; purchases: Purchase[]; users?: User[] },
    mergeMode: boolean
  ) => {
    if (mergeMode) {
      setProducts(prev => {
        const existingIds = new Set(prev.map(p => p.id));
        const newProducts = restored.products.filter(p => !existingIds.has(p.id));
        return [...prev, ...newProducts];
      });

      setTransactions(prev => {
        const existingIds = new Set(prev.map(t => t.id));
        const newTx = restored.transactions.filter(t => !existingIds.has(t.id));
        return [...prev, ...newTx];
      });

      setPurchases(prev => {
        const existingIds = new Set(prev.map(p => p.id));
        const newPurchases = restored.purchases.filter(p => !existingIds.has(p.id));
        return [...prev, ...newPurchases];
      });

      if (restored.users && restored.users.length > 0) {
        setUsers(prev => {
          const existingIds = new Set(prev.map(u => u.id));
          const newUsers = restored.users!.filter(u => !existingIds.has(u.id));
          return [...prev, ...newUsers];
        });
      }
    } else {
      setProducts(restored.products || []);
      setTransactions(restored.transactions || []);
      setPurchases(restored.purchases || []);
      if (restored.users && restored.users.length > 0) {
        setUsers(restored.users);
      }
    }
  };

  const handleResetData = () => {
    setProducts(DEFAULT_PRODUCTS);
    setTransactions([]);
    setPurchases([]);
    localStorage.removeItem('pos_products');
    localStorage.removeItem('pos_transactions');
    localStorage.removeItem('pos_purchases');
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100 overflow-hidden font-sans" dir="rtl">
      
      {/* Top Auto-Fullscreen Banner (Hidden when in Fullscreen or during Print) */}
      {!isFullScreen && (
        <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white px-4 py-1.5 text-xs font-bold flex items-center justify-between shadow-xs print:hidden z-20">
          <div className="flex items-center gap-2">
            <Maximize size={15} className="text-blue-300 animate-pulse" />
            <span>للحصول على أفضل تجربة للكاشير: اضغط هنا لتفعيل وضع ملء الشاشة الكامل (F11)</span>
          </div>
          <button 
            onClick={toggleFullScreen}
            className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded-lg text-[11px] font-extrabold flex items-center gap-1 shadow-xs transition active:scale-95 cursor-pointer"
          >
            <Maximize size={13} />
            تفعيل ملء الشاشة
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        
        {/* Navigation Bar */}
        <nav className="bg-white border-b border-gray-200 px-4 py-2.5 flex flex-wrap gap-2 items-center justify-between shadow-xs z-10">
          <div className="flex gap-4 overflow-x-auto items-center">
            
            {/* Logo and Title */}
            <div className="flex items-center gap-2 pl-4 border-l border-gray-200 ml-2 py-1">
              <Store size={22} className="text-blue-700 shrink-0" />
              <div>
                <h1 className="text-sm md:text-base font-extrabold text-blue-900 tracking-tight leading-none">
                  {storeInfo.name}
                </h1>
                {storeInfo.subtitle && (
                  <span className="text-[10px] text-gray-500 font-bold block mt-0.5 leading-none">
                    {storeInfo.subtitle}
                  </span>
                )}
              </div>
            </div>

            <div className="flex gap-1.5 items-center">
            <button
              onClick={() => handleTabClick('sales')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold text-xs transition whitespace-nowrap ${
                activeTab === 'sales' 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <ShoppingCart size={18} />
              المبيعات
            </button>
            
            <button
              onClick={() => handleTabClick('purchases')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold text-xs transition whitespace-nowrap ${
                activeTab === 'purchases' 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <FileText size={18} />
              المشتريات
              {!currentUser.canAccessPurchases && currentUser.role !== 'admin' && (
                <Lock size={12} className="text-amber-500" />
              )}
            </button>

            <button
              onClick={() => handleTabClick('products')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold text-xs transition whitespace-nowrap ${
                activeTab === 'products' 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Package size={18} />
              المنتجات
            </button>

            <button
              onClick={() => handleTabClick('warehouse')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold text-xs transition whitespace-nowrap ${
                activeTab === 'warehouse' 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Boxes size={18} />
              المخزن والجرد
            </button>

            <button
              onClick={() => handleTabClick('reports')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold text-xs transition whitespace-nowrap ${
                activeTab === 'reports' 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <BarChart3 size={18} />
              التقارير
              {!currentUser.canAccessReports && currentUser.role !== 'admin' && (
                <Lock size={12} className="text-amber-500" />
              )}
            </button>

            <button
              onClick={() => handleTabClick('settings')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold text-xs transition whitespace-nowrap ${
                activeTab === 'settings' 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <SettingsIcon size={18} />
              الإعدادات والمستخدمون
              {!currentUser.canAccessSettings && currentUser.role !== 'admin' && (
                <Lock size={12} className="text-amber-500" />
              )}
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Fullscreen Toggle Button */}
            <button
              onClick={toggleFullScreen}
              className="flex items-center justify-center p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition active:scale-95 border border-gray-200"
              title={isFullScreen ? "تصغير الشاشة" : "ملء الشاشة"}
            >
              {isFullScreen ? <Minimize size={18} /> : <Maximize size={18} />}
            </button>

            {/* Calculator Quick Launcher Button */}
            <button
              onClick={() => setIsCalculatorOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition shadow-2xs active:scale-95"
              title="فتح الآلة الحاسبة"
            >
              <div className="p-1 bg-slate-700 text-blue-400 rounded-lg">
                <CalculatorIcon size={14} />
              </div>
              <span className="hidden sm:inline">حاسبة</span>
            </button>

            {/* User Status & Logout Button */}
            <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-1 py-1 shadow-sm">
               <div className="flex items-center gap-2 px-2 border-l border-gray-200">
                 <div className={`p-1 rounded-lg ${currentUser.role === 'super_admin' || currentUser.isSuperAdmin ? 'bg-purple-100 text-purple-900' : 'bg-blue-100 text-blue-700'}`}>
                    {currentUser.role === 'super_admin' || currentUser.isSuperAdmin ? <Crown size={14} /> : <UserCheck size={14} />}
                 </div>
                 <div className="text-right">
                   <span className="block leading-none text-gray-900 font-bold text-xs">{currentUser.name}</span>
                   <span className="text-[10px] text-gray-500 leading-none mt-1 block font-bold">
                     {currentUser.role === 'super_admin' || currentUser.isSuperAdmin ? '👑 مُعد النظام' : currentUser.role === 'admin' ? 'مدير' : 'كاشير'}
                   </span>
                 </div>
               </div>
               <button
                 onClick={() => setIsUserSwitchOpen(true)}
                 className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-xs font-bold transition active:scale-95 border border-red-100"
               >
                 <LogOut size={14} />
                 <span className="hidden sm:inline">تبديل الكاشير</span>
               </button>
            </div>
          </div>
          </div>
        </nav>

        {/* Dynamic View Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50">
          {activeTab === 'sales' && (
            <Sales 
              products={products} 
              transactions={transactions} 
              vatRate={vatRate}
              currentUser={currentUser}
              storeInfo={storeInfo}
              onTransactionComplete={handleTransactionComplete}
              onOpenUserSwitch={() => setIsUserSwitchOpen(true)}
              onToggleFavorite={handleToggleFavoriteProduct}
              onOpenCalculator={() => setIsCalculatorOpen(true)}
            />
          )}
          {activeTab === 'purchases' && (
            <Purchases purchases={purchases} onAddPurchase={handleAddPurchase} />
          )}
          {activeTab === 'products' && (
            <ProductsManager 
              products={products} 
              users={users}
              currentUser={currentUser}
              onAddProduct={handleAddProduct} 
              onUpdateProduct={handleUpdateProduct} 
              onDeleteProduct={handleDeleteProduct} 
            />
          )}
          {activeTab === 'warehouse' && (
            <Warehouse
              products={products}
              currentUser={currentUser}
              onUpdateProduct={handleUpdateProduct}
            />
          )}
          {activeTab === 'reports' && (
            <Reports 
              products={products}
              transactions={transactions} 
              purchases={purchases} 
              currentUser={currentUser}
              storeInfo={storeInfo}
              onCancelTransaction={handleCancelTransaction}
            />
          )}
          {activeTab === 'settings' && (
            <Settings 
              products={products} 
              transactions={transactions} 
              purchases={purchases} 
              vatRate={vatRate}
              users={users}
              currentUser={currentUser}
              storeInfo={storeInfo}
              onUpdateVatRate={setVatRate}
              onUpdateStoreInfo={setStoreInfo}
              onRestoreData={handleRestoreData} 
              onResetData={handleResetData}
              onAddUser={handleAddUser}
              onUpdateUser={handleUpdateUser}
              onDeleteUser={handleDeleteUser}
            />
          )}
        </main>
      </div>

      {/* User Switcher Modal */}
      <UserSwitchModal
        users={users}
        currentUser={currentUser}
        isOpen={isUserSwitchOpen || !isAuthenticated}
        onClose={() => setIsUserSwitchOpen(false)}
        onSwitchUser={handleSwitchUser}
        forceLogin={!isAuthenticated}
      />

      {/* Tab Protection PIN Modal */}
      <ActionPinModal
        isOpen={showTabPinModal}
        title={`إذن دخول لصفحة ${
          pendingTabAccess === 'purchases' 
            ? 'المشتريات' 
            : pendingTabAccess === 'reports' 
            ? 'التقارير' 
            : 'الإعدادات'
        }`}
        description="هذه الصفحة محمية بكلمة مرور. أدخل كلمة مرور مدير النظام أو المستخدم المصرح له للمتابعة."
        users={users}
        onClose={() => {
          setShowTabPinModal(false);
          setPendingTabAccess(null);
        }}
        onSuccess={handleTabPinSuccess}
      />

      {/* Floating Calculator Modal */}
      <Calculator
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
      />

    </div>
  );
}
