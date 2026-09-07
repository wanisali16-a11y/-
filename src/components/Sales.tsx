import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Product, CartItem, Transaction, User, HeldCart, StoreInfo, DEFAULT_CATEGORIES } from '../types';
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard, 
  Banknote, 
  Search, 
  Printer, 
  Camera, 
  FileText,
  ChevronDown,
  ChevronUp,
  Package,
  X,
  History,
  PauseCircle,
  PlayCircle,
  AlertTriangle,
  Folder,
  Tag
} from 'lucide-react';
import ReceiptModal from './ReceiptModal';
import BarcodeScannerModal from './BarcodeScannerModal';
import PosCalculator from './PosCalculator';

interface SalesProps {
  products: Product[];
  transactions: Transaction[];
  vatRate?: number;
  currentUser?: User;
  storeInfo?: StoreInfo;
  onTransactionComplete: (transaction: Transaction) => void;
  onOpenUserSwitch?: () => void;
  onToggleFavorite?: (productId: string) => void;
  onOpenCalculator?: () => void;
}

export default function Sales({ 
  products, 
  transactions, 
  vatRate = 0, 
  currentUser,
  storeInfo,
  onTransactionComplete,
  onOpenUserSwitch,
  onToggleFavorite,
  onOpenCalculator
}: SalesProps) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);
  const [autoPrint, setAutoPrint] = useState(true);
  const [completedTransaction, setCompletedTransaction] = useState<Transaction | null>(null);
  const [viewedTransaction, setViewedTransaction] = useState<Transaction | null>(null);
  
  // Classic POS States
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);
  const [paidAmount, setPaidAmount] = useState<string>('');
  const [barcodeInput, setBarcodeInput] = useState<string>('');
  
  // Product Search Modal State
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [selectedSalesCategory, setSelectedSalesCategory] = useState<string>('all');
  
  // Split Payment Modal State
  const [isSplitPaymentOpen, setIsSplitPaymentOpen] = useState(false);
  const [splitCash, setSplitCash] = useState('');
  const [splitCard, setSplitCard] = useState('');
  
  // Held Carts State
  const [isHeldCartsModalOpen, setIsHeldCartsModalOpen] = useState(false);
  const [heldCarts, setHeldCarts] = useState<HeldCart[]>(() => {
    try {
      const saved = localStorage.getItem('pos_held_carts');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('pos_held_carts', JSON.stringify(heldCarts));
  }, [heldCarts]);
  
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  
  // Global Scanner Refs
  const globalBarcodeBufferRef = useRef<string>('');
  const globalBarcodeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Recent Sales
  const recentSales = useMemo(() => {
    return transactions
      .filter(t => t.type === 'sale' && t.status !== 'cancelled')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [transactions]);

  // Focus barcode input by default
  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, []);

  const addToCart = (product: Product, unit: 'piece' | 'pack' | 'box' = 'piece') => {
    let unitMultiplier = 1;
    let unitPrice = product.price;
    let unitLabel = 'قطعة';

    if (unit === 'box') {
      unitMultiplier = product.boxFactor && product.boxFactor > 0 ? product.boxFactor : 1;
      unitPrice = product.boxPrice !== undefined && product.boxPrice > 0 
        ? product.boxPrice 
        : (product.price * unitMultiplier);
      unitLabel = `صندوق (${unitMultiplier} قطعة)`;
    } else if (unit === 'pack') {
      unitMultiplier = product.packFactor && product.packFactor > 0 ? product.packFactor : 1;
      unitPrice = product.packPrice !== undefined && product.packPrice > 0 
        ? product.packPrice 
        : (product.price * unitMultiplier);
      unitLabel = `ستيكة (${unitMultiplier} قطعة)`;
    }

    const itemKey = `${product.id}-${unit}`;

    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (item) => (item.cartItemId || item.id) === itemKey || (item.id === product.id && (item.selectedUnit || 'piece') === unit)
      );

      if (existingIndex !== -1) {
        return prev.map((item, idx) =>
          idx === existingIndex ? { ...item, quantity: item.quantity + 1 } : item
        );
      }

      return [
        ...prev,
        {
          ...product,
          cartItemId: itemKey,
          price: unitPrice,
          selectedUnit: unit,
          unitMultiplier,
          unitName: unitLabel,
          quantity: 1,
        }
      ];
    });

    setSelectedItemIndex(cart.length);
  };

  const updateQuantity = (cartKey: string, delta: number) => {
    setCart((prev) =>
      prev.map((item) => {
        const key = item.cartItemId || item.id;
        if (key === cartKey) {
          const newQuantity = Math.max(0, item.quantity + delta);
          return { ...item, quantity: newQuantity };
        }
        return item;
      }).filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (cartKey: string) => {
    setCart((prev) => {
      const newCart = prev.filter((item) => (item.cartItemId || item.id) !== cartKey);
      if (selectedItemIndex !== null && selectedItemIndex >= newCart.length) {
        setSelectedItemIndex(newCart.length > 0 ? newCart.length - 1 : null);
      }
      return newCart;
    });
  };

  const changeSelectedItemUnit = (newUnit: 'piece' | 'pack' | 'box') => {
    if (selectedItemIndex === null || !cart[selectedItemIndex]) return;
    const currentItem = cart[selectedItemIndex];
    if (currentItem.selectedUnit === newUnit) return;

    // Retrieve product metadata
    const originalProd = products.find(p => p.id === currentItem.id) || currentItem;
    let unitMultiplier = 1;
    let unitPrice = originalProd.price;
    let unitLabel = 'قطعة';

    if (newUnit === 'box') {
      unitMultiplier = originalProd.boxFactor && originalProd.boxFactor > 0 ? originalProd.boxFactor : 1;
      unitPrice = originalProd.boxPrice !== undefined && originalProd.boxPrice > 0 
        ? originalProd.boxPrice 
        : (originalProd.price * unitMultiplier);
      unitLabel = `صندوق (${unitMultiplier} قطعة)`;
    } else if (newUnit === 'pack') {
      unitMultiplier = originalProd.packFactor && originalProd.packFactor > 0 ? originalProd.packFactor : 1;
      unitPrice = originalProd.packPrice !== undefined && originalProd.packPrice > 0 
        ? originalProd.packPrice 
        : (originalProd.price * unitMultiplier);
      unitLabel = `ستيكة (${unitMultiplier} قطعة)`;
    }

    const newKey = `${currentItem.id}-${newUnit}`;

    setCart(prev => prev.map((item, idx) => {
      if (idx === selectedItemIndex) {
        return {
          ...item,
          cartItemId: newKey,
          selectedUnit: newUnit,
          unitMultiplier,
          unitName: unitLabel,
          price: unitPrice,
        };
      }
      return item;
    }));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const vatAmount = subtotal * (vatRate / 100);
  const total = subtotal + vatAmount;

  const getNextInvoiceNumber = () => {
    const highestExisting = transactions.reduce((max, t) => {
      return (t.invoiceNumber && t.invoiceNumber > max) ? t.invoiceNumber : max;
    }, 0);
    return Math.max(highestExisting, transactions.length) + 1;
  };

  const handleCheckout = (paymentMethod: 'cash' | 'card') => {
    if (cart.length === 0) return;

    const numericPaid = parseFloat(paidAmount);
    const paidCashVal = paymentMethod === 'cash' ? (!isNaN(numericPaid) && numericPaid >= total ? numericPaid : total) : undefined;
    const changeVal = paidCashVal && paidCashVal > total ? paidCashVal - total : (paymentMethod === 'cash' ? 0 : undefined);
    const nextInvoiceNumber = getNextInvoiceNumber();

    const transaction: Transaction = {
      id: `INV-${String(nextInvoiceNumber).padStart(4, '0')}`,
      invoiceNumber: nextInvoiceNumber,
      date: new Date().toISOString(),
      items: cart,
      subtotal,
      vatRate,
      vatAmount,
      total,
      paymentMethod,
      paidCash: paidCashVal,
      changeAmount: changeVal,
      type: 'sale',
      cashierId: currentUser?.id,
      cashierName: currentUser?.name || 'علي المزداوي',
    };

    onTransactionComplete(transaction);
    setCompletedTransaction(transaction);
    setCart([]);
    setPaidAmount('');
    setSelectedItemIndex(null);
  };

  const handleSplitCashChange = (val: string) => {
    setSplitCash(val);
    const cash = parseFloat(val) || 0;
    if (cash <= total) {
      setSplitCard((total - cash).toFixed(2));
    } else {
      setSplitCard('0.00');
    }
  };

  const handleSplitCardChange = (val: string) => {
    setSplitCard(val);
    const card = parseFloat(val) || 0;
    if (card <= total) {
      setSplitCash((total - card).toFixed(2));
    } else {
      setSplitCash('0.00');
    }
  };

  const handleSplitCheckout = () => {
    const cashAmount = parseFloat(splitCash) || 0;
    const cardAmount = parseFloat(splitCard) || 0;
    // We check if it adds up to total (with tiny floating point tolerance)
    if (Math.abs(cashAmount + cardAmount - total) > 0.05) {
      alert("مجموع الدفع النقدي والبطاقة يجب أن يساوي إجمالي الفاتورة");
      return;
    }

    const nextInvoiceNumber = getNextInvoiceNumber();

    const transaction: Transaction = {
      id: `INV-${String(nextInvoiceNumber).padStart(4, '0')}`,
      invoiceNumber: nextInvoiceNumber,
      date: new Date().toISOString(),
      items: cart,
      subtotal,
      vatRate,
      vatAmount,
      total,
      paymentMethod: 'split',
      cashAmount,
      cardAmount,
      type: 'sale',
      cashierId: currentUser?.id,
      cashierName: currentUser?.name || 'علي المزداوي',
    };

    onTransactionComplete(transaction);
    setCompletedTransaction(transaction);
    setCart([]);
    setPaidAmount('');
    setSelectedItemIndex(null);
    setIsSplitPaymentOpen(false);
    setSplitCash('');
    setSplitCard('');
  };

  // --- Held Carts Handlers ---
  const handleHoldCart = () => {
    if (cart.length === 0) return;
    const newHeldCart: HeldCart = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      items: [...cart],
      name: `سلة معلقة ${heldCarts.length + 1}`
    };
    setHeldCarts(prev => [newHeldCart, ...prev]);
    setCart([]);
    setPaidAmount('');
    setSelectedItemIndex(null);
  };

  const handleRestoreCart = (heldCart: HeldCart) => {
    if (cart.length > 0) {
      alert("الرجاء إفراغ السلة الحالية أو تعليقها قبل استرجاع سلة أخرى.");
      return;
    }
    setCart(heldCart.items);
    setHeldCarts(prev => prev.filter(c => c.id !== heldCart.id));
    setIsHeldCartsModalOpen(false);
  };

  const handleDeleteHeldCart = (id: string) => {
    setHeldCarts(prev => prev.filter(c => c.id !== id));
  };

  // --- Keyboard & Numpad Handlers ---
  const handleNumpad = (val: string) => {
    if (val === 'C') {
      setPaidAmount('');
      return;
    }
    setPaidAmount(prev => prev + val);
  };

  const handleBarcodeSearch = () => {
    const currentInput = barcodeInputRef.current?.value || barcodeInput;
    if (!currentInput.trim()) return;
    const query = currentInput.trim().toLowerCase();
    
    // 1. Check Box Barcode Match
    const boxMatch = products.find(p => p.boxBarcode && p.boxBarcode.toLowerCase() === query);
    if (boxMatch) {
      addToCart(boxMatch, 'box');
      setBarcodeInput('');
      if (barcodeInputRef.current) barcodeInputRef.current.value = '';
      return;
    }

    // 2. Check Pack Barcode Match
    const packMatch = products.find(p => p.packBarcode && p.packBarcode.toLowerCase() === query);
    if (packMatch) {
      addToCart(packMatch, 'pack');
      setBarcodeInput('');
      if (barcodeInputRef.current) barcodeInputRef.current.value = '';
      return;
    }

    // 3. Check Standard Barcode or ID
    const product = products.find(p => 
      p.barcode?.toLowerCase() === query || 
      p.id.toLowerCase() === query
    );
    
    if (product) {
       addToCart(product, 'piece');
       setBarcodeInput('');
       if (barcodeInputRef.current) barcodeInputRef.current.value = ''; // Force clear immediately
    } else {
       setProductSearchQuery(currentInput);
       setIsProductModalOpen(true);
       setBarcodeInput('');
       if (barcodeInputRef.current) barcodeInputRef.current.value = ''; // Force clear immediately
    }
  };

  // --- List Navigation Handlers ---
  const moveUp = () => {
    if (cart.length === 0) return;
    if (selectedItemIndex === null) setSelectedItemIndex(cart.length - 1);
    else setSelectedItemIndex(Math.max(0, selectedItemIndex - 1));
  };

  const moveDown = () => {
    if (cart.length === 0) return;
    if (selectedItemIndex === null) setSelectedItemIndex(0);
    else setSelectedItemIndex(Math.min(cart.length - 1, selectedItemIndex + 1));
  };

  const incQty = () => {
    if (selectedItemIndex !== null && cart[selectedItemIndex]) {
      const key = cart[selectedItemIndex].cartItemId || cart[selectedItemIndex].id;
      updateQuantity(key, 1);
    }
  };

  const decQty = () => {
    if (selectedItemIndex !== null && cart[selectedItemIndex]) {
      const key = cart[selectedItemIndex].cartItemId || cart[selectedItemIndex].id;
      updateQuantity(key, -1);
    }
  };

  const deleteRow = () => {
    if (selectedItemIndex !== null && cart[selectedItemIndex]) {
      const key = cart[selectedItemIndex].cartItemId || cart[selectedItemIndex].id;
      removeFromCart(key);
    }
  };

  // --- Keyboard Shortcuts Effect ---
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Don't trigger standard shortcuts if user is typing in a text input (other than barcode input)
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
      const isSearchInput = target.id === 'barcode-input-field';

      // --- Global Barcode Scanner Detection ---
      // Only capture rapid keystrokes globally if we are NOT in an input.
      // (If we are in the barcode input, its own onChange and onKeyDown will handle it flawlessly).
      if (!isInput) {
        if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
          globalBarcodeBufferRef.current += e.key;
          if (globalBarcodeTimeoutRef.current) clearTimeout(globalBarcodeTimeoutRef.current);
          globalBarcodeTimeoutRef.current = setTimeout(() => {
            globalBarcodeBufferRef.current = ''; // Clear buffer if typing is too slow (not a scanner)
          }, 150); // Increased timeout to 150ms for better scanner compatibility
          return;
        }

        if (e.key === 'Enter' && globalBarcodeBufferRef.current.length > 0) {
          e.preventDefault();
          const query = globalBarcodeBufferRef.current.trim().toLowerCase();
          
          const boxMatch = products.find(p => p.boxBarcode && p.boxBarcode.toLowerCase() === query);
          const packMatch = products.find(p => p.packBarcode && p.packBarcode.toLowerCase() === query);
          const product = products.find(p => 
            p.barcode?.toLowerCase() === query || 
            p.id.toLowerCase() === query
          );
          
          if (boxMatch) {
            addToCart(boxMatch, 'box');
          } else if (packMatch) {
            addToCart(packMatch, 'pack');
          } else if (product) {
            addToCart(product, 'piece');
          } else {
            setProductSearchQuery(globalBarcodeBufferRef.current);
            setIsProductModalOpen(true);
          }
          globalBarcodeBufferRef.current = '';
          return;
        }
      }

      if (e.key === 'F1') {
        e.preventDefault();
        setIsProductModalOpen(true);
      } else if (e.key === 'F3') {
        e.preventDefault();
        setCart([]);
        setPaidAmount('');
        setSelectedItemIndex(null);
        barcodeInputRef.current?.focus();
      } else if (e.key === 'F12') {
        e.preventDefault();
        handleCheckout('cash');
      } else if (e.key === 'ArrowUp') {
         if (!isProductModalOpen && !isBarcodeScannerOpen) {
           e.preventDefault();
           moveUp();
         }
      } else if (e.key === 'ArrowDown') {
         if (!isProductModalOpen && !isBarcodeScannerOpen) {
           e.preventDefault();
           moveDown();
         }
      } else if (e.key === 'Delete') {
         if (!isProductModalOpen && !isBarcodeScannerOpen && (!isInput || isSearchInput)) {
           e.preventDefault();
           deleteRow();
         }
      } else if (e.key === '+') {
         if (!isProductModalOpen && !isBarcodeScannerOpen && (!isInput || isSearchInput)) {
           e.preventDefault();
           incQty();
         }
      } else if (e.key === '-') {
         if (!isProductModalOpen && !isBarcodeScannerOpen && (!isInput || isSearchInput)) {
           e.preventDefault();
           decQty();
         }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [cart, selectedItemIndex, isProductModalOpen, isBarcodeScannerOpen, total, paidAmount, products]);

  // --- Derived Values ---
  const paidVal = parseFloat(paidAmount) || 0;

  // All unique available categories in products
  const availableSalesCategories = useMemo(() => {
    const categoriesSet = new Set<string>(DEFAULT_CATEGORIES);
    products.forEach(p => {
      if (p.category && p.category.trim()) {
        categoriesSet.add(p.category.trim());
      }
    });
    return Array.from(categoriesSet);
  }, [products]);

  // Filter products for the modal
  const filteredModalProducts = useMemo(() => {
    let list = products;
    if (selectedSalesCategory !== 'all') {
      list = list.filter(p => (p.category || 'عام') === selectedSalesCategory);
    }
    if (!productSearchQuery.trim()) return list;
    const lowerQuery = productSearchQuery.toLowerCase().trim();
    return list.filter(
      p => p.name.toLowerCase().includes(lowerQuery) || 
           (p.barcode && p.barcode.toLowerCase().includes(lowerQuery)) ||
           (p.category && p.category.toLowerCase().includes(lowerQuery))
    );
  }, [products, productSearchQuery, selectedSalesCategory]);

  return (
    <>
      <div className="flex flex-col md:flex-row gap-2 h-[calc(100vh-80px)] bg-gray-200 p-2 print:hidden select-none">
        
        {/* ==================================================== */}
        {/* RIGHT PANEL: ACTIONS & NUMPAD (First in DOM for RTL) */}
        {/* ==================================================== */}
        <div className="w-full md:w-96 lg:w-[420px] xl:w-[450px] flex flex-col gap-2 shrink-0">
          
          {/* Action Grid */}
          <div className="bg-gray-100 border border-gray-300 p-2 shadow-sm rounded-md">
             {/* Fast Barcode Scanner Input */}
             <div className="relative mb-2">
               <input 
                 id="barcode-input-field"
                 ref={barcodeInputRef}
                 type="text" 
                 placeholder="ادخل أو امسح باركود الصنف..."
                 className="w-full border-2 border-blue-500 bg-white p-2 text-center font-bold outline-none focus:border-blue-700 focus:bg-yellow-50 text-lg shadow-inner rounded"
                 value={barcodeInput}
                 onChange={(e) => setBarcodeInput(e.target.value)}
                 onKeyDown={(e) => {
                   if(e.key === 'Enter') handleBarcodeSearch();
                 }}
               />
               <Search className="absolute right-3 top-3 text-blue-500" size={20} />
             </div>

             {/* Action Buttons */}
             <div className="grid grid-cols-3 gap-1.5 text-xs">
               <button onClick={() => setIsProductModalOpen(true)} className="bg-gradient-to-b from-gray-50 to-gray-200 hover:from-blue-50 hover:to-blue-100 border border-gray-300 p-2 font-bold text-gray-800 flex flex-col items-center justify-center gap-1 rounded shadow-xs active:scale-95 h-16">
                 <Search size={20} className="text-blue-700" /> 
                 <span className="text-xs">بحث (F1)</span>
               </button>
               <button onClick={() => setCart([])} className="bg-gradient-to-b from-gray-50 to-gray-200 hover:from-gray-100 hover:to-gray-300 border border-gray-300 p-2 font-bold text-gray-800 flex flex-col items-center justify-center gap-1 rounded shadow-xs active:scale-95 h-16">
                 <FileText size={20} className="text-gray-600" /> 
                 <span className="text-xs">جديدة (F3)</span>
               </button>
               <button onClick={handleHoldCart} disabled={cart.length === 0} className="bg-gradient-to-b from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200 border border-orange-300 p-2 font-bold text-orange-900 flex flex-col items-center justify-center gap-1 rounded shadow-xs active:scale-95 h-16 disabled:opacity-50">
                 <PauseCircle size={20} className="text-orange-600" /> 
                 <span className="text-xs">تعليق</span>
               </button>
               <button onClick={() => setIsHeldCartsModalOpen(true)} className="bg-gradient-to-b from-indigo-50 to-indigo-100 hover:from-indigo-100 hover:to-indigo-200 border border-indigo-300 p-2 font-bold text-indigo-900 flex flex-col items-center justify-center gap-1 rounded shadow-xs active:scale-95 h-16 relative">
                 <PlayCircle size={20} className="text-indigo-600" /> 
                 <span className="text-xs">المعلقة</span>
                 {heldCarts.length > 0 && (
                   <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-extrabold border-2 border-white shadow-xs">{heldCarts.length}</span>
                 )}
               </button>
               <button onClick={() => setAutoPrint(!autoPrint)} className={`border p-2 font-bold flex flex-col items-center justify-center gap-1 rounded shadow-xs active:scale-95 h-16 ${autoPrint ? 'bg-gradient-to-b from-blue-100 to-blue-200 border-blue-400 text-blue-900' : 'bg-gradient-to-b from-gray-50 to-gray-200 border-gray-300 text-gray-800'}`}>
                 <Printer size={20} className={autoPrint ? 'text-blue-700' : 'text-gray-600'} /> 
                 <span className="text-xs">طباعة تلقائية</span>
               </button>
               <button onClick={() => setIsBarcodeScannerOpen(true)} className="bg-gradient-to-b from-gray-50 to-gray-200 hover:from-gray-100 hover:to-gray-300 border border-gray-300 p-2 font-bold text-gray-800 flex flex-col items-center justify-center gap-1 rounded shadow-xs active:scale-95 h-16">
                 <Camera size={20} className="text-emerald-700" /> 
                 <span className="text-xs">ماسح كاميرا</span>
               </button>
             </div>
          </div>
          
          {/* Smart Custom POS Calculator */}
          <PosCalculator 
            paidAmount={paidAmount} 
            setPaidAmount={setPaidAmount} 
            total={total} 
          />
        </div>

        {/* ==================================================== */}
        {/* MIDDLE VERTICAL TOOLS STRIP */}
        {/* ==================================================== */}
        <div className="w-12 hidden md:flex flex-col gap-1 shrink-0">
          <button onClick={moveUp} className="flex-1 bg-gray-200 hover:bg-gray-300 border border-gray-300 text-gray-600 flex flex-col items-center justify-center rounded-sm">
            <ChevronUp size={20} />
          </button>
          <button onClick={moveDown} className="flex-1 bg-gray-200 hover:bg-gray-300 border border-gray-300 text-gray-600 flex flex-col items-center justify-center rounded-sm">
            <ChevronDown size={20} />
          </button>
          <button onClick={incQty} className="flex-1 bg-blue-100 hover:bg-blue-200 border border-blue-300 text-blue-700 flex flex-col items-center justify-center rounded-sm font-bold text-lg">
            <Plus size={20} />
          </button>
          <button onClick={decQty} className="flex-1 bg-orange-100 hover:bg-orange-200 border border-orange-300 text-orange-700 flex flex-col items-center justify-center rounded-sm font-bold text-lg">
            <Minus size={20} />
          </button>
          <button onClick={deleteRow} className="flex-1 bg-red-100 hover:bg-red-200 border border-red-300 text-red-600 flex flex-col items-center justify-center rounded-sm">
            <Trash2 size={18} />
          </button>
        </div>

        {/* ==================================================== */}
        {/* LEFT PANEL: TABLE & TOTALS (Last in DOM for RTL) */}
        {/* ==================================================== */}
        <div className="flex-1 flex flex-col bg-white border border-gray-300 shadow-sm overflow-hidden min-w-0">
          
          {/* Header Bar */}
          <div className="bg-blue-800 text-white p-2 font-bold flex flex-wrap items-center justify-between gap-2 text-sm">
             <div className="flex items-center gap-2">
               <ShoppingCart size={18} />
               <span>فاتورة مبيعات</span>
               {selectedItemIndex !== null && cart[selectedItemIndex] && (
                 <span className="text-[11px] bg-blue-700/90 border border-blue-600 px-2 py-0.5 rounded text-blue-100 font-medium">
                   المحدد: {cart[selectedItemIndex].name}
                 </span>
               )}
             </div>

             {/* Selected Item Unit Switcher (Piece / Pack / Box) */}
             {selectedItemIndex !== null && cart[selectedItemIndex] && (products.find(p => p.id === cart[selectedItemIndex].id)?.boxFactor || products.find(p => p.id === cart[selectedItemIndex].id)?.packFactor) && (
               <div className="flex items-center gap-1.5 text-xs bg-blue-900/60 px-2 py-1 rounded-lg border border-blue-700">
                 <span className="text-blue-200 text-[11px] font-normal">تبديل الوحدة:</span>
                 <button
                   type="button"
                   onClick={() => changeSelectedItemUnit('piece')}
                   className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer transition ${
                     (!cart[selectedItemIndex].selectedUnit || cart[selectedItemIndex].selectedUnit === 'piece')
                       ? 'bg-white text-blue-900 shadow-xs'
                       : 'bg-blue-800 hover:bg-blue-700 text-white'
                   }`}
                 >
                   قطعة
                 </button>
                 {products.find(p => p.id === cart[selectedItemIndex].id)?.packFactor && (
                   <button
                     type="button"
                     onClick={() => changeSelectedItemUnit('pack')}
                     className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer transition ${
                       cart[selectedItemIndex].selectedUnit === 'pack'
                         ? 'bg-purple-100 text-purple-900 shadow-xs'
                         : 'bg-blue-800 hover:bg-blue-700 text-white'
                     }`}
                   >
                     ستيكة ({products.find(p => p.id === cart[selectedItemIndex].id)?.packFactor})
                   </button>
                 )}
                 {products.find(p => p.id === cart[selectedItemIndex].id)?.boxFactor && (
                   <button
                     type="button"
                     onClick={() => changeSelectedItemUnit('box')}
                     className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer transition ${
                       cart[selectedItemIndex].selectedUnit === 'box'
                         ? 'bg-indigo-100 text-indigo-900 shadow-xs'
                         : 'bg-blue-800 hover:bg-blue-700 text-white'
                     }`}
                   >
                     صندوق ({products.find(p => p.id === cart[selectedItemIndex].id)?.boxFactor})
                   </button>
                 )}
               </div>
             )}

             <div className="text-xs text-blue-100">{new Date().toLocaleDateString('ar-LY')}</div>
          </div>

          {/* Main Table */}
          <div className="flex-1 overflow-auto bg-gray-50 border-b border-gray-300">
             <table className="w-full text-right border-collapse">
               <thead className="bg-blue-100 text-blue-900 sticky top-0 shadow-sm">
                 <tr>
                   <th className="p-2 border border-gray-300 font-bold">الصنف</th>
                   <th className="p-2 border border-gray-300 font-bold w-24 text-center">الكمية</th>
                   <th className="p-2 border border-gray-300 font-bold w-28 text-center">السعر</th>
                   <th className="p-2 border border-gray-300 font-bold w-32 text-center">المجموع</th>
                   <th className="p-2 border border-gray-300 font-bold w-32 text-center">باركود</th>
                 </tr>
               </thead>
               <tbody>
                 {cart.map((item, index) => {
                   const isSelected = selectedItemIndex === index;
                   return (
                     <tr
                       key={item.cartItemId || `${item.id}-${item.selectedUnit || 'piece'}-${index}`}
                       onClick={() => setSelectedItemIndex(index)}
                       className={`cursor-pointer border-b border-gray-200 transition-colors ${
                         isSelected ? 'bg-blue-600 text-white font-bold' : 'bg-white hover:bg-gray-100'
                       }`}
                     >
                       <td className="p-2 border-l border-gray-200">
                         <div className="flex items-center justify-between gap-1.5">
                           <span className="font-bold">{item.name}</span>
                           {item.selectedUnit && item.selectedUnit !== 'piece' && (
                             <span className={`text-[10px] px-1.5 py-0.5 rounded font-extrabold border shrink-0 ${
                               isSelected 
                                 ? 'bg-blue-800 text-white border-blue-400' 
                                 : item.selectedUnit === 'box'
                                   ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                                   : 'bg-purple-50 text-purple-800 border-purple-200'
                             }`}>
                               {item.selectedUnit === 'box' ? `صندوق (${item.unitMultiplier})` : `ستيكة (${item.unitMultiplier})`}
                             </span>
                           )}
                         </div>
                       </td>
                       <td className="p-2 border-l border-gray-200 text-center">{item.quantity}</td>
                       <td className="p-2 border-l border-gray-200 text-center">{item.price.toFixed(2)}</td>
                       <td className="p-2 border-l border-gray-200 text-center">{(item.price * item.quantity).toFixed(2)}</td>
                       <td className={`p-2 text-center text-sm ${isSelected ? 'text-blue-200' : 'text-gray-500'}`}>{item.barcode || '-'}</td>
                     </tr>
                   )
                 })}
                 {/* Empty rows filler to make it look like a classic grid */}
                 {cart.length < 15 && Array.from({ length: 15 - cart.length }).map((_, i) => (
                   <tr key={`empty-${i}`} className="bg-white border-b border-gray-100 h-10">
                     <td className="border-l border-gray-100"></td>
                     <td className="border-l border-gray-100"></td>
                     <td className="border-l border-gray-100"></td>
                     <td className="border-l border-gray-100"></td>
                     <td></td>
                   </tr>
                 ))}
               </tbody>
             </table>
          </div>
          
          {/* Totals Section */}
          <div className="bg-gray-200 p-2 shrink-0 border-t-4 border-blue-800">
            <div className="flex flex-col lg:flex-row gap-4">
              
              {/* Financial Summaries */}
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center">
                    <span className="w-28 bg-gray-300 p-1.5 text-center font-bold border border-gray-400 text-gray-800 text-sm">مجموع الفاتورة</span>
                    <input readOnly value={subtotal.toFixed(2)} className="flex-1 p-1.5 border border-gray-400 bg-white text-left font-bold" />
                  </div>
                  {vatRate > 0 && (
                    <div className="flex items-center">
                      <span className="w-28 bg-gray-300 p-1.5 text-center font-bold border border-gray-400 text-gray-800 text-sm">الضريبة ({vatRate}%)</span>
                      <input readOnly value={vatAmount.toFixed(2)} className="flex-1 p-1.5 border border-gray-400 bg-white text-left font-bold" />
                    </div>
                  )}
                  <div className="flex items-center">
                    <span className="w-28 bg-blue-700 text-white p-1.5 text-center font-bold border border-blue-800 text-sm">الصافي</span>
                    <input readOnly value={total.toFixed(2)} className="flex-1 p-1.5 border-2 border-blue-600 bg-blue-50 text-left font-extrabold text-blue-900 text-lg" />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center">
                    <span className="w-24 bg-gray-300 p-1.5 text-center font-bold border border-gray-400 text-gray-800 text-sm">المدفوع</span>
                    <input 
                      type="number"
                      className="flex-1 p-1.5 border border-gray-400 bg-white text-left font-bold outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-lg text-green-700"
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="flex items-center mt-auto">
                    <span className="w-24 bg-emerald-600 text-white p-1.5 text-center font-bold border border-emerald-700 text-sm">فرق التبديل</span>
                    <input 
                      readOnly 
                      value={paidVal >= total ? (paidVal - total).toFixed(2) : '0.00'} 
                      className="flex-1 p-1.5 border-2 border-emerald-600 bg-emerald-50 text-left font-extrabold text-emerald-900 text-xl" 
                    />
                  </div>
                </div>
              </div>

              {/* Checkout Buttons */}
              <div className="w-full lg:w-48 flex flex-row lg:flex-col gap-2 justify-end">
                 <button 
                   onClick={() => handleCheckout('cash')} 
                   disabled={cart.length === 0}
                   className="flex-1 bg-gradient-to-b from-green-500 to-green-700 hover:from-green-600 hover:to-green-800 text-white font-bold p-2 border border-green-800 rounded shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                 >
                   <Banknote size={20} /> دفع نقدي (F12)
                 </button>
                 <button 
                   onClick={() => handleCheckout('card')} 
                   disabled={cart.length === 0}
                   className="flex-1 bg-gradient-to-b from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white font-bold p-2 border border-blue-800 rounded shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                 >
                   <CreditCard size={20} /> دفع بطاقة
                 </button>
                 <button 
                   onClick={() => setIsSplitPaymentOpen(true)} 
                   disabled={cart.length === 0}
                   className="flex-1 bg-gradient-to-b from-purple-500 to-purple-700 hover:from-purple-600 hover:to-purple-800 text-white font-bold p-2 border border-purple-800 rounded shadow-sm flex flex-col items-center justify-center gap-1 disabled:opacity-50 text-[11px]"
                 >
                   <div className="flex gap-2">
                     <CreditCard size={16} /> <Banknote size={16} />
                   </div>
                   دفع جزئي
                 </button>
              </div>
            </div>
          </div>
        </div>

        {/* ==================================================== */}
        {/* FAR LEFT PANEL: RECENT SALES */}
        {/* ==================================================== */}
        <div className="hidden lg:flex w-48 flex-col gap-1 shrink-0 bg-white border border-gray-300 shadow-sm overflow-hidden">
           <div className="bg-slate-700 text-white p-2 font-bold flex items-center justify-center text-xs gap-2">
             <History size={14} /> آخر المبيعات
           </div>
           <div className="flex-1 overflow-y-auto p-1.5 space-y-1.5 bg-gray-50">
             {recentSales.map(t => (
               <button 
                 key={t.id}
                 onClick={() => setViewedTransaction(t)}
                 className="w-full text-right p-2 bg-white border border-gray-200 hover:border-blue-400 hover:bg-blue-50 rounded shadow-sm text-xs flex flex-col gap-1 transition-colors active:scale-95"
               >
                 <div className="flex justify-between font-bold text-gray-700">
                   <span className="text-emerald-600">{t.total.toFixed(2)} د.ل</span>
                   <span>#{t.id.substring(0,5).toUpperCase()}</span>
                 </div>
                 <div className="flex justify-between text-gray-500 text-[10px]">
                   <span>{t.paymentMethod === 'cash' ? 'نقدي' : 'بطاقة'}</span>
                   <span dir="ltr">{new Date(t.date).toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit', hour12: false})}</span>
                 </div>
               </button>
             ))}
             {recentSales.length === 0 && (
               <div className="text-center text-gray-400 p-4 text-[10px] font-bold">لا توجد مبيعات</div>
             )}
           </div>
        </div>

      </div>

      {/* ==================================================== */}
      {/* MODALS */}
      {/* ==================================================== */}
      {completedTransaction && (
        <ReceiptModal 
          transaction={completedTransaction} 
          onClose={() => setCompletedTransaction(null)} 
          autoPrint={autoPrint}
          storeInfo={storeInfo}
        />
      )}

      {viewedTransaction && (
        <ReceiptModal 
          transaction={viewedTransaction} 
          onClose={() => setViewedTransaction(null)} 
          autoPrint={false}
          storeInfo={storeInfo}
        />
      )}

      <BarcodeScannerModal
        products={products}
        isOpen={isBarcodeScannerOpen}
        onClose={() => setIsBarcodeScannerOpen(false)}
        onScanProduct={(scannedProduct) => {
          addToCart(scannedProduct);
        }}
      />

      {/* Product Search Modal (Simulates F1 Search) */}
      {isProductModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" dir="rtl">
          <div className="bg-gray-100 rounded-lg shadow-2xl w-full max-w-3xl flex flex-col max-h-[85vh] border border-gray-300">
            <div className="flex justify-between items-center p-4 bg-blue-800 text-white rounded-t-lg">
              <h3 className="font-bold text-lg flex items-center gap-2"><Search /> بحث عن صنف</h3>
              <button onClick={() => setIsProductModalOpen(false)} className="text-white hover:text-red-300">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-4 bg-white border-b border-gray-300 shadow-sm flex flex-col gap-3">
              <input
                autoFocus
                type="text"
                placeholder="ابحث بالاسم، الباركود، أو القسم هنا..."
                className="w-full border-2 border-blue-400 p-3 rounded-md font-bold text-lg outline-none focus:border-blue-600 focus:bg-blue-50 transition-colors"
                value={productSearchQuery}
                onChange={(e) => setProductSearchQuery(e.target.value)}
              />

              {/* Category Filters Bar */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar">
                <span className="text-xs font-bold text-gray-500 flex items-center gap-1 shrink-0 ml-1">
                  <Folder size={14} className="text-blue-600" />
                  الأقسام:
                </span>
                <button
                  onClick={() => setSelectedSalesCategory('all')}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer shrink-0 ${
                    selectedSalesCategory === 'all'
                      ? 'bg-blue-700 text-white shadow-xs'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  الكل ({products.length})
                </button>
                {availableSalesCategories.map((cat) => {
                  const count = products.filter(p => (p.category || 'عام') === cat).length;
                  return (
                    <button
                      key={cat}
                      onClick={() => setSelectedSalesCategory(cat)}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer shrink-0 flex items-center gap-1 ${
                        selectedSalesCategory === cat
                          ? 'bg-blue-700 text-white shadow-xs'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <span>{cat}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${selectedSalesCategory === cat ? 'bg-blue-900 text-white' : 'bg-gray-200 text-gray-600'}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {filteredModalProducts.length === 0 ? (
                <div className="text-center text-gray-500 py-10 font-bold flex flex-col items-center gap-2">
                  <span>لا توجد أصناف مطابقة للبحث أو القسم المختار.</span>
                  {(selectedSalesCategory !== 'all' || productSearchQuery) && (
                    <button
                      onClick={() => {
                        setSelectedSalesCategory('all');
                        setProductSearchQuery('');
                      }}
                      className="text-xs text-blue-600 hover:underline font-bold"
                    >
                      إعادة عرض جميع الأصناف
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {filteredModalProducts.map(product => {
                    const isOutOfStock = product.stock !== undefined && product.stock === 0;
                    const isLowStock = product.stock !== undefined && product.reorderPoint !== undefined && product.stock <= product.reorderPoint;
                    
                    let borderBgClass = "bg-white border-gray-300 hover:border-blue-500 hover:bg-blue-50";
                    if (isOutOfStock) {
                      borderBgClass = "bg-red-50/80 border-red-400 hover:border-red-600 hover:bg-red-100";
                    } else if (isLowStock) {
                      borderBgClass = "bg-amber-50/80 border-amber-400 hover:border-amber-600 hover:bg-amber-100";
                    }

                    return (
                      <div
                        key={product.id}
                        className={`border p-3 rounded-lg shadow-sm hover:shadow-md transition-all text-right flex flex-col justify-between min-h-36 relative ${borderBgClass}`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-1 mb-1">
                            <span className="font-bold text-gray-800 text-sm line-clamp-2 leading-tight flex-1">{product.name}</span>
                            {isOutOfStock ? (
                              <span className="shrink-0 bg-red-600 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded flex items-center gap-0.5" title="نفد المخزون!">
                                <AlertTriangle size={10} /> نفد
                              </span>
                            ) : isLowStock ? (
                              <span className="shrink-0 bg-amber-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded flex items-center gap-0.5" title={`وصل حد الطلب! المتبقي: ${product.stock}`}>
                                <AlertTriangle size={10} /> تنبيه
                              </span>
                            ) : null}
                          </div>
                          <span className="bg-purple-50 text-purple-700 text-[10px] font-bold px-1.5 py-0.5 rounded border border-purple-200 inline-flex items-center gap-0.5">
                            <Tag size={9} />
                            {product.category || 'عام'}
                          </span>
                        </div>

                        <div className="mt-2 pt-1 border-t border-gray-200/60 flex justify-between items-end">
                          <span className="font-extrabold text-blue-700 text-base">{product.price.toFixed(2)} د.ل</span>
                          {product.stock !== undefined && (
                            <span className={`text-[10px] font-bold ${isOutOfStock ? 'text-red-700' : isLowStock ? 'text-amber-800' : 'text-gray-500'}`}>
                              المخزون: {product.stock}
                            </span>
                          )}
                        </div>

                        {/* Unit Selection Buttons (Piece, Pack, Box) */}
                        <div className="mt-2 pt-2 border-t border-gray-200/80 flex flex-wrap gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              addToCart(product, 'piece');
                              setIsProductModalOpen(false);
                              setProductSearchQuery('');
                            }}
                            className="flex-1 min-w-[65px] bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-800 border border-blue-200 py-1 px-1 rounded text-[10px] font-bold transition cursor-pointer text-center"
                            title="إضافة بالقطعة"
                          >
                            + قطعة
                          </button>

                          {product.packFactor && product.packFactor > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                addToCart(product, 'pack');
                                setIsProductModalOpen(false);
                                setProductSearchQuery('');
                              }}
                              className="flex-1 min-w-[75px] bg-purple-50 hover:bg-purple-600 hover:text-white text-purple-800 border border-purple-200 py-1 px-1 rounded text-[10px] font-bold transition cursor-pointer text-center"
                              title={`إضافة ستيكة (${product.packFactor} قطعة)`}
                            >
                              + ستيكة ({product.packFactor})
                            </button>
                          )}

                          {product.boxFactor && product.boxFactor > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                addToCart(product, 'box');
                                setIsProductModalOpen(false);
                                setProductSearchQuery('');
                              }}
                              className="flex-1 min-w-[75px] bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-800 border border-indigo-200 py-1 px-1 rounded text-[10px] font-bold transition cursor-pointer text-center"
                              title={`إضافة صندوق (${product.boxFactor} قطعة)`}
                            >
                              + صندوق ({product.boxFactor})
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Split Payment Modal */}
      {isSplitPaymentOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" dir="rtl">
          <div className="bg-gray-100 rounded-lg shadow-2xl w-full max-w-md flex flex-col border border-gray-300">
            <div className="flex justify-between items-center p-4 bg-purple-800 text-white rounded-t-lg">
              <h3 className="font-bold text-lg flex items-center gap-2"><CreditCard /> <Banknote /> دفع جزئي</h3>
              <button onClick={() => setIsSplitPaymentOpen(false)} className="text-white hover:text-red-300">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 bg-white space-y-6">
              <div className="flex justify-between items-center bg-gray-100 p-4 rounded-lg border border-gray-200">
                <span className="font-bold text-gray-700">إجمالي الفاتورة:</span>
                <span className="font-extrabold text-2xl text-blue-700">{total.toFixed(2)} د.ل</span>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-2">المبلغ المدفوع نقداً (د.ل)</label>
                  <input
                    autoFocus
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full border-2 border-gray-300 p-3 rounded-md font-bold text-lg outline-none focus:border-purple-600 focus:bg-purple-50 transition-colors"
                    value={splitCash}
                    onChange={(e) => handleSplitCashChange(e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-2">المبلغ المدفوع بالبطاقة (د.ل)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full border-2 border-gray-300 p-3 rounded-md font-bold text-lg outline-none focus:border-purple-600 focus:bg-purple-50 transition-colors"
                    value={splitCard}
                    onChange={(e) => handleSplitCardChange(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3 rounded-b-lg">
              <button 
                onClick={() => setIsSplitPaymentOpen(false)}
                className="px-6 py-2 border border-gray-300 font-bold text-gray-700 rounded hover:bg-gray-200 transition-colors"
              >
                إلغاء
              </button>
              <button 
                onClick={handleSplitCheckout}
                className="px-6 py-2 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded shadow-sm transition-colors"
              >
                تأكيد الدفع
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Held Carts Modal */}
      {isHeldCartsModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm" dir="rtl">
          <div className="bg-gray-100 rounded-lg shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh] border border-gray-300">
            <div className="flex justify-between items-center p-4 bg-indigo-800 text-white rounded-t-lg">
              <h3 className="font-bold text-lg flex items-center gap-2"><PlayCircle /> السلال المعلقة</h3>
              <button onClick={() => setIsHeldCartsModalOpen(false)} className="text-white hover:text-red-300">
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
              {heldCarts.length === 0 ? (
                <div className="text-center text-gray-500 py-10 font-bold">لا توجد سلال معلقة حالياً.</div>
              ) : (
                <div className="space-y-3">
                  {heldCarts.map(hc => {
                    const hcTotal = hc.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
                    const hcVat = hcTotal * (vatRate / 100);
                    const hcGrandTotal = hcTotal + hcVat;
                    
                    return (
                      <div key={hc.id} className="bg-white border border-gray-300 rounded-lg shadow-sm p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="flex-1 w-full">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-bold text-indigo-900 text-lg">{hc.name}</h4>
                            <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                              {hcGrandTotal.toFixed(2)} د.ل
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mb-2 font-mono">
                            {new Date(hc.timestamp).toLocaleDateString('ar-LY')} {new Date(hc.timestamp).toLocaleTimeString('ar-LY')}
                          </p>
                          <div className="text-xs text-gray-600 flex gap-2 flex-wrap">
                            {hc.items.map(item => (
                              <span key={item.id} className="bg-gray-100 px-2 py-1 rounded border border-gray-200">
                                {item.quantity}x {item.name}
                              </span>
                            ))}
                          </div>
                        </div>
                        
                        <div className="flex sm:flex-col gap-2 w-full sm:w-auto shrink-0 mt-3 sm:mt-0">
                          <button 
                            onClick={() => handleRestoreCart(hc)}
                            className="flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded shadow-sm transition-colors text-sm text-center"
                          >
                            استرجاع الفاتورة
                          </button>
                          <button 
                            onClick={() => {
                              if (window.confirm('هل أنت متأكد من حذف هذه السلة المعلقة نهائياً؟')) {
                                handleDeleteHeldCart(hc.id);
                              }
                            }}
                            className="flex-1 sm:flex-none bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold py-2 px-4 rounded shadow-sm transition-colors text-sm text-center"
                          >
                            حذف السلة
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
