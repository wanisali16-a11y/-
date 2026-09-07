import React, { useState, useMemo } from 'react';
import { Product, User, DEFAULT_CATEGORIES } from '../types';
import { Package, PlusCircle, Trash2, Edit3, AlertTriangle, Search, CheckCircle2, RefreshCw, X, Barcode, Calendar, Clock, Tag, Folder, Plus, Boxes, Layers, ChevronDown, ChevronUp } from 'lucide-react';
import { ActionPinModal } from './UserAuthModal';

interface ProductsManagerProps {
  products: Product[];
  users?: User[];
  currentUser?: User;
  onAddProduct: (product: Product) => void;
  onUpdateProduct: (product: Product) => void;
  onDeleteProduct: (id: string) => void;
}

export default function ProductsManager({
  products,
  users = [],
  currentUser,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
}: ProductsManagerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [barcode, setBarcode] = useState('');
  const [category, setCategory] = useState('عام');
  const [customCategory, setCustomCategory] = useState('');
  const [isCustomCategoryMode, setIsCustomCategoryMode] = useState(false);
  const [stock, setStock] = useState('');
  const [reorderPoint, setReorderPoint] = useState('');
  const [expiryDate, setExpiryDate] = useState('');

  // Box & Pack Packaging Units State
  const [boxFactor, setBoxFactor] = useState('');
  const [boxPrice, setBoxPrice] = useState('');
  const [boxBarcode, setBoxBarcode] = useState('');
  const [packFactor, setPackFactor] = useState('');
  const [packPrice, setPackPrice] = useState('');
  const [packBarcode, setPackBarcode] = useState('');
  const [showPackagingOptions, setShowPackagingOptions] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [filterAlertOnly, setFilterAlertOnly] = useState(false);

  // Deletion Auth State
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [showDeletePinModal, setShowDeletePinModal] = useState(false);

  // All unique available categories (default + any custom existing in products)
  const availableCategories = useMemo(() => {
    const categoriesSet = new Set<string>(DEFAULT_CATEGORIES);
    products.forEach(p => {
      if (p.category && p.category.trim()) {
        categoriesSet.add(p.category.trim());
      }
    });
    return Array.from(categoriesSet);
  }, [products]);

  const handleRequestDeleteProduct = (id: string) => {
    if (currentUser?.canDeleteData || currentUser?.role === 'admin') {
      onDeleteProduct(id);
    } else {
      setPendingDeleteId(id);
      setShowDeletePinModal(true);
    }
  };

  const handleConfirmDeleteWithPin = () => {
    if (pendingDeleteId) {
      onDeleteProduct(pendingDeleteId);
      setPendingDeleteId(null);
    }
  };

  // Products that reached or dropped below reorder limit
  const lowStockProducts = useMemo(() => {
    return products.filter(
      p => p.stock !== undefined && p.reorderPoint !== undefined && p.stock <= p.reorderPoint
    );
  }, [products]);

  // Filtered list
  const filteredProducts = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return products.filter(p => {
      const matchesSearch = !query || 
        p.name.toLowerCase().includes(query) ||
        (p.barcode && p.barcode.toLowerCase().includes(query)) ||
        (p.category && p.category.toLowerCase().includes(query)) ||
        p.id.toLowerCase().includes(query);

      const matchesCategory = selectedCategoryFilter === 'all' || (p.category || 'عام') === selectedCategoryFilter;

      const isLowStock = p.stock !== undefined && p.reorderPoint !== undefined && p.stock <= p.reorderPoint;
      if (filterAlertOnly) {
        return matchesSearch && matchesCategory && isLowStock;
      }
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, selectedCategoryFilter, filterAlertOnly]);

  const handleStartEdit = (product: Product) => {
    setEditingId(product.id);
    setName(product.name);
    setPrice(product.price.toString());
    setCostPrice(product.costPrice !== undefined ? product.costPrice.toString() : '');
    setBarcode(product.barcode || '');
    const existingCat = product.category || 'عام';
    if (availableCategories.includes(existingCat)) {
      setCategory(existingCat);
      setIsCustomCategoryMode(false);
      setCustomCategory('');
    } else {
      setIsCustomCategoryMode(true);
      setCustomCategory(existingCat);
    }
    setStock(product.stock !== undefined ? product.stock.toString() : '');
    setReorderPoint(product.reorderPoint !== undefined ? product.reorderPoint.toString() : '');
    setExpiryDate(product.expiryDate || '');
    
    // Packaging units
    setBoxFactor(product.boxFactor ? product.boxFactor.toString() : '');
    setBoxPrice(product.boxPrice !== undefined ? product.boxPrice.toString() : '');
    setBoxBarcode(product.boxBarcode || '');
    setPackFactor(product.packFactor ? product.packFactor.toString() : '');
    setPackPrice(product.packPrice !== undefined ? product.packPrice.toString() : '');
    setPackBarcode(product.packBarcode || '');
    setShowPackagingOptions(Boolean(product.boxFactor || product.packFactor || product.boxPrice || product.packPrice || product.boxBarcode || product.packBarcode));
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setName('');
    setPrice('');
    setCostPrice('');
    setBarcode('');
    setCategory('عام');
    setCustomCategory('');
    setIsCustomCategoryMode(false);
    setStock('');
    setReorderPoint('');
    setExpiryDate('');
    setBoxFactor('');
    setBoxPrice('');
    setBoxBarcode('');
    setPackFactor('');
    setPackPrice('');
    setPackBarcode('');
    setShowPackagingOptions(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price || isNaN(Number(price))) return;

    const finalCategory = (isCustomCategoryMode ? customCategory.trim() : category.trim()) || 'عام';
    const parsedStock = stock !== '' && !isNaN(Number(stock)) ? Number(stock) : undefined;
    const parsedReorderPoint = reorderPoint !== '' && !isNaN(Number(reorderPoint)) ? Number(reorderPoint) : undefined;
    const parsedCostPrice = costPrice !== '' && !isNaN(Number(costPrice)) ? Number(costPrice) : undefined;
    const cleanedBarcode = barcode.trim() || undefined;
    const cleanedExpiryDate = expiryDate.trim() || undefined;

    const parsedBoxFactor = boxFactor !== '' && !isNaN(Number(boxFactor)) && Number(boxFactor) > 0 ? Number(boxFactor) : undefined;
    const parsedBoxPrice = boxPrice !== '' && !isNaN(Number(boxPrice)) && Number(boxPrice) >= 0 ? Number(boxPrice) : undefined;
    const cleanedBoxBarcode = boxBarcode.trim() || undefined;

    const parsedPackFactor = packFactor !== '' && !isNaN(Number(packFactor)) && Number(packFactor) > 0 ? Number(packFactor) : undefined;
    const parsedPackPrice = packPrice !== '' && !isNaN(Number(packPrice)) && Number(packPrice) >= 0 ? Number(packPrice) : undefined;
    const cleanedPackBarcode = packBarcode.trim() || undefined;

    if (editingId) {
      const updatedProduct: Product = {
        id: editingId,
        name,
        price: Number(price),
        costPrice: parsedCostPrice,
        barcode: cleanedBarcode,
        category: finalCategory,
        stock: parsedStock,
        reorderPoint: parsedReorderPoint,
        expiryDate: cleanedExpiryDate,
        boxFactor: parsedBoxFactor,
        boxPrice: parsedBoxPrice,
        boxBarcode: cleanedBoxBarcode,
        packFactor: parsedPackFactor,
        packPrice: parsedPackPrice,
        packBarcode: cleanedPackBarcode,
      };
      onUpdateProduct(updatedProduct);
      handleCancelEdit();
    } else {
      const newProduct: Product = {
        id: Math.random().toString(36).substring(2, 9),
        name,
        price: Number(price),
        costPrice: parsedCostPrice,
        barcode: cleanedBarcode,
        category: finalCategory,
        stock: parsedStock,
        reorderPoint: parsedReorderPoint,
        expiryDate: cleanedExpiryDate,
        boxFactor: parsedBoxFactor,
        boxPrice: parsedBoxPrice,
        boxBarcode: cleanedBoxBarcode,
        packFactor: parsedPackFactor,
        packPrice: parsedPackPrice,
        packBarcode: cleanedPackBarcode,
      };
      onAddProduct(newProduct);
      setName('');
      setPrice('');
      setCostPrice('');
      setBarcode('');
      setCategory('عام');
      setCustomCategory('');
      setIsCustomCategoryMode(false);
      setStock('');
      setReorderPoint('');
      setExpiryDate('');
      setBoxFactor('');
      setBoxPrice('');
      setBoxBarcode('');
      setPackFactor('');
      setPackPrice('');
      setPackBarcode('');
      setShowPackagingOptions(false);
    }
  };

  const handleQuickRestock = (product: Product, amount: number) => {
    const current = product.stock ?? 0;
    onUpdateProduct({
      ...product,
      stock: current + amount,
    });
  };

  return (
    <div className="flex flex-col gap-4 h-full" dir="rtl">
      {/* Top Search & Category Filter Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:flex-1">
            <input
              type="text"
              placeholder="ابحث عن منتج بالاسم، الباركود، أو القسم..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-medium"
            />
            <Search size={18} className="absolute right-3 top-3 text-gray-400 pointer-events-none" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-2.5 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200 transition-colors"
                title="مسح البحث"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <button
            onClick={() => setFilterAlertOnly(!filterAlertOnly)}
            className={`w-full sm:w-auto px-4 py-2.5 rounded-lg text-sm font-bold border transition-colors flex items-center justify-center gap-2 whitespace-nowrap shrink-0 ${
              filterAlertOnly
                ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
            }`}
          >
            <AlertTriangle size={16} className={filterAlertOnly ? 'text-white' : 'text-amber-600'} />
            تنبيهات حد الطلب ({lowStockProducts.length})
          </button>
        </div>

        {/* Categories Pills Filter Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 border-t border-gray-100 no-scrollbar">
          <span className="text-xs font-bold text-gray-500 flex items-center gap-1 shrink-0">
            <Folder size={14} className="text-blue-600" />
            تصفية بالقسم:
          </span>
          <button
            onClick={() => setSelectedCategoryFilter('all')}
            className={`px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer shrink-0 ${
              selectedCategoryFilter === 'all'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            الكل ({products.length})
          </button>
          {availableCategories.map((cat) => {
            const count = products.filter(p => (p.category || 'عام') === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategoryFilter(cat)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer shrink-0 flex items-center gap-1 ${
                  selectedCategoryFilter === cat
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span>{cat}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${selectedCategoryFilter === cat ? 'bg-blue-800 text-white' : 'bg-gray-200 text-gray-600'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Stock Alert Banner */}
      {lowStockProducts.length > 0 && !filterAlertOnly && (
        <div className="bg-amber-50 border-r-4 border-amber-500 p-3.5 rounded-xl shadow-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500 text-white p-1.5 rounded-lg shrink-0">
              <AlertTriangle size={18} />
            </div>
            <div>
              <h3 className="font-bold text-amber-900 text-sm">
                تنبيه المخزون: هناك {lowStockProducts.length} منتج وصلت إلى 'حد الطلب' أو أقل!
              </h3>
            </div>
          </div>
          <button
            onClick={() => setFilterAlertOnly(true)}
            className="text-xs font-bold text-amber-900 underline hover:text-amber-950 whitespace-nowrap"
          >
            عرضها الآن
          </button>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-6 flex-1 min-h-0">
        {/* Add/Edit Product Form */}
        <div className="w-full md:w-1/3 bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col h-fit">
          <h2 className="text-xl font-bold mb-4 text-gray-800 border-b pb-2 flex items-center gap-2">
            {editingId ? <Edit3 className="text-amber-600" /> : <PlusCircle className="text-blue-600" />}
            {editingId ? 'تعديل بيانات المنتج' : 'إضافة منتج جديد'}
          </h2>
          
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-gray-700 font-semibold mb-1 text-sm">اسم المنتج *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                placeholder="مثال: عصير برتقال 1 لتر"
                required
              />
            </div>

            {/* Category / Department System */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-gray-700 font-semibold text-sm flex items-center gap-1.5">
                  <Folder size={15} className="text-blue-600" />
                  القسم / التصنيف *
                </label>
                <button
                  type="button"
                  onClick={() => setIsCustomCategoryMode(!isCustomCategoryMode)}
                  className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                >
                  {isCustomCategoryMode ? 'اختيار من القائمة' : '+ قسم جديد'}
                </button>
              </div>

              {isCustomCategoryMode ? (
                <input
                  type="text"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  className="w-full p-2.5 border border-blue-400 bg-blue-50/30 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm font-bold"
                  placeholder="اكتب اسم القسم الجديد..."
                  required
                />
              ) : (
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm font-semibold bg-white"
                >
                  {availableCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              )}
            </div>
            
            <div>
              <label className="block text-gray-700 font-semibold mb-1 text-sm">رمز الباركود (Barcode) / SKU</label>
              <div className="relative">
                <input
                  type="text"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  className="w-full p-2.5 pr-9 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm font-mono"
                  placeholder="مثال: 6281001234567"
                />
                <Barcode size={18} className="absolute right-2.5 top-3 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-1 text-sm">السعر (د.ل) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm font-bold"
                placeholder="0.00"
                required
              />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-1 text-sm">تكلفة الشراء (د.ل)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm font-bold"
                placeholder="0.00"
              />
              <p className="text-[10px] text-gray-500 mt-1">تستخدم لحساب الأرباح في قسم التقارير.</p>
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-1 text-sm flex items-center gap-1.5">
                <Calendar size={15} className="text-rose-600" />
                تاريخ انتهاء الصلاحية (Expiry Date)
              </label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none text-sm font-medium"
              />
              <p className="text-[10px] text-gray-500 mt-1">يُظهر تنبيهات فورية في صفحة التقارير عند اقتراب الانتهاء.</p>
            </div>

            <div className="pt-2 border-t border-gray-100">
              <span className="text-xs font-bold text-gray-500 block mb-2">إعدادات المخزون والتنبيهات (اختياري)</span>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1 text-xs">الكمية الحالية</label>
                  <input
                    type="number"
                    min="0"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                    placeholder="مثال: 50"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-1 text-xs text-amber-800 flex items-center gap-1">
                    <AlertTriangle size={12} className="text-amber-600" />
                    حد الطلب
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={reorderPoint}
                    onChange={(e) => setReorderPoint(e.target.value)}
                    className="w-full p-2 border border-amber-300 bg-amber-50/30 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm"
                    placeholder="مثال: 10"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
                عند وصول الكمية الحالية إلى 'حد الطلب' أو أقل، سيظهر تنبيه بصري بارز لإعادة الشراء.
              </p>
            </div>

            {/* Packaging Units Section: الصندوق والستيكة */}
            <div className="pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowPackagingOptions(!showPackagingOptions)}
                className="w-full flex items-center justify-between p-2.5 rounded-lg bg-blue-50/80 hover:bg-blue-100 text-blue-900 border border-blue-200 text-xs font-bold transition-all cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <Boxes size={16} className="text-blue-700" />
                  إعدادات التعبئة (الصندوق / الستيكة)
                  {(boxFactor || packFactor) && (
                    <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.2 rounded-full">
                      مفعل
                    </span>
                  )}
                </span>
                {showPackagingOptions ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {showPackagingOptions && (
                <div className="mt-2.5 p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-3.5 animate-in fade-in">
                  
                  {/* Box (الكرتون / الصندوق) */}
                  <div className="p-2.5 bg-white rounded-lg border border-blue-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-blue-900 flex items-center gap-1">
                        <Boxes size={14} className="text-blue-600" />
                        الصندوق (الكرتون):
                      </span>
                      {boxFactor && price && (
                        <span className="text-[11px] text-gray-500 font-mono">
                          السعر التلقائي: {(Number(price) * Number(boxFactor)).toFixed(2)} د.ل
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-0.5">عدد القطع في الصندوق</label>
                        <input
                          type="number"
                          min="1"
                          value={boxFactor}
                          onChange={(e) => setBoxFactor(e.target.value)}
                          placeholder="مثال: 24"
                          className="w-full p-2 border border-gray-300 rounded-lg text-xs font-bold focus:ring-1 focus:ring-blue-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-0.5">سعر بيع الصندوق (د.ل)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={boxPrice}
                          onChange={(e) => setBoxPrice(e.target.value)}
                          placeholder={boxFactor && price ? (Number(price) * Number(boxFactor)).toFixed(2) : "0.00"}
                          className="w-full p-2 border border-gray-300 rounded-lg text-xs font-bold focus:ring-1 focus:ring-blue-500 outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-0.5">باركود الصندوق الخارجي (اختياري)</label>
                      <input
                        type="text"
                        value={boxBarcode}
                        onChange={(e) => setBoxBarcode(e.target.value)}
                        placeholder="لمسح باركود الصندوق مباشرة في الكاشير..."
                        className="w-full p-2 border border-gray-300 rounded-lg text-xs font-mono focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>

                  {/* Pack (الستيكة / الربطة) */}
                  <div className="p-2.5 bg-white rounded-lg border border-purple-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-purple-900 flex items-center gap-1">
                        <Layers size={14} className="text-purple-600" />
                        الستيكة (الربطة):
                      </span>
                      {packFactor && price && (
                        <span className="text-[11px] text-gray-500 font-mono">
                          السعر التلقائي: {(Number(price) * Number(packFactor)).toFixed(2)} د.ل
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-0.5">عدد القطع في الستيكة</label>
                        <input
                          type="number"
                          min="1"
                          value={packFactor}
                          onChange={(e) => setPackFactor(e.target.value)}
                          placeholder="مثال: 6 أو 12"
                          className="w-full p-2 border border-gray-300 rounded-lg text-xs font-bold focus:ring-1 focus:ring-purple-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-0.5">سعر بيع الستيكة (د.ل)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={packPrice}
                          onChange={(e) => setPackPrice(e.target.value)}
                          placeholder={packFactor && price ? (Number(price) * Number(packFactor)).toFixed(2) : "0.00"}
                          className="w-full p-2 border border-gray-300 rounded-lg text-xs font-bold focus:ring-1 focus:ring-purple-500 outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 mb-0.5">باركود الستيكة الخارجي (اختياري)</label>
                      <input
                        type="text"
                        value={packBarcode}
                        onChange={(e) => setPackBarcode(e.target.value)}
                        placeholder="لمسح باركود الستيكة مباشرة في الكاشير..."
                        className="w-full p-2 border border-gray-300 rounded-lg text-xs font-mono focus:ring-1 focus:ring-purple-500 outline-none"
                      />
                    </div>
                  </div>

                </div>
              )}
            </div>

            <div className="flex gap-2 mt-2">
              <button
                type="submit"
                className={`flex-1 font-bold py-3 px-4 rounded-lg transition-colors flex justify-center items-center gap-2 text-white cursor-pointer ${
                  editingId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {editingId ? <CheckCircle2 size={18} /> : <PlusCircle size={18} />}
                {editingId ? 'حفظ التعديلات' : 'حفظ المنتج'}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 px-4 rounded-lg transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Products List & Alert Overview */}
        <div className="w-full md:w-2/3 bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-4 border-b pb-3">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Package className="text-gray-600" />
              قائمة المنتجات ({filteredProducts.length} من {products.length})
            </h2>
            <div className="flex gap-2">
              {selectedCategoryFilter !== 'all' && (
                <span className="text-xs text-purple-700 font-bold bg-purple-50 px-2.5 py-1 rounded-full border border-purple-200">
                  القسم: {selectedCategoryFilter}
                </span>
              )}
              {searchQuery && (
                <span className="text-xs text-blue-600 font-semibold bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
                  بحث: "{searchQuery}"
                </span>
              )}
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-1">
            {products.length === 0 ? (
              <div className="text-center text-gray-400 mt-10">لا توجد منتجات مسجلة حتى الآن.</div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center text-gray-400 mt-10 flex flex-col items-center gap-2">
                <span>لا توجد منتجات تطابق المعايير المختارة.</span>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategoryFilter('all');
                    setFilterAlertOnly(false);
                  }}
                  className="text-xs text-blue-600 hover:underline font-bold"
                >
                  إعادة ضبط الفلاتر
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-2">
                {filteredProducts.map((product) => {
                  const isOutOfStock = product.stock !== undefined && product.stock === 0;
                  const isLowStock =
                    product.stock !== undefined &&
                    product.reorderPoint !== undefined &&
                    product.stock <= product.reorderPoint;

                  let cardStyle = 'bg-gray-50 border-gray-200 hover:bg-white hover:border-gray-300';
                  if (isOutOfStock) {
                    cardStyle = 'bg-red-50/80 border-red-300 border-r-4 border-r-red-600 ring-2 ring-red-400/20';
                  } else if (isLowStock) {
                    cardStyle = 'bg-amber-50/80 border-amber-300 border-r-4 border-r-amber-500 ring-2 ring-amber-400/20';
                  }

                  return (
                    <div
                      key={product.id}
                      className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all shadow-sm ${cardStyle}`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap mb-1">
                            <h3 className="font-bold text-gray-900 text-base leading-snug line-clamp-1">
                              {product.name}
                            </h3>
                            <span className="bg-purple-50 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded border border-purple-200 inline-flex items-center gap-0.5">
                              <Tag size={10} />
                              {product.category || 'عام'}
                            </span>
                            {isOutOfStock ? (
                              <span 
                                className="inline-flex items-center gap-1 bg-red-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-xs shrink-0 animate-pulse" 
                                title="نفدت الكمية بالكامل من المخزون!"
                              >
                                <AlertTriangle size={12} className="shrink-0" />
                                نفد المخزون
                              </span>
                            ) : isLowStock ? (
                              <span 
                                className="inline-flex items-center gap-1 bg-amber-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-xs shrink-0 animate-pulse" 
                                title="الكمية الحالية وصلت حد الطلب المعتمد!"
                              >
                                <AlertTriangle size={12} className="shrink-0" />
                                تنبيه حد الطلب
                              </span>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-blue-600 font-bold text-sm">
                              {product.price.toFixed(2)} د.ل
                            </span>
                            {product.barcode && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
                                <Barcode size={12} className="text-gray-400" />
                                {product.barcode}
                              </span>
                            )}
                            {product.expiryDate && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-800 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                <Clock size={12} className="text-rose-500" />
                                صلاحية: {product.expiryDate}
                              </span>
                            )}
                            {product.boxFactor && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                <Boxes size={12} className="text-blue-600" />
                                صندوق ({product.boxFactor}): {(product.boxPrice ?? product.price * product.boxFactor).toFixed(2)} د.ل
                              </span>
                            )}
                            {product.packFactor && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-800 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                                <Layers size={12} className="text-purple-600" />
                                ستيكة ({product.packFactor}): {(product.packPrice ?? product.price * product.packFactor).toFixed(2)} د.ل
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleStartEdit(product)}
                            title="تعديل المنتج"
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-200 cursor-pointer"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            onClick={() => handleRequestDeleteProduct(product.id)}
                            title="حذف المنتج"
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200 cursor-pointer"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Stock & Reorder Alert Badge */}
                      <div className="mt-2 pt-2 border-t border-gray-200/60 flex items-center justify-between text-xs">
                        {isOutOfStock ? (
                          <div className="flex items-center gap-1.5 text-red-900 font-bold bg-red-100 border border-red-300 px-2.5 py-1 rounded-md w-full justify-between">
                            <span className="flex items-center gap-1">
                              <AlertTriangle size={14} className="text-red-600 shrink-0" />
                              نفدت الكمية! (المتبقي: 0)
                            </span>
                            <span className="text-[11px] opacity-80">الحد: {product.reorderPoint ?? '-'}</span>
                          </div>
                        ) : isLowStock ? (
                          <div className="flex items-center gap-1.5 text-amber-900 font-bold bg-amber-100 border border-amber-300 px-2.5 py-1 rounded-md w-full justify-between">
                            <span className="flex items-center gap-1">
                              <AlertTriangle size={14} className="text-amber-600 shrink-0" />
                              وصل حد الطلب! (المتبقي: {product.stock})
                            </span>
                            <span className="text-[11px] opacity-80">الحد: {product.reorderPoint}</span>
                          </div>
                        ) : product.stock !== undefined ? (
                          <div className="flex items-center justify-between w-full text-gray-600">
                            <span className="font-semibold">
                              الكمية الحالية: <strong className="text-gray-900">{product.stock}</strong>
                            </span>
                            {product.reorderPoint !== undefined ? (
                              <span className="text-gray-500 text-[11px]">حد الطلب: {product.reorderPoint}</span>
                            ) : (
                              <span className="text-gray-400 text-[11px]">بدون حد</span>
                            )}
                          </div>
                        ) : (
                          <div className="text-gray-400 text-[11px] italic">
                            غير محدد كمية المخزون
                          </div>
                        )}
                      </div>

                      {/* Quick Restock Action Button */}
                      {product.stock !== undefined && (
                        <div className="mt-2 flex justify-end">
                          <button
                            onClick={() => handleQuickRestock(product, 10)}
                            className="text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-0.5 rounded flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <RefreshCw size={12} />
                            إعادة تزويد (+10)
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      {/* PIN Verification Modal for Deletion */}
      <ActionPinModal
        isOpen={showDeletePinModal}
        title="تأكيد حذف المنتج"
        description="هذا الإجراء يحتاج كلمة مرور المدير أو رمز كاشير بخصائص الحذف."
        users={users}
        onClose={() => {
          setShowDeletePinModal(false);
          setPendingDeleteId(null);
        }}
        onSuccess={handleConfirmDeleteWithPin}
      />
    </div>
  );
}
