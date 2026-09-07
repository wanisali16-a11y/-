import React, { useState, useMemo } from 'react';
import { Product, User } from '../types';
import { 
  Boxes, 
  Search, 
  Filter, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Printer, 
  RefreshCw, 
  TrendingUp, 
  DollarSign, 
  PackageCheck, 
  Plus, 
  Minus, 
  Edit3, 
  ArrowUpDown, 
  Layers, 
  FileSpreadsheet,
  Info,
  X,
  Save,
  PackagePlus,
  History
} from 'lucide-react';

interface WarehouseProps {
  products: Product[];
  currentUser: User;
  onUpdateProduct: (product: Product) => void;
}

export default function Warehouse({
  products,
  currentUser,
  onUpdateProduct,
}: WarehouseProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'instock' | 'low' | 'out' | 'expiring'>('all');
  const [sortBy, setSortBy] = useState<'stock-asc' | 'stock-desc' | 'cost-desc' | 'name'>('stock-asc');

  // Stock Adjustment Modal State
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [adjustMode, setAdjustMode] = useState<'add' | 'subtract' | 'set'>('add');
  const [adjustQuantity, setAdjustQuantity] = useState<string>('');
  const [adjustReason, setAdjustReason] = useState<string>('شحنة جديدة / توريد');
  const [selectedUnitType, setSelectedUnitType] = useState<'piece' | 'pack' | 'box'>('piece');
  const [customFactor, setCustomFactor] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Warehouse Calculations
  const metrics = useMemo(() => {
    let totalItems = products.length;
    let totalStockUnits = 0;
    let totalCostValue = 0;
    let totalRetailValue = 0;
    let outOfStockCount = 0;
    let lowStockCount = 0;
    let expiringCount = 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    products.forEach(p => {
      const stock = p.stock ?? 0;
      const cost = p.costPrice ?? p.price * 0.7; // default estimate if cost not set
      const reorder = p.reorderPoint ?? 0;

      totalStockUnits += stock;
      totalCostValue += stock * cost;
      totalRetailValue += stock * p.price;

      if (stock <= 0) {
        outOfStockCount++;
      } else if (reorder > 0 && stock <= reorder) {
        lowStockCount++;
      }

      if (p.expiryDate) {
        const expDate = new Date(p.expiryDate);
        expDate.setHours(0, 0, 0, 0);
        const daysDiff = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff <= 30) {
          expiringCount++;
        }
      }
    });

    const expectedProfit = totalRetailValue - totalCostValue;

    return {
      totalItems,
      totalStockUnits,
      totalCostValue,
      totalRetailValue,
      expectedProfit,
      outOfStockCount,
      lowStockCount,
      expiringCount,
      needsAttentionCount: outOfStockCount + lowStockCount
    };
  }, [products]);

  // Filtered and Sorted Products
  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return products.filter(p => {
      const matchesSearch = !query ||
        p.name.toLowerCase().includes(query) ||
        (p.barcode && p.barcode.toLowerCase().includes(query)) ||
        p.id.toLowerCase().includes(query);

      if (!matchesSearch) return false;

      const stock = p.stock ?? 0;
      const reorder = p.reorderPoint ?? 0;

      if (statusFilter === 'instock') {
        return stock > reorder;
      }
      if (statusFilter === 'low') {
        return stock > 0 && reorder > 0 && stock <= reorder;
      }
      if (statusFilter === 'out') {
        return stock <= 0;
      }
      if (statusFilter === 'expiring') {
        if (!p.expiryDate) return false;
        const expDate = new Date(p.expiryDate);
        expDate.setHours(0, 0, 0, 0);
        const daysDiff = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return daysDiff <= 30;
      }

      return true;
    }).sort((a, b) => {
      const stockA = a.stock ?? 0;
      const stockB = b.stock ?? 0;
      const costA = (a.costPrice ?? a.price) * stockA;
      const costB = (b.costPrice ?? b.price) * stockB;

      if (sortBy === 'stock-asc') return stockA - stockB;
      if (sortBy === 'stock-desc') return stockB - stockA;
      if (sortBy === 'cost-desc') return costB - costA;
      if (sortBy === 'name') return a.name.localeCompare(b.name, 'ar');
      return 0;
    });
  }, [products, searchQuery, statusFilter, sortBy]);

  // Open Adjustment Modal
  const handleOpenAdjustModal = (product: Product) => {
    setSelectedProduct(product);
    setAdjustMode('add');
    setAdjustQuantity('');
    setAdjustReason('شحنة جديدة / توريد');
    setSelectedUnitType(product.boxFactor ? 'box' : 'piece');
    setCustomFactor('');
  };

  // Calculation of unit factor
  const getUnitFactor = () => {
    if (!selectedProduct) return 1;
    if (selectedUnitType === 'box') {
      return selectedProduct.boxFactor && selectedProduct.boxFactor > 0 
        ? selectedProduct.boxFactor 
        : (parseInt(customFactor, 10) > 0 ? parseInt(customFactor, 10) : 1);
    }
    if (selectedUnitType === 'pack') {
      return selectedProduct.packFactor && selectedProduct.packFactor > 0 
        ? selectedProduct.packFactor 
        : (parseInt(customFactor, 10) > 0 ? parseInt(customFactor, 10) : 1);
    }
    return 1;
  };

  // Submit Stock Adjustment
  const handleSaveStockAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    const entered = parseInt(adjustQuantity, 10);
    if (isNaN(entered) || entered < 0) {
      alert('يرجى إدخال كمية صحيحة أكبر من أو تساوي الصفر');
      return;
    }

    const factor = getUnitFactor();
    const amountInPieces = entered * factor;

    let newStock = selectedProduct.stock ?? 0;
    if (adjustMode === 'add') {
      newStock += amountInPieces;
    } else if (adjustMode === 'subtract') {
      newStock = Math.max(0, newStock - amountInPieces);
    } else if (adjustMode === 'set') {
      newStock = amountInPieces;
    }

    const updatedProduct: Product = {
      ...selectedProduct,
      stock: newStock,
      boxFactor: selectedUnitType === 'box' && !selectedProduct.boxFactor && parseInt(customFactor, 10) > 0 ? parseInt(customFactor, 10) : selectedProduct.boxFactor,
      packFactor: selectedUnitType === 'pack' && !selectedProduct.packFactor && parseInt(customFactor, 10) > 0 ? parseInt(customFactor, 10) : selectedProduct.packFactor,
    };

    onUpdateProduct(updatedProduct);
    setSelectedProduct(null);

    const unitLabel = selectedUnitType === 'box' 
      ? `صناديق (${factor} قطعة/صندوق)` 
      : selectedUnitType === 'pack' 
      ? `ستيكات (${factor} قطعة/ستيكة)` 
      : 'قطع';

    setSuccessMessage(
      `تم تحديث مخزون (${selectedProduct.name}) بنجاح! تم احتساب ${entered} ${unitLabel} = ${amountInPieces} قطعة. الرصيد الإجمالي الجديد: ${newStock} قطعة.`
    );
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  // Print Inventory Sheet
  const handlePrintAuditSheet = () => {
    window.print();
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 font-sans" dir="rtl">
      
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-gray-100 print:hidden">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-100 text-blue-800 rounded-xl">
            <Boxes size={28} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">قسم المخزن وتسوية الجرد</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              إدارة كميات البضائع، مراقبة قيمة المخزون، وتسوية كميات الجرد الفعلي للمحلات والسوبرماركت
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handlePrintAuditSheet}
            className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs rounded-xl transition flex items-center gap-2 border border-gray-200 shadow-2xs"
          >
            <Printer size={16} />
            طباعة كشف الجرد
          </button>
        </div>
      </div>

      {/* Success Banner */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl flex items-center gap-3 animate-in fade-in print:hidden">
          <CheckCircle2 className="text-emerald-600 shrink-0" size={22} />
          <span className="font-bold text-sm">{successMessage}</span>
        </div>
      )}

      {/* Warehouse KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
        
        {/* Card 1: Total SKUs & Stock Units */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-gray-500 block mb-1">إجمالي الأصناف والقطع</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-gray-900">{metrics.totalItems}</span>
              <span className="text-xs text-gray-500 font-bold">صنف</span>
            </div>
            <span className="text-xs text-blue-600 font-bold mt-1 block">
              إجمالي القطع: {metrics.totalStockUnits.toLocaleString('ar-EG')} قطعة
            </span>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl shrink-0">
            <Layers size={24} />
          </div>
        </div>

        {/* Card 2: Cost Value */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-gray-500 block mb-1">قيمة المخزون (بسعر التكلفة)</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-extrabold text-slate-800">
                {metrics.totalCostValue.toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-xs font-bold text-gray-500">د.ل</span>
            </div>
            <span className="text-[11px] text-gray-500 block mt-1">رأس المال المستثمر بالبضائع</span>
          </div>
          <div className="p-3 bg-slate-100 text-slate-700 rounded-xl shrink-0">
            <DollarSign size={24} />
          </div>
        </div>

        {/* Card 3: Retail Value & Expected Profit */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-gray-500 block mb-1">قيمة المخزون (بسعر البيع)</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-extrabold text-emerald-700">
                {metrics.totalRetailValue.toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-xs font-bold text-gray-500">د.ل</span>
            </div>
            <span className="text-[11px] text-emerald-600 font-bold block mt-1">
              الربح المتوقع: +{metrics.expectedProfit.toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} د.ل
            </span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
            <TrendingUp size={24} />
          </div>
        </div>

        {/* Card 4: Low / Zero Stock Alerts */}
        <div className={`p-5 rounded-2xl border shadow-xs flex items-center justify-between ${
          metrics.needsAttentionCount > 0 ? 'bg-amber-50/70 border-amber-200' : 'bg-white border-gray-100'
        }`}>
          <div>
            <span className="text-xs font-bold text-gray-600 block mb-1">تنبيهات نواقص المخزن</span>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-extrabold ${metrics.needsAttentionCount > 0 ? 'text-amber-900' : 'text-gray-900'}`}>
                {metrics.needsAttentionCount}
              </span>
              <span className="text-xs text-gray-500 font-bold">صنف بحاجة للطلب</span>
            </div>
            <span className="text-[11px] text-gray-600 block mt-1">
              {metrics.outOfStockCount} نفد بالكامل | {metrics.lowStockCount} وصل لحد الطلب
            </span>
          </div>
          <div className={`p-3 rounded-xl shrink-0 ${metrics.needsAttentionCount > 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
            <AlertTriangle size={24} />
          </div>
        </div>

      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4 print:hidden">
        
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث باسم المنتج أو الباركود..."
            className="w-full pr-10 pl-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 focus:bg-white focus:border-blue-500 focus:outline-none transition"
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              statusFilter === 'all'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            جميع المنتجات ({products.length})
          </button>

          <button
            onClick={() => setStatusFilter('instock')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1 ${
              statusFilter === 'instock'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            <CheckCircle2 size={14} />
            متوفر بوفيرة
          </button>

          <button
            onClick={() => setStatusFilter('low')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1 ${
              statusFilter === 'low'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            <AlertTriangle size={14} />
            قارب على النفاد ({metrics.lowStockCount})
          </button>

          <button
            onClick={() => setStatusFilter('out')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1 ${
              statusFilter === 'out'
                ? 'bg-rose-600 text-white shadow-2xs'
                : 'bg-rose-50 text-rose-900 border border-rose-200 hover:bg-rose-100'
            }`}
          >
            <XCircle size={14} />
            نفد بالمخزن ({metrics.outOfStockCount})
          </button>

          {metrics.expiringCount > 0 && (
            <button
              onClick={() => setStatusFilter('expiring')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1 ${
                statusFilter === 'expiring'
                  ? 'bg-purple-600 text-white shadow-2xs'
                  : 'bg-purple-50 text-purple-900 border border-purple-200 hover:bg-purple-100'
              }`}
            >
              <Clock size={14} />
              قريب الانتهاء ({metrics.expiringCount})
            </button>
          )}
        </div>

        {/* Sort Select */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-gray-500 font-bold whitespace-nowrap">ترتيب:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:bg-white focus:outline-none cursor-pointer"
          >
            <option value="stock-asc">الكمية: الأقل أولاً</option>
            <option value="stock-desc">الكمية: الأكثر أولاً</option>
            <option value="cost-desc">أعلى قيمة للمخزون</option>
            <option value="name">أبجدياً بالاسم</option>
          </select>
        </div>

      </div>

      {/* Main Inventory Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        
        {/* Printable Header Title */}
        <div className="hidden print:block p-6 border-b border-gray-300 text-center">
          <h1 className="text-2xl font-bold text-gray-900">كشف جرد وإحصائيات المخزن</h1>
          <p className="text-xs text-gray-600 mt-1">تاريخ الجرد: {new Date().toLocaleDateString('ar-EG')} - عدد الأصناف: {filteredProducts.length}</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-700">
                <th className="p-3.5 font-bold">اسم المنتج والباركود</th>
                <th className="p-3.5 font-bold text-center">سعر التكلفة</th>
                <th className="p-3.5 font-bold text-center">سعر البيع</th>
                <th className="p-3.5 font-bold text-center">الكمية بالمخزن</th>
                <th className="p-3.5 font-bold text-center">حد الطلب</th>
                <th className="p-3.5 font-bold text-center">إجمالي قيمة الصنف (تكلفة)</th>
                <th className="p-3.5 font-bold text-center">حالة الصنف</th>
                <th className="p-3.5 font-bold text-center print:hidden">تعديل المخزون</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-500 font-bold">
                    لا توجد منتجات تطابق معايير البحث والفلترة المحددة.
                  </td>
                </tr>
              ) : (
                filteredProducts.map(product => {
                  const stock = product.stock ?? 0;
                  const reorder = product.reorderPoint ?? 0;
                  const cost = product.costPrice ?? product.price * 0.7;
                  const itemTotalCost = stock * cost;

                  let statusBadge = (
                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg text-[11px] font-bold inline-flex items-center gap-1">
                      <CheckCircle2 size={12} />
                      متوفر بوفيرة
                    </span>
                  );

                  if (stock <= 0) {
                    statusBadge = (
                      <span className="px-2.5 py-1 bg-rose-600 text-white rounded-lg text-[11px] font-extrabold inline-flex items-center gap-1 shadow-2xs">
                        <XCircle size={12} />
                        نفد بالمخزن
                      </span>
                    );
                  } else if (reorder > 0 && stock <= reorder) {
                    statusBadge = (
                      <span className="px-2.5 py-1 bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-[11px] font-bold inline-flex items-center gap-1">
                        <AlertTriangle size={12} />
                        قارب على النفاد
                      </span>
                    );
                  }

                  return (
                    <tr key={product.id} className="hover:bg-blue-50/30 transition-colors">
                      {/* Product Name & Barcode */}
                      <td className="p-3.5 font-bold text-gray-900">
                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-gray-100 text-gray-700 rounded-lg shrink-0 print:hidden">
                            <PackageCheck size={16} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900 leading-tight">{product.name}</p>
                            {product.barcode && (
                              <p className="text-[11px] font-mono text-gray-500 mt-0.5">رمز: {product.barcode}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Cost Price */}
                      <td className="p-3.5 text-center font-mono font-bold text-slate-700">
                        {cost.toFixed(2)} د.ل
                      </td>

                      {/* Selling Price */}
                      <td className="p-3.5 text-center font-mono font-bold text-blue-700">
                        {product.price.toFixed(2)} د.ل
                      </td>

                      {/* Current Stock */}
                      <td className="p-3.5 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`inline-block px-3 py-1 rounded-lg text-sm font-extrabold font-mono ${
                            stock <= 0 ? 'bg-rose-100 text-rose-800' : stock <= reorder ? 'bg-amber-100 text-amber-900' : 'bg-gray-100 text-gray-900'
                          }`}>
                            {stock} قطعة
                          </span>
                          {product.boxFactor && product.boxFactor > 0 && stock > 0 && (
                            <span className="text-[10px] font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                              ≈ {Math.floor(stock / product.boxFactor)} صندوق {stock % product.boxFactor > 0 ? `و ${stock % product.boxFactor} ق` : ''}
                            </span>
                          )}
                          {!product.boxFactor && product.packFactor && product.packFactor > 0 && stock > 0 && (
                            <span className="text-[10px] font-bold text-purple-800 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                              ≈ {Math.floor(stock / product.packFactor)} ستيكة {stock % product.packFactor > 0 ? `و ${stock % product.packFactor} ق` : ''}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Reorder Point */}
                      <td className="p-3.5 text-center font-mono text-gray-500 font-bold">
                        {reorder > 0 ? `${reorder} قطعة` : '-'}
                      </td>

                      {/* Total Cost Value for Item */}
                      <td className="p-3.5 text-center font-mono font-bold text-gray-900">
                        {itemTotalCost.toFixed(2)} د.ل
                      </td>

                      {/* Stock Status Badge */}
                      <td className="p-3.5 text-center">
                        {statusBadge}
                      </td>

                      {/* Quick Adjust Action Button */}
                      <td className="p-3.5 text-center print:hidden">
                        <button
                          onClick={() => handleOpenAdjustModal(product)}
                          className="px-3 py-1.5 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 border border-blue-200 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1 mx-auto"
                          title="تعديل أو تسوية كمية المخزن"
                        >
                          <Edit3 size={14} />
                          تسوية الكمية
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Summary */}
        <div className="bg-gray-50 p-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-bold text-gray-700 print:hidden">
          <span>عدد الأصناف المعروضة: {filteredProducts.length} من أصل {products.length} صنف</span>
          <span>إجمالي القيمة التقديرية للأصناف المعروضة: {filteredProducts.reduce((sum, p) => sum + (p.stock ?? 0) * (p.costPrice ?? p.price * 0.7), 0).toFixed(2)} د.ل</span>
        </div>

      </div>

      {/* Stock Adjustment Popup Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 print:hidden" dir="rtl">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in duration-200 space-y-4">
            
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                  <PackagePlus size={22} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">تسوية وتحديث كمية المخزن</h3>
                  <p className="text-xs text-gray-500">{selectedProduct.name}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveStockAdjustment} className="space-y-4">
              
              {/* Current Stock Banner */}
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between text-xs">
                <span className="text-gray-600 font-bold">الكمية المسجلة حالياً بالمخزن:</span>
                <span className="text-base font-extrabold text-blue-700 font-mono">
                  {selectedProduct.stock ?? 0} قطعة
                </span>
              </div>

              {/* Select Adjustment Type */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">نوع التعديل:</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAdjustMode('add');
                      setAdjustReason('شحنة جديدة / توريد');
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1 border transition ${
                      adjustMode === 'add'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <Plus size={14} />
                    إضافة شحنة
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAdjustMode('subtract');
                      setAdjustReason('تلفيات / هالك');
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1 border transition ${
                      adjustMode === 'subtract'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <Minus size={14} />
                    خصم / تلف
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAdjustMode('set');
                      setAdjustReason('جرد دوري كلي');
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1 border transition cursor-pointer ${
                      adjustMode === 'set'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <Edit3 size={14} />
                    تعيين مباشر
                  </button>
                </div>
              </div>

              {/* Unit Selector: قطعة / ستيكة / صندوق */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center justify-between">
                  <span>وحدة التوريد / الإدخال:</span>
                  <span className="text-[11px] text-blue-600 font-semibold">
                    يتم تحويلها تلقائياً لقطع في المخزن
                  </span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedUnitType('piece')}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition cursor-pointer ${
                      selectedUnitType === 'piece'
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    قطعة
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedUnitType('pack')}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition cursor-pointer ${
                      selectedUnitType === 'pack'
                        ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <Layers size={13} />
                    <span>ستيكة</span>
                    {selectedProduct.packFactor && (
                      <span className="text-[10px] opacity-85">({selectedProduct.packFactor})</span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedUnitType('box')}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition cursor-pointer ${
                      selectedUnitType === 'box'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <Boxes size={13} />
                    <span>صندوق (كرتون)</span>
                    {selectedProduct.boxFactor && (
                      <span className="text-[10px] opacity-85">({selectedProduct.boxFactor})</span>
                    )}
                  </button>
                </div>

                {/* If box or pack selected but product has no defined factor, let user enter it right here */}
                {selectedUnitType === 'box' && !selectedProduct.boxFactor && (
                  <div className="mt-2 p-2 bg-indigo-50 border border-indigo-200 rounded-lg text-xs">
                    <label className="block font-bold text-indigo-900 mb-1">
                      كم قطعة في هذا الصندوق؟ (سيتم حفظها كمعامل للمنتج)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={customFactor}
                      onChange={(e) => setCustomFactor(e.target.value)}
                      placeholder="مثال: 24 قطعة"
                      className="w-full p-2 bg-white border border-indigo-300 rounded-lg text-xs font-bold text-gray-900 outline-none"
                    />
                  </div>
                )}

                {selectedUnitType === 'pack' && !selectedProduct.packFactor && (
                  <div className="mt-2 p-2 bg-purple-50 border border-purple-200 rounded-lg text-xs">
                    <label className="block font-bold text-purple-900 mb-1">
                      كم قطعة في هذه الستيكة؟ (سيتم حفظها كمعامل للمنتج)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={customFactor}
                      onChange={(e) => setCustomFactor(e.target.value)}
                      placeholder="مثال: 6 أو 12 قطعة"
                      className="w-full p-2 bg-white border border-purple-300 rounded-lg text-xs font-bold text-gray-900 outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Quantity Input */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  {adjustMode === 'add' && `عدد ${selectedUnitType === 'box' ? 'الصناديق' : selectedUnitType === 'pack' ? 'الستيكات' : 'القطع'} المضافة:`}
                  {adjustMode === 'subtract' && `عدد ${selectedUnitType === 'box' ? 'الصناديق' : selectedUnitType === 'pack' ? 'الستيكات' : 'القطع'} المخصومة:`}
                  {adjustMode === 'set' && `الكمية الجديدة بـ (${selectedUnitType === 'box' ? 'الصندوق' : selectedUnitType === 'pack' ? 'الستيكة' : 'القطعة'}):`}
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  autoFocus
                  value={adjustQuantity}
                  onChange={(e) => setAdjustQuantity(e.target.value)}
                  placeholder="مثال: 10"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-bold text-gray-900 focus:bg-white focus:border-blue-500 focus:outline-none"
                />

                {/* Live Real-Time Conversion Math Badge */}
                {adjustQuantity && !isNaN(Number(adjustQuantity)) && Number(adjustQuantity) > 0 && selectedUnitType !== 'piece' && (
                  <div className="mt-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs font-bold text-emerald-900">
                    <span>
                      الحساب التلقائي ({adjustQuantity} {selectedUnitType === 'box' ? 'صندوق' : 'ستيكة'} × {getUnitFactor()} قطعة):
                    </span>
                    <span className="font-mono text-sm font-extrabold bg-emerald-200/80 px-2 py-0.5 rounded text-emerald-950">
                      = {Number(adjustQuantity) * getUnitFactor()} قطعة بالمخزن
                    </span>
                  </div>
                )}
              </div>

              {/* Reason / Note */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">سبب التعديل / ملاحظة:</label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="مثال: فاتورة توريد من المورد، تلف عبوات..."
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold text-gray-800 focus:bg-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-1.5"
                >
                  <Save size={16} />
                  حفظ التعديل بالمخزن
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
