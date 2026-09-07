import React, { useState, useMemo } from 'react';
import { Transaction, Purchase, Product, User, StoreInfo, DEFAULT_STORE_INFO } from '../types';
import { 
  Banknote, 
  CreditCard, 
  ArrowDownRight, 
  Wallet, 
  Download, 
  Calendar, 
  Filter, 
  RotateCcw, 
  Users, 
  UserCheck, 
  TrendingUp, 
  XCircle,
  Calculator,
  Coins,
  Percent,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Printer,
  Search,
  Hash,
  ArrowUpDown,
  Receipt,
  FileDown,
  CheckSquare,
  Square
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import ReceiptModal from './ReceiptModal';
import InvoicesReportModal from './InvoicesReportModal';

interface ReportsProps {
  transactions: Transaction[];
  purchases: Purchase[];
  products: Product[];
  currentUser: User;
  storeInfo?: StoreInfo;
  onCancelTransaction: (id: string) => void;
}

export default function Reports({ transactions, purchases, products, currentUser, storeInfo = DEFAULT_STORE_INFO, onCancelTransaction }: ReportsProps) {
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [reprintTransaction, setReprintTransaction] = useState<Transaction | null>(null);
  const [invoiceSearch, setInvoiceSearch] = useState<string>('');
  const [invoiceSortOrder, setInvoiceSortOrder] = useState<'desc' | 'asc'>('desc');
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<Set<string>>(new Set());
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);

  // Map all transactions to sequential invoice numbers chronologically (1, 2, 3...)
  const invoiceNumberMap = useMemo(() => {
    const map = new Map<string, number>();
    const sortedChronological = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let currentSeq = 1;
    sortedChronological.forEach(t => {
      if (t.invoiceNumber && typeof t.invoiceNumber === 'number' && t.invoiceNumber > 0) {
        currentSeq = Math.max(currentSeq, t.invoiceNumber + 1);
        map.set(t.id, t.invoiceNumber);
      } else {
        map.set(t.id, currentSeq++);
      }
    });
    return map;
  }, [transactions]);

  const getInvoiceDisplay = (t: Transaction) => {
    const num = t.invoiceNumber || invoiceNumberMap.get(t.id) || 1;
    return `#${String(num).padStart(4, '0')}`;
  };

  const getInvoiceRawNumber = (t: Transaction) => {
    return t.invoiceNumber || invoiceNumberMap.get(t.id) || 1;
  };

  // Calculate strictly for TODAY (Independent of filters)
  const todayNetProfit = useMemo(() => {
    const today = new Date();
    const isToday = (dateString: string) => {
      const d = new Date(dateString);
      return d.getDate() === today.getDate() &&
             d.getMonth() === today.getMonth() &&
             d.getFullYear() === today.getFullYear();
    };

    const todaySales = transactions.filter(t => isToday(t.date) && t.status !== 'cancelled').reduce((sum, t) => sum + t.total, 0);
    const todayPurch = purchases.filter(p => isToday(p.date)).reduce((sum, p) => sum + p.amount, 0);
    
    return todaySales - todayPurch;
  }, [transactions, purchases]);

  // Calculate Today's Expected Profit based on (Selling Price - Cost Price) * Sold Quantity
  const todayExpectedProfitData = useMemo(() => {
    const today = new Date();
    const isToday = (dateString: string) => {
      const d = new Date(dateString);
      return d.getDate() === today.getDate() &&
             d.getMonth() === today.getMonth() &&
             d.getFullYear() === today.getFullYear();
    };

    const todayTx = transactions.filter(t => isToday(t.date) && t.status !== 'cancelled' && t.type === 'sale');
    
    let totalSalesVal = 0;
    let totalCostVal = 0;
    let totalItemsQty = 0;

    todayTx.forEach(t => {
      t.items.forEach(item => {
        const product = products.find(p => p.id === item.id);
        const cost = product?.costPrice ?? 0;
        const qty = item.quantity;

        totalSalesVal += (item.price * qty);
        totalCostVal += (cost * qty);
        totalItemsQty += qty;
      });
    });

    const expectedProfit = totalSalesVal - totalCostVal;
    const profitMarginPercent = totalSalesVal > 0 ? (expectedProfit / totalSalesVal) * 100 : 0;

    return {
      expectedProfit,
      totalSalesVal,
      totalCostVal,
      totalItemsQty,
      profitMarginPercent,
      salesCount: todayTx.length
    };
  }, [transactions, products]);

  // Today's Sales & Invoices Summary
  const todaySalesSummary = useMemo(() => {
    const today = new Date();
    const isToday = (dateString: string) => {
      const d = new Date(dateString);
      return d.getDate() === today.getDate() &&
             d.getMonth() === today.getMonth() &&
             d.getFullYear() === today.getFullYear();
    };

    const todayTx = transactions.filter(t => isToday(t.date) && t.status !== 'cancelled');
    const total = todayTx.reduce((sum, t) => sum + t.total, 0);
    const cash = todayTx.reduce((sum, t) => {
      if (t.paymentMethod === 'cash') return sum + t.total;
      if (t.paymentMethod === 'split') return sum + (t.cashAmount || 0);
      return sum;
    }, 0);
    const card = todayTx.reduce((sum, t) => {
      if (t.paymentMethod === 'card') return sum + t.total;
      if (t.paymentMethod === 'split') return sum + (t.cardAmount || 0);
      return sum;
    }, 0);

    const allIssuedCount = transactions.filter(t => t.status !== 'cancelled').length;

    return {
      total,
      cash,
      card,
      todayCount: todayTx.length,
      allIssuedCount
    };
  }, [transactions]);

  // Expiry Date Monitoring & Alert
  const expiryAlertsData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expiredProducts: Array<{ product: Product; daysDiff: number }> = [];
    const expiringSoonProducts: Array<{ product: Product; daysDiff: number }> = [];

    products.forEach(product => {
      if (product.expiryDate) {
        const expDate = new Date(product.expiryDate);
        expDate.setHours(0, 0, 0, 0);

        const diffTime = expDate.getTime() - today.getTime();
        const daysDiff = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (daysDiff < 0) {
          expiredProducts.push({ product, daysDiff });
        } else if (daysDiff <= 30) {
          expiringSoonProducts.push({ product, daysDiff });
        }
      }
    });

    expiredProducts.sort((a, b) => a.daysDiff - b.daysDiff);
    expiringSoonProducts.sort((a, b) => a.daysDiff - b.daysDiff);

    return {
      expiredProducts,
      expiringSoonProducts,
      totalCount: expiredProducts.length + expiringSoonProducts.length,
    };
  }, [products]);

  // Low Stock Monitoring & Alert
  const lowStockAlertsData = useMemo(() => {
    const outOfStockProducts: Product[] = [];
    const lowStockProducts: Product[] = [];

    products.forEach(product => {
      if (product.stock !== undefined) {
        const stock = product.stock;
        const reorderPoint = product.reorderPoint || 0; // Default to 0 if not set

        if (stock <= 0) {
          outOfStockProducts.push(product);
        } else if (stock <= reorderPoint && reorderPoint > 0) {
          lowStockProducts.push(product);
        }
      }
    });

    outOfStockProducts.sort((a, b) => (a.stock || 0) - (b.stock || 0));
    lowStockProducts.sort((a, b) => (a.stock || 0) - (b.stock || 0));

    return {
      outOfStockProducts,
      lowStockProducts,
      totalCount: outOfStockProducts.length + lowStockProducts.length
    };
  }, [products]);

  // Chart Data: Last 7 Days Sales
  const last7DaysChartData = useMemo(() => {
    const data = [];
    const today = new Date();
    
    // Generate the last 7 days (including today)
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      
      const targetDateString = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('ar-LY', { weekday: 'short' });
      
      const dayTotalSales = transactions
        .filter(t => t.type === 'sale' && t.status !== 'cancelled' && t.date.startsWith(targetDateString))
        .reduce((sum, t) => sum + t.total, 0);
        
      data.push({
        name: dayName,
        date: targetDateString,
        sales: dayTotalSales
      });
    }
    
    return data;
  }, [transactions]);

  // Quick Date Range Presets
  const handlePreset = (type: 'today' | 'yesterday' | 'week' | 'month' | 'all') => {
    const now = new Date();
    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    if (type === 'all') {
      setStartDate('');
      setEndDate('');
      return;
    }

    if (type === 'today') {
      const todayStr = formatDate(now);
      setStartDate(todayStr);
      setEndDate(todayStr);
      return;
    }

    if (type === 'yesterday') {
      const y = new Date(now);
      y.setDate(now.getDate() - 1);
      const yStr = formatDate(y);
      setStartDate(yStr);
      setEndDate(yStr);
      return;
    }

    if (type === 'week') {
      const w = new Date(now);
      w.setDate(now.getDate() - 6);
      setStartDate(formatDate(w));
      setEndDate(formatDate(now));
      return;
    }

    if (type === 'month') {
      const m = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(formatDate(m));
      setEndDate(formatDate(now));
      return;
    }
  };

  // Filter transactions by date range
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const tDate = new Date(t.date);
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (tDate < start) return false;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (tDate > end) return false;
      }
      return true;
    });
  }, [transactions, startDate, endDate]);

  const activeFilteredTransactions = useMemo(() => {
    return filteredTransactions.filter(t => t.status !== 'cancelled');
  }, [filteredTransactions]);

  const cancelledTransactions = useMemo(() => {
    return filteredTransactions.filter(t => t.status === 'cancelled');
  }, [filteredTransactions]);

  // Filter and sort active transactions by sequential invoice number, cashier, and date
  const searchedActiveTransactions = useMemo(() => {
    let list = [...activeFilteredTransactions];

    list.sort((a, b) => {
      const timeA = new Date(a.date).getTime();
      const timeB = new Date(b.date).getTime();
      return invoiceSortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });

    if (!invoiceSearch.trim()) return list;

    const q = invoiceSearch.trim().toLowerCase().replace('#', '').replace('inv-', '');
    return list.filter(t => {
      const rawNum = String(getInvoiceRawNumber(t));
      const formatted = getInvoiceDisplay(t).toLowerCase();
      const cashier = (t.cashierName || '').toLowerCase();
      const id = t.id.toLowerCase();
      return rawNum.includes(q) || formatted.includes(q) || cashier.includes(q) || id.includes(q);
    });
  }, [activeFilteredTransactions, invoiceSearch, invoiceSortOrder, invoiceNumberMap]);

  // Formatted date range text for reports
  const dateRangeText = useMemo(() => {
    if (startDate && endDate) {
      if (startDate === endDate) {
        return `بتاريخ: ${startDate}`;
      }
      return `من ${startDate} إلى ${endDate}`;
    }
    if (startDate) return `من تاريخ ${startDate}`;
    if (endDate) return `حتى تاريخ ${endDate}`;
    return 'كافة الفترات المسجلة';
  }, [startDate, endDate]);

  // Invoices to be sent to InvoicesReportModal (selected ones, or all currently filtered)
  const invoicesToReport = useMemo(() => {
    if (selectedInvoiceIds.size > 0) {
      return searchedActiveTransactions.filter(t => selectedInvoiceIds.has(t.id));
    }
    return searchedActiveTransactions;
  }, [searchedActiveTransactions, selectedInvoiceIds]);

  const isAllSelected = useMemo(() => {
    if (searchedActiveTransactions.length === 0) return false;
    return searchedActiveTransactions.every(t => selectedInvoiceIds.has(t.id));
  }, [searchedActiveTransactions, selectedInvoiceIds]);

  const toggleInvoiceSelection = (id: string) => {
    setSelectedInvoiceIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedInvoiceIds(new Set());
    } else {
      setSelectedInvoiceIds(new Set(searchedActiveTransactions.map(t => t.id)));
    }
  };

  const clearSelection = () => {
    setSelectedInvoiceIds(new Set());
  };

  // Filter purchases by date range
  const filteredPurchases = useMemo(() => {
    return purchases.filter(p => {
      const pDate = new Date(p.date);
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (pDate < start) return false;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (pDate > end) return false;
      }
      return true;
    });
  }, [purchases, startDate, endDate]);

  const cashSales = activeFilteredTransactions.reduce((sum, t) => {
    if (t.paymentMethod === 'cash') return sum + t.total;
    if (t.paymentMethod === 'split') return sum + (t.cashAmount || 0);
    return sum;
  }, 0);
  
  const cardSales = activeFilteredTransactions.reduce((sum, t) => {
    if (t.paymentMethod === 'card') return sum + t.total;
    if (t.paymentMethod === 'split') return sum + (t.cardAmount || 0);
    return sum;
  }, 0);
  
  const totalSales = cashSales + cardSales;
  
  const totalPurchases = filteredPurchases.reduce((sum, p) => sum + p.amount, 0);
  const netBalance = totalSales - totalPurchases;

  // Group sales by Cashier
  const cashierSalesSummary = useMemo(() => {
    const map: Record<string, { cashierName: string; count: number; totalAmount: number; cashAmount: number; cardAmount: number }> = {};
    
    activeFilteredTransactions.forEach(t => {
      const name = t.cashierName || 'علي المزداوي';
      if (!map[name]) {
        map[name] = { cashierName: name, count: 0, totalAmount: 0, cashAmount: 0, cardAmount: 0 };
      }
      map[name].count += 1;
      map[name].totalAmount += t.total;
      if (t.paymentMethod === 'cash') {
        map[name].cashAmount += t.total;
      } else if (t.paymentMethod === 'card') {
        map[name].cardAmount += t.total;
      } else if (t.paymentMethod === 'split') {
        map[name].cashAmount += (t.cashAmount || 0);
        map[name].cardAmount += (t.cardAmount || 0);
      }
    });

    return Object.values(map).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [filteredTransactions]);

  // Product Profit Table (based on selected date range)
  const productProfits = useMemo(() => {
    const productStats = new Map<string, { name: string, qty: number, totalSales: number, totalCost: number }>();
    
    activeFilteredTransactions.forEach(t => {
      if (t.type === 'sale') {
        t.items.forEach(item => {
          // get current product to find costPrice
          const product = products.find(p => p.id === item.id);
          const cost = product?.costPrice || 0;

          const existing = productStats.get(item.id) || { name: item.name, qty: 0, totalSales: 0, totalCost: 0 };
          
          existing.qty += item.quantity;
          existing.totalSales += (item.price * item.quantity);
          existing.totalCost += (cost * item.quantity);
          
          productStats.set(item.id, existing);
        });
      }
    });

    return Array.from(productStats.values()).map(stat => ({
      ...stat,
      profit: stat.totalSales - stat.totalCost
    })).sort((a, b) => b.profit - a.profit);
  }, [filteredTransactions, products]);

  // Prepare Chart Data
  const chartData = useMemo(() => {
    const daysMap: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      daysMap[key] = 0;
    }

    activeFilteredTransactions.forEach(t => {
      const key = t.date.split('T')[0];
      if (daysMap[key] !== undefined) {
        daysMap[key] += t.total;
      }
    });

    return Object.entries(daysMap).map(([date, total]) => {
      const d = new Date(date);
      const dayName = d.toLocaleDateString('ar-LY', { weekday: 'short' });
      return {
        date: `${dayName} ${d.getDate()}/${d.getMonth() + 1}`,
        المبيعات: total
      };
    });
  }, [filteredTransactions]);

  return (
    <div className="space-y-6 pb-12 font-sans" dir="rtl">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-xl font-bold text-gray-900">تقارير المبيعات والأرباح</h2>
          <p className="text-sm text-gray-500">متابعة إجمالي المبيعات والمشتريات وحركات المبيعات حسب الكاشير والمستخدم</p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setIsReportModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white rounded-xl font-bold text-xs shadow-sm hover:shadow transition cursor-pointer"
            title="طباعة ملخص الفواتير المحددة بتنسيق الطباعة المخصص"
          >
            <Printer size={16} />
            <span>طباعة التقرير</span>
            <span className="bg-blue-800 text-blue-100 px-2 py-0.5 rounded-full text-[10px] font-mono">
              {selectedInvoiceIds.size > 0 ? `${selectedInvoiceIds.size} محددة` : `${searchedActiveTransactions.length} فاتورة`}
            </span>
          </button>
          
          <button
            onClick={() => setIsReportModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl font-bold text-xs shadow-sm hover:shadow transition cursor-pointer"
            title="تصدير ملخص الفواتير المحددة كـ PDF"
          >
            <FileDown size={16} />
            <span>تصدير كـ PDF</span>
          </button>
        </div>
      </div>

      {/* Top Statistical Cards: إجمالي مبيعات اليوم | عدد الفواتير الصادرة | إجمالي الربح التقريبي */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: إجمالي مبيعات اليوم */}
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-200/80 hover:border-blue-300 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-xs font-bold text-gray-500">إجمالي مبيعات اليوم</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap">
                اليوم
              </span>
            </div>
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shrink-0">
                <TrendingUp size={24} />
              </div>
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl sm:text-3xl font-black text-gray-900 font-mono tracking-tight">
                    {todaySalesSummary.total.toFixed(2)}
                  </span>
                  <span className="text-xs font-extrabold text-gray-500">د.ل</span>
                </div>
                <p className="text-[11px] text-gray-400 mt-0.5">مجموع حركات البيع اليومية المسجلة</p>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-600 font-medium">
            <span className="flex items-center gap-1">
              <Banknote size={13} className="text-emerald-600" />
              <span>نقدي:</span>
              <strong className="font-mono text-gray-900">{todaySalesSummary.cash.toFixed(2)} د.ل</strong>
            </span>
            <span className="flex items-center gap-1">
              <CreditCard size={13} className="text-blue-600" />
              <span>بطاقة:</span>
              <strong className="font-mono text-gray-900">{todaySalesSummary.card.toFixed(2)} د.ل</strong>
            </span>
          </div>
        </div>

        {/* Card 2: عدد الفواتير الصادرة */}
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-200/80 hover:border-amber-300 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-xs font-bold text-gray-500">عدد الفواتير الصادرة</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
                فواتير معتمدة
              </span>
            </div>
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 shrink-0">
                <Receipt size={24} />
              </div>
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl sm:text-3xl font-black text-gray-900 font-mono tracking-tight">
                    {todaySalesSummary.todayCount}
                  </span>
                  <span className="text-xs font-extrabold text-gray-500">فاتورة اليوم</span>
                </div>
                <p className="text-[11px] text-gray-400 mt-0.5">عمليات بيع ناجحة ومكتملة</p>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-600 font-medium">
            <span>
              إجمالي فواتير النظام: <strong className="font-mono text-gray-900 font-bold">{todaySalesSummary.allIssuedCount}</strong>
            </span>
            <span className="text-blue-600 text-[11px] font-bold">
              متسلسلة آلياً
            </span>
          </div>
        </div>

        {/* Card 3: إجمالي الربح التقريبي بناءً على تكلفة المشتريات */}
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-200/80 hover:border-emerald-300 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-xs font-bold text-gray-500">إجمالي الربح التقريبي</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap font-mono">
                هامش {todayExpectedProfitData.profitMarginPercent.toFixed(1)}%
              </span>
            </div>
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0">
                <Calculator size={24} />
              </div>
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl sm:text-3xl font-black text-emerald-600 font-mono tracking-tight">
                    {todayExpectedProfitData.expectedProfit.toFixed(2)}
                  </span>
                  <span className="text-xs font-extrabold text-emerald-700">د.ل</span>
                </div>
                <p className="text-[11px] text-emerald-700/80 mt-0.5 font-medium">بناءً على تكلفة شراء الأصناف</p>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-600 font-medium">
            <span>
              تكلفة مبيعات اليوم: <strong className="font-mono text-gray-900 font-bold">{todayExpectedProfitData.totalCostVal.toFixed(2)} د.ل</strong>
            </span>
            <span className="text-gray-400 text-[11px]">
              (البيع - الشراء)
            </span>
          </div>
        </div>
      </div>

      {/* Date Filter & Range Selection Panel */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 text-gray-800 font-bold text-sm">
            <Filter size={18} className="text-blue-600" />
            <span>تصفية حسب الفترة الزمنية:</span>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => handlePreset('today')}
              className="px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition"
            >
              اليوم
            </button>
            <button
              onClick={() => handlePreset('yesterday')}
              className="px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition"
            >
              الأمس
            </button>
            <button
              onClick={() => handlePreset('week')}
              className="px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition"
            >
              آخر 7 أيام
            </button>
            <button
              onClick={() => handlePreset('month')}
              className="px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition"
            >
              هذا الشهر
            </button>
            <button
              onClick={() => handlePreset('all')}
              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
            >
              الكل
            </button>
          </div>
        </div>

        {/* Date Pickers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2 border-t border-gray-100 items-end">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1">
              <Calendar size={14} className="text-gray-400" />
              من تاريخ:
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-800 focus:bg-white focus:border-blue-500 focus:outline-none transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1">
              <Calendar size={14} className="text-gray-400" />
              إلى تاريخ:
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold text-gray-800 focus:bg-white focus:border-blue-500 focus:outline-none transition"
            />
          </div>

          <div className="flex items-center gap-2">
            {(startDate || endDate) && (
              <button
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                }}
                className="w-full py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-lg transition flex items-center justify-center gap-1"
              >
                <RotateCcw size={14} />
                إلغاء التصفية
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Low Stock Alert Section */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${lowStockAlertsData.totalCount > 0 ? 'bg-orange-100 text-orange-600' : 'bg-emerald-100 text-emerald-600'}`}>
              <AlertTriangle size={22} />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                تنبيهات نواقص المخزون (Low Stock)
                {lowStockAlertsData.totalCount > 0 && (
                  <span className="text-xs bg-orange-600 text-white px-2.5 py-0.5 rounded-full font-bold animate-pulse">
                    {lowStockAlertsData.totalCount} تنبيهات
                  </span>
                )}
              </h3>
              <p className="text-xs text-gray-500">
                تنبيهات للمنتجات التي نفدت من المخزن أو اقتربت من حد الطلب (Reorder Point)
              </p>
            </div>
          </div>

          {lowStockAlertsData.totalCount > 0 && (
            <div className="flex items-center gap-2">
              {lowStockAlertsData.outOfStockProducts.length > 0 && (
                <span className="px-3 py-1 bg-red-50 text-red-800 border border-red-200 rounded-lg text-xs font-bold flex items-center gap-1">
                  <XCircle size={14} className="text-red-600" />
                  {lowStockAlertsData.outOfStockProducts.length} منتج نفد
                </span>
              )}
              {lowStockAlertsData.lowStockProducts.length > 0 && (
                <span className="px-3 py-1 bg-orange-50 text-orange-800 border border-orange-200 rounded-lg text-xs font-bold flex items-center gap-1">
                  <AlertTriangle size={14} className="text-orange-600" />
                  {lowStockAlertsData.lowStockProducts.length} منتج قارب على النفاد
                </span>
              )}
            </div>
          )}
        </div>

        {lowStockAlertsData.totalCount === 0 ? (
          <div className="bg-emerald-50/60 border border-emerald-200/80 p-4 rounded-xl flex items-center gap-3 text-emerald-900 text-xs font-medium">
            <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
            <span>حالة المخزون ممتازة: لا توجد منتجات نفدت كميتها أو وصلت لحد الطلب.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-600">
                  <th className="p-2.5 font-bold">اسم المنتج</th>
                  <th className="p-2.5 font-bold text-center">الباركود</th>
                  <th className="p-2.5 font-bold text-center">المخزون الحالي</th>
                  <th className="p-2.5 font-bold text-center">حد الطلب</th>
                  <th className="p-2.5 font-bold text-center">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {/* Out of Stock items first */}
                {lowStockAlertsData.outOfStockProducts.map((product) => (
                  <tr key={product.id} className="bg-red-50/40 hover:bg-red-50/80 transition-colors">
                    <td className="p-2.5 font-bold text-red-950 flex items-center gap-2">
                      <XCircle size={15} className="text-red-600 shrink-0" />
                      {product.name}
                    </td>
                    <td className="p-2.5 text-center font-mono text-gray-600">{product.barcode || '-'}</td>
                    <td className="p-2.5 text-center font-bold text-red-700">{product.stock ?? 0} قطعة</td>
                    <td className="p-2.5 text-center font-mono font-bold text-gray-600">{product.reorderPoint || '-'}</td>
                    <td className="p-2.5 text-center">
                      <span className="inline-flex items-center gap-1 bg-red-600 text-white font-extrabold px-2.5 py-1 rounded-md text-[11px] shadow-xs">
                        نفد من المخزن
                      </span>
                    </td>
                  </tr>
                ))}

                {/* Low Stock items */}
                {lowStockAlertsData.lowStockProducts.map((product) => (
                  <tr key={product.id} className="bg-orange-50/30 hover:bg-orange-50/70 transition-colors">
                    <td className="p-2.5 font-bold text-orange-950 flex items-center gap-2">
                      <AlertTriangle size={15} className="text-orange-600 shrink-0" />
                      {product.name}
                    </td>
                    <td className="p-2.5 text-center font-mono text-gray-600">{product.barcode || '-'}</td>
                    <td className="p-2.5 text-center font-bold text-orange-800">{product.stock ?? 0} قطعة</td>
                    <td className="p-2.5 text-center font-mono font-bold text-gray-600">{product.reorderPoint}</td>
                    <td className="p-2.5 text-center">
                      <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-900 border border-orange-300 font-bold px-2.5 py-1 rounded-md text-[11px]">
                        وصل لحد الطلب
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Expiration Date Alert Section */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${expiryAlertsData.totalCount > 0 ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
              <Clock size={22} />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                متابعة صلاحية المنتجات (Expiry Dates)
                {expiryAlertsData.totalCount > 0 && (
                  <span className="text-xs bg-rose-600 text-white px-2.5 py-0.5 rounded-full font-bold animate-pulse">
                    {expiryAlertsData.totalCount} تنبيهات
                  </span>
                )}
              </h3>
              <p className="text-xs text-gray-500">
                تنبيهات تلقائية للمنتجات المنتهية أو التي يتبقى على انتهاء صلاحيتها 30 يوماً أو أقل
              </p>
            </div>
          </div>

          {expiryAlertsData.totalCount > 0 && (
            <div className="flex items-center gap-2">
              {expiryAlertsData.expiredProducts.length > 0 && (
                <span className="px-3 py-1 bg-rose-50 text-rose-800 border border-rose-200 rounded-lg text-xs font-bold flex items-center gap-1">
                  <AlertTriangle size={14} className="text-rose-600" />
                  {expiryAlertsData.expiredProducts.length} منتهي الصلاحية
                </span>
              )}
              {expiryAlertsData.expiringSoonProducts.length > 0 && (
                <span className="px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-xs font-bold flex items-center gap-1">
                  <Clock size={14} className="text-amber-600" />
                  {expiryAlertsData.expiringSoonProducts.length} قريبة من الانتهاء
                </span>
              )}
            </div>
          )}
        </div>

        {expiryAlertsData.totalCount === 0 ? (
          <div className="bg-emerald-50/60 border border-emerald-200/80 p-4 rounded-xl flex items-center gap-3 text-emerald-900 text-xs font-medium">
            <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
            <span>حالة الصلاحية سليمة: جميع المنتجات المسجلة تاريخ صلاحيتها سارٍ ولا توجد منتجات منتهية أو قريبة من الانتهاء (خلال 30 يوماً).</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-600">
                  <th className="p-2.5 font-bold">اسم المنتج</th>
                  <th className="p-2.5 font-bold text-center">الباركود</th>
                  <th className="p-2.5 font-bold text-center">المخزون الحالي</th>
                  <th className="p-2.5 font-bold text-center">تاريخ الانتهاء</th>
                  <th className="p-2.5 font-bold text-center">الحالة والمتبقي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {/* Expired items first */}
                {expiryAlertsData.expiredProducts.map(({ product, daysDiff }) => (
                  <tr key={product.id} className="bg-rose-50/40 hover:bg-rose-50/80 transition-colors">
                    <td className="p-2.5 font-bold text-rose-950 flex items-center gap-2">
                      <AlertTriangle size={15} className="text-rose-600 shrink-0" />
                      {product.name}
                    </td>
                    <td className="p-2.5 text-center font-mono text-gray-600">{product.barcode || '-'}</td>
                    <td className="p-2.5 text-center font-bold text-gray-900">{product.stock ?? '-'} قطعة</td>
                    <td className="p-2.5 text-center font-mono font-bold text-rose-700">{product.expiryDate}</td>
                    <td className="p-2.5 text-center">
                      <span className="inline-flex items-center gap-1 bg-rose-600 text-white font-extrabold px-2.5 py-1 rounded-md text-[11px] shadow-xs">
                        منتهي الصلاحية (منذ {Math.abs(daysDiff)} يوم)
                      </span>
                    </td>
                  </tr>
                ))}

                {/* Expiring soon items */}
                {expiryAlertsData.expiringSoonProducts.map(({ product, daysDiff }) => (
                  <tr key={product.id} className="bg-amber-50/30 hover:bg-amber-50/70 transition-colors">
                    <td className="p-2.5 font-bold text-amber-950 flex items-center gap-2">
                      <Clock size={15} className="text-amber-600 shrink-0" />
                      {product.name}
                    </td>
                    <td className="p-2.5 text-center font-mono text-gray-600">{product.barcode || '-'}</td>
                    <td className="p-2.5 text-center font-bold text-gray-900">{product.stock ?? '-'} قطعة</td>
                    <td className="p-2.5 text-center font-mono font-bold text-amber-800">{product.expiryDate}</td>
                    <td className="p-2.5 text-center">
                      <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 border border-amber-300 font-bold px-2.5 py-1 rounded-md text-[11px]">
                        {daysDiff === 0 ? 'ينتهي اليوم!' : `ينتهي خلال ${daysDiff} يوم`}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        
        {/* Expected Today Profit Card (Calculated from Selling Price - Cost Price) */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-800 p-5 rounded-xl shadow-md border border-emerald-700 flex items-center gap-4 text-white">
          <div className="bg-white/20 p-3 rounded-full text-white backdrop-blur-sm shadow-inner shrink-0">
            <Calculator size={24} />
          </div>
          <div>
            <div className="flex items-center gap-1 mb-0.5">
              <p className="text-xs text-emerald-100 font-bold opacity-90">الربح المتوقع اليوم</p>
              <span className="text-[10px] bg-emerald-900/60 text-emerald-200 px-1.5 py-0.2 rounded font-mono">
                {todayExpectedProfitData.profitMarginPercent.toFixed(0)}%
              </span>
            </div>
            <p className="text-xl font-extrabold">{todayExpectedProfitData.expectedProfit.toFixed(2)} د.ل</p>
            <p className="text-[10px] text-emerald-200/90 mt-0.5">
              (سعر البيع - تكلفة الشراء)
            </p>
          </div>
        </div>

        {/* Daily Net Sales Profit Card (Sales - Purchases) */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-5 rounded-xl shadow-md border border-blue-700 flex items-center gap-4 text-white">
          <div className="bg-white/20 p-3 rounded-full text-white backdrop-blur-sm shadow-inner shrink-0">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-xs text-blue-100 font-bold mb-0.5 opacity-90">صافي الحركة اليومية</p>
            <p className="text-xl font-extrabold">{todayNetProfit.toFixed(2)} د.ل</p>
            <p className="text-[10px] text-blue-200/90 mt-0.5">
              (المبيعات - المشتريات)
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-green-100 p-3 rounded-full text-green-600 shrink-0">
            <Banknote size={24} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-semibold mb-1">مبيعات نقدي (للفترة)</p>
            <p className="text-xl font-bold text-gray-900">{cashSales.toFixed(2)} د.ل</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-blue-100 p-3 rounded-full text-blue-600 shrink-0">
            <CreditCard size={24} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-semibold mb-1">مبيعات بطاقة (للفترة)</p>
            <p className="text-xl font-bold text-gray-900">{cardSales.toFixed(2)} د.ل</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="bg-red-100 p-3 rounded-full text-red-600 shrink-0">
            <ArrowDownRight size={24} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-semibold mb-1">إجمالي المشتريات (للفترة)</p>
            <p className="text-xl font-bold text-gray-900">{totalPurchases.toFixed(2)} د.ل</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className={`p-3 rounded-full shrink-0 ${netBalance >= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'}`}>
            <Wallet size={24} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-semibold mb-1">صافي الفترة</p>
            <p className={`text-xl font-bold ${netBalance >= 0 ? 'text-emerald-600' : 'text-orange-600'}`}>
              {netBalance.toFixed(2)} د.ل
            </p>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 mt-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <TrendingUp size={20} className="text-blue-600" /> مبيعات آخر 7 أيام
        </h3>
        <div className="h-64 w-full" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={last7DaysChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} dx={-10} />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)', textAlign: 'right' }}
                itemStyle={{ color: '#1e3a8a', fontWeight: 'bold' }}
                labelStyle={{ color: '#6b7280', marginBottom: '4px' }}
                formatter={(value: number) => [`${value.toFixed(2)} د.ل`, 'المبيعات']}
                labelFormatter={(label, payload) => {
                  if (payload && payload.length > 0) {
                    const dateStr = payload[0].payload.date;
                    return `${label} (${dateStr})`;
                  }
                  return label;
                }}
              />
              <Area type="monotone" dataKey="sales" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Cashier Sales Summary Card */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-base font-bold mb-4 text-gray-800 flex items-center gap-2 border-b pb-3">
          <Users size={20} className="text-amber-600" />
          <span>تقرير المبيعات حسب الكاشير والمستخدمين</span>
        </h3>

        {cashierSalesSummary.length === 0 ? (
          <p className="text-xs text-gray-400">لا توجد عمليات مبيعات مسجلة في هذه الفترة.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {cashierSalesSummary.map((c, idx) => (
              <div key={idx} className="p-4 bg-amber-50/50 rounded-xl border border-amber-200/80 space-y-2">
                <div className="flex items-center justify-between border-b border-amber-200/60 pb-2">
                  <div className="flex items-center gap-2">
                    <UserCheck size={18} className="text-amber-700" />
                    <span className="font-bold text-gray-900 text-sm">{c.cashierName}</span>
                  </div>
                  <span className="text-xs bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-full font-bold">
                    {c.count} عملية
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div>
                    <span className="text-gray-500 block text-[11px]">إجمالي المبيعات:</span>
                    <span className="font-bold text-emerald-700 text-sm">{c.totalAmount.toFixed(2)} د.ل</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[11px]">نقدي / بطاقة:</span>
                    <span className="font-mono text-gray-700 text-[11px]">
                      {c.cashAmount.toFixed(0)} / {c.cardAmount.toFixed(0)} د.ل
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Product Profit Table */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex-1">
        <h3 className="text-xl font-bold mb-4 text-gray-800 border-b pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp size={20} className="text-emerald-600" />
            <span>أرباح المنتجات</span>
          </div>
        </h3>
        
        {productProfits.length === 0 ? (
          <div className="text-center text-gray-400 py-10">لا توجد بيانات أرباح للفترة المحددة</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-emerald-50 border-b border-emerald-200 text-xs">
                  <th className="p-3 font-bold text-gray-600">اسم المنتج</th>
                  <th className="p-3 font-bold text-gray-600 text-center">الكمية المباعة</th>
                  <th className="p-3 font-bold text-gray-600 text-center">إجمالي المبيعات</th>
                  <th className="p-3 font-bold text-gray-600 text-center">إجمالي التكلفة</th>
                  <th className="p-3 font-bold text-emerald-700 text-left">إجمالي الربح</th>
                </tr>
              </thead>
              <tbody className="text-xs">
                {productProfits.map((stat, idx) => (
                  <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-3 font-bold text-gray-900">{stat.name}</td>
                    <td className="p-3 text-center font-bold text-gray-700">{stat.qty}</td>
                    <td className="p-3 text-center text-gray-600 font-mono">{stat.totalSales.toFixed(2)} د.ل</td>
                    <td className="p-3 text-center text-gray-600 font-mono">{stat.totalCost.toFixed(2)} د.ل</td>
                    <td className="p-3 text-left font-bold font-mono text-sm text-emerald-600 bg-emerald-50/30">
                      {stat.profit.toFixed(2)} د.ل
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Sales Trend Chart */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold mb-6 text-gray-800">تطور المبيعات (آخر 7 أيام)</h3>
        <div className="h-72 w-full" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fill: '#64748b' }} 
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fill: '#64748b' }}
              />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                itemStyle={{ color: '#0f172a', fontWeight: 'bold' }}
              />
              <Area 
                type="monotone" 
                dataKey="المبيعات" 
                stroke="#2563eb" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorSales)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Transactions Table */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex-1">
        <div className="border-b pb-3 mb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Hash size={20} className="text-blue-600" />
              <span>حركات البيع والفواتير المسجلة</span>
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              أرقام الفواتير متسلسلة - حدد الفواتير المراد تضمينها في تقرير الطباعة أو اطبع كافة نتائج الفترة
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-blue-800 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-full">
              إجمالي الفواتير: {activeFilteredTransactions.length}
            </span>

            <button
              onClick={() => setIsReportModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white rounded-xl font-bold text-xs shadow-2xs transition cursor-pointer"
              title="طباعة ملخص الفواتير المحددة بتنسيق الطباعة المخصص"
            >
              <Printer size={15} />
              <span>طباعة التقرير</span>
              {selectedInvoiceIds.size > 0 && (
                <span className="bg-blue-800 text-blue-100 px-1.5 py-0.2 rounded-full text-[10px] font-mono">
                  {selectedInvoiceIds.size}
                </span>
              )}
            </button>

            <button
              onClick={() => setIsReportModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl font-bold text-xs shadow-2xs transition cursor-pointer"
              title="تصدير كـ PDF"
            >
              <FileDown size={15} />
              <span>تصدير كـ PDF</span>
            </button>
          </div>
        </div>

        {/* Selected Invoices Sticky Alert Bar */}
        {selectedInvoiceIds.size > 0 && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 font-bold text-blue-900">
              <CheckSquare size={16} className="text-blue-600" />
              <span>تم تحديد <strong className="font-mono text-sm">{selectedInvoiceIds.size}</strong> فاتورة للطباعة من أصل {searchedActiveTransactions.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsReportModalOpen(true)}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
              >
                <Printer size={14} />
                <span>طباعة التقرير المخصص ({selectedInvoiceIds.size})</span>
              </button>
              <button
                onClick={() => setIsReportModalOpen(true)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
              >
                <FileDown size={14} />
                <span>تصدير كـ PDF</span>
              </button>
              <button
                onClick={clearSelection}
                className="px-2.5 py-1.5 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-lg font-bold transition cursor-pointer"
              >
                إلغاء التحديد
              </button>
            </div>
          </div>
        )}

        {/* Invoice Search & Sort Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
              <Search size={16} />
            </div>
            <input
              type="text"
              value={invoiceSearch}
              onChange={(e) => setInvoiceSearch(e.target.value)}
              placeholder="بحث برقم الفاتورة (مثال: 0001 أو 5) أو اسم الكاشير..."
              className="w-full pr-9 pl-8 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 bg-gray-50 focus:bg-white transition font-medium"
            />
            {invoiceSearch && (
              <button 
                onClick={() => setInvoiceSearch('')}
                className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-xs text-gray-400 hover:text-gray-600 font-bold"
              >
                مسح
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleSelectAll}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 transition shrink-0 cursor-pointer"
              title="تحديد كل الفواتير الظاهرة"
            >
              {isAllSelected ? <CheckSquare size={14} className="text-blue-600" /> : <Square size={14} className="text-gray-400" />}
              <span>{isAllSelected ? 'إلغاء تحديد الكل' : 'تحديد كل الظاهرة'}</span>
            </button>

            <button
              onClick={() => setInvoiceSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 transition shrink-0 cursor-pointer"
              title="تبديل الترتيب"
            >
              <ArrowUpDown size={14} className="text-blue-600" />
              <span>{invoiceSortOrder === 'desc' ? 'الترتيب: الأحدث أولاً' : 'الترتيب: الأقدم أولاً'}</span>
            </button>
          </div>
        </div>
        
        {activeFilteredTransactions.length === 0 ? (
          <div className="text-center text-gray-400 py-10">لا توجد مبيعات ناجحة مسجلة في هذه الفترة الزمنية</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs">
                  <th className="p-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                      title={isAllSelected ? "إلغاء تحديد الكل" : "تحديد كل الفواتير"}
                    />
                  </th>
                  <th className="p-3 font-bold text-gray-600">رقم الفاتورة</th>
                  <th className="p-3 font-bold text-gray-600">الكاشير / المستخدم</th>
                  <th className="p-3 font-bold text-gray-600">التاريخ والوقت</th>
                  <th className="p-3 font-bold text-gray-600">طريقة الدفع</th>
                  <th className="p-3 font-bold text-gray-600">الإجمالي</th>
                  <th className="p-3 font-bold text-gray-600 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="text-xs">
                {searchedActiveTransactions.slice(0, 50).map((t) => (
                  <tr 
                    key={t.id} 
                    onClick={() => toggleInvoiceSelection(t.id)}
                    className={`border-b border-gray-100 hover:bg-blue-50/30 transition cursor-pointer ${
                      selectedInvoiceIds.has(t.id) ? 'bg-blue-50/40' : ''
                    }`}
                  >
                    <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedInvoiceIds.has(t.id)}
                        onChange={() => toggleInvoiceSelection(t.id)}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                        title="تحديد الفاتورة للتقرير"
                      />
                    </td>
                    <td className="p-3">
                      <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-900 border border-blue-200 font-mono font-extrabold px-2.5 py-1 rounded-md text-xs shadow-2xs">
                        {getInvoiceDisplay(t)}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-gray-900">
                      <span className="inline-flex items-center gap-1.5 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                        <UserCheck size={12} className="text-amber-600" />
                        {t.cashierName || 'علي المزداوي'}
                      </span>
                    </td>
                    <td className="p-3 text-gray-500 font-mono">
                      {new Date(t.date).toLocaleDateString('ar-LY')} {new Date(t.date).toLocaleTimeString('ar-LY', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold ${
                        t.paymentMethod === 'cash' ? 'bg-green-100 text-green-700' : t.paymentMethod === 'card' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                      }`}>
                        {t.paymentMethod === 'cash' ? 'نقدي' : t.paymentMethod === 'card' ? 'بطاقة' : 'مقسم'}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-gray-900 text-sm font-mono">{t.total.toFixed(2)} د.ل</td>
                    <td className="p-3 text-center flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setReprintTransaction(t)}
                        className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-1.5 rounded transition cursor-pointer"
                        title="إعادة طباعة الفاتورة الحرارية"
                      >
                        <Printer size={16} />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm('هل أنت متأكد من إلغاء هذه العملية وإرجاع المخزون؟')) {
                            onCancelTransaction(t.id);
                          }
                        }}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded transition cursor-pointer"
                        title="إلغاء البيع (مرتجع)"
                      >
                        <XCircle size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cancelled Transactions Table */}
      {cancelledTransactions.length > 0 && (
        <div className="bg-red-50 p-6 rounded-xl shadow-sm border border-red-100 flex-1">
          <h3 className="text-xl font-bold mb-4 text-red-800 border-b border-red-200 pb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <XCircle size={20} className="text-red-600" />
              <span>سجل العمليات الملغاة (المرتجعات)</span>
            </div>
            <span className="text-xs font-normal text-red-600">إجمالي المرتجعات: {cancelledTransactions.length}</span>
          </h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-red-100/50 border-b border-red-200 text-xs">
                  <th className="p-3 font-bold text-red-800">رقم الفاتورة</th>
                  <th className="p-3 font-bold text-red-800">الكاشير / المستخدم</th>
                  <th className="p-3 font-bold text-red-800">التاريخ والوقت</th>
                  <th className="p-3 font-bold text-red-800">الإجمالي المسترد</th>
                </tr>
              </thead>
              <tbody className="text-xs">
                {[...cancelledTransactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((t) => (
                  <tr key={t.id} className="border-b border-red-100 hover:bg-red-100/50">
                    <td className="p-3">
                      <span className="inline-flex items-center gap-1 bg-red-100/80 text-red-800 border border-red-200 font-mono font-extrabold px-2.5 py-1 rounded-md text-xs line-through">
                        {getInvoiceDisplay(t)}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-red-900">
                      <span className="inline-flex items-center gap-1.5 bg-white/50 px-2 py-0.5 rounded border border-red-200">
                        <UserCheck size={12} className="text-red-600" />
                        {t.cashierName || 'علي المزداوي'}
                      </span>
                    </td>
                    <td className="p-3 text-red-700 font-mono">
                      {new Date(t.date).toLocaleDateString('ar-LY')} {new Date(t.date).toLocaleTimeString('ar-LY', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="p-3 font-bold text-red-900 text-sm font-mono">{t.total.toFixed(2)} د.ل</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reprint Receipt Modal */}
      {reprintTransaction && (
        <ReceiptModal
          transaction={reprintTransaction}
          onClose={() => setReprintTransaction(null)}
          autoPrint={false}
          storeInfo={storeInfo}
        />
      )}

      {/* Custom Invoices Summary Report & PDF Export Modal */}
      <InvoicesReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        transactions={invoicesToReport}
        totalAvailableCount={searchedActiveTransactions.length}
        isCustomSelection={selectedInvoiceIds.size > 0}
        storeInfo={storeInfo}
        currentUser={currentUser}
        dateRangeText={dateRangeText}
        invoiceNumberMap={invoiceNumberMap}
      />
    </div>
  );
}
