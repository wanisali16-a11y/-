import React, { useState, useRef } from 'react';
import { Product, Transaction, Purchase, User, StoreInfo, DEFAULT_STORE_INFO } from '../types';
import UserManager from './UserManager';
import { ActionPinModal } from './UserAuthModal';
import { 
  Download, 
  Upload, 
  Database, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Package, 
  ShoppingCart, 
  Settings as SettingsIcon,
  HardDrive,
  Trash2,
  X,
  Info,
  ShieldAlert,
  ShieldCheck,
  Store,
  Crown,
  Lock,
  Unlock,
  Building2,
  Phone,
  Receipt,
  MapPin,
  Save
} from 'lucide-react';

interface SettingsProps {
  products: Product[];
  transactions: Transaction[];
  purchases: Purchase[];
  vatRate: number;
  users: User[];
  currentUser: User;
  storeInfo?: StoreInfo;
  onUpdateVatRate: (rate: number) => void;
  onUpdateStoreInfo: (info: StoreInfo) => void;
  onRestoreData: (restored: { products: Product[]; transactions: Transaction[]; purchases: Purchase[]; users?: User[] }, mergeMode: boolean) => void;
  onResetData: () => void;
  onAddUser: (user: User) => void;
  onUpdateUser: (user: User) => void;
  onDeleteUser: (userId: string) => void;
}

interface BackupFileContent {
  version: string;
  timestamp: string;
  app: string;
  data: {
    products: Product[];
    transactions: Transaction[];
    purchases: Purchase[];
    users?: User[];
    storeInfo?: StoreInfo;
  };
}

export default function Settings({
  products,
  transactions,
  purchases,
  vatRate,
  users,
  currentUser,
  storeInfo = DEFAULT_STORE_INFO,
  onUpdateVatRate,
  onUpdateStoreInfo,
  onRestoreData,
  onResetData,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
}: SettingsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [tempVatRate, setTempVatRate] = useState<string>(vatRate.toString());
  
  // Store Identity State
  const [storeName, setStoreName] = useState(storeInfo.name);
  const [storeSubtitle, setStoreSubtitle] = useState(storeInfo.subtitle);
  const [storePhone, setStorePhone] = useState(storeInfo.phone);
  const [storeTaxNumber, setStoreTaxNumber] = useState(storeInfo.taxNumber);
  const [storeAddress, setStoreAddress] = useState(storeInfo.address);
  const [storeReceiptFooter, setStoreReceiptFooter] = useState(storeInfo.receiptFooter);

  const isSuperAdminUser = currentUser.role === 'super_admin' || currentUser.isSuperAdmin === true;
  const [isStoreSettingsUnlocked, setIsStoreSettingsUnlocked] = useState(isSuperAdminUser);
  const [showStorePinModal, setShowStorePinModal] = useState(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedBackup, setParsedBackup] = useState<BackupFileContent | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [restoreMode, setRestoreMode] = useState<'replace' | 'merge'>('replace');
  const [showConfirmRestore, setShowConfirmRestore] = useState(false);
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [showPinAuthModal, setShowPinAuthModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<'reset' | 'restore' | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSaveStoreInfo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName.trim()) {
      setSuccessMessage('يرجى إدخال اسم المحل / السوق أولاً');
      setTimeout(() => setSuccessMessage(null), 3000);
      return;
    }

    const updatedInfo: StoreInfo = {
      name: storeName.trim(),
      subtitle: storeSubtitle.trim(),
      phone: storePhone.trim(),
      taxNumber: storeTaxNumber.trim(),
      address: storeAddress.trim(),
      receiptFooter: storeReceiptFooter.trim(),
    };

    onUpdateStoreInfo(updatedInfo);
    setSuccessMessage('تم حفظ تحديثات هوية النظام واسم المحل بالفاتورة بنجاح!');
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const handleSaveVatRate = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(tempVatRate);
    if (isNaN(parsed) || parsed < 0) {
      setSuccessMessage('يرجى إدخال نسبة ضريبة صحيحة (أكبر من أو تساوي 0)');
      setTimeout(() => setSuccessMessage(null), 3000);
      return;
    }
    onUpdateVatRate(parsed);
    setSuccessMessage(`تم حفظ نسبة ضريبة القيمة المضافة (${parsed}%) بنجاح!`);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  // Download database / backup handler
  const handleDownloadBackup = () => {
    const backupData: BackupFileContent = {
      version: '2.0',
      timestamp: new Date().toISOString(),
      app: 'POS Sales System',
      data: {
        products,
        transactions,
        purchases,
        users,
        storeInfo,
      },
    };

    // Format json with 2 spaces for human readability
    const jsonString = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = `${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
    const fileName = `pos_database_${dateStr}_${timeStr}.json`;

    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setSuccessMessage(`تم تحميل قاعدة البيانات (${fileName}) بنجاح! تشمل ${products.length} منتج، ${transactions.length} مبيعات، و${purchases.length} مشتريات.`);
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setFileError(null);
    setParsedBackup(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        let validProducts: Product[] = [];
        let validTransactions: Transaction[] = [];
        let validPurchases: Purchase[] = [];
        let validUsers: User[] = [];
        let timestamp = new Date().toISOString();

        if (parsed && typeof parsed === 'object') {
          if (parsed.data && typeof parsed.data === 'object') {
            validProducts = Array.isArray(parsed.data.products) ? parsed.data.products : [];
            validTransactions = Array.isArray(parsed.data.transactions) ? parsed.data.transactions : [];
            validPurchases = Array.isArray(parsed.data.purchases) ? parsed.data.purchases : [];
            validUsers = Array.isArray(parsed.data.users) ? parsed.data.users : [];
            if (parsed.timestamp) timestamp = parsed.timestamp;
          } else if (Array.isArray(parsed.products) || Array.isArray(parsed.transactions) || Array.isArray(parsed.purchases)) {
            validProducts = Array.isArray(parsed.products) ? parsed.products : [];
            validTransactions = Array.isArray(parsed.transactions) ? parsed.transactions : [];
            validPurchases = Array.isArray(parsed.purchases) ? parsed.purchases : [];
            validUsers = Array.isArray(parsed.users) ? parsed.users : [];
          } else {
            throw new Error('صيغة الملف غير مدعومة. يجب أن يحتوي على بيانات المبيعات أو المنتجات.');
          }
        } else {
          throw new Error('الملف فارغ أو غير صالح.');
        }

        setParsedBackup({
          version: parsed.version || '1.1',
          timestamp,
          app: parsed.app || 'POS System',
          data: {
            products: validProducts,
            transactions: validTransactions,
            purchases: validPurchases,
            users: validUsers,
          },
        });
      } catch (err: any) {
        setFileError(err.message || 'فشل في قراءة ملف JSON. تأكد من أن الملف صالح.');
        setParsedBackup(null);
      }
    };
    reader.readAsText(file);
  };

  // Request Restore
  const handleRequestRestore = () => {
    if (!parsedBackup) return;
    if (currentUser.canDeleteData || currentUser.role === 'admin') {
      setShowConfirmRestore(true);
    } else {
      setPendingAction('restore');
      setShowPinAuthModal(true);
    }
  };

  // Execute restore
  const handleExecuteRestore = () => {
    if (!parsedBackup) return;

    onRestoreData(parsedBackup.data, restoreMode === 'merge');
    setShowConfirmRestore(false);
    setSelectedFile(null);
    setParsedBackup(null);
    if (fileInputRef.current) fileInputRef.current.value = '';

    const modeText = restoreMode === 'merge' ? 'دمج' : 'استعادة';
    setSuccessMessage(`تمت عملية ${modeText} البيانات بنجاح!`);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  // Request Reset
  const handleRequestReset = () => {
    if (currentUser.canDeleteData || currentUser.role === 'admin') {
      setShowConfirmReset(true);
    } else {
      setPendingAction('reset');
      setShowPinAuthModal(true);
    }
  };

  // Execute reset
  const handleExecuteReset = () => {
    onResetData();
    setShowConfirmReset(false);
    setSuccessMessage('تمت إعادة ضبط البيانات إلى الحالة الافتراضية.');
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const handlePinAuthSuccess = () => {
    if (pendingAction === 'restore') {
      setShowConfirmRestore(true);
    } else if (pendingAction === 'reset') {
      setShowConfirmReset(true);
    }
    setPendingAction(null);
  };

  const estimatedSizeKb = Math.round((JSON.stringify({ products, transactions, purchases }).length / 1024) * 10) / 10;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 font-sans" dir="rtl">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-100 text-blue-700 rounded-xl">
            <SettingsIcon size={26} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">الإعدادات، المستخدمون، والنسخ الاحتياطي</h2>
            <p className="text-sm text-gray-500">إدارة مستخدمي النظام بكلمات مرور، ضبط نسبة الضريبة، وحفظ واستعادة النسخ الاحتياطية</p>
          </div>
        </div>

        <button
          onClick={handleDownloadBackup}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white rounded-xl font-bold text-xs shadow-sm hover:shadow transition cursor-pointer shrink-0"
          title="تصدير بيانات النظام (Products, Transactions, Purchases) إلى ملف JSON للنسخ الاحتياطي اليدوي"
        >
          <Database size={16} />
          <span>تحميل قاعدة البيانات</span>
        </button>
      </div>

      {/* Success Banner */}
      {successMessage && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-800 rounded-2xl flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="text-green-600 shrink-0" size={22} />
          <span className="font-bold text-sm">{successMessage}</span>
        </div>
      )}

      {/* Store Identity & System Developer Settings Card */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-purple-200 relative overflow-hidden">
        {/* Subtle decorative purple top border */}
        <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-l from-purple-600 via-indigo-600 to-blue-600"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 mb-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 text-purple-800 rounded-xl">
              <Crown size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-gray-900">تعديل هوية النظام واسم المحل بالفاتورة</h3>
                <span className="bg-purple-100 text-purple-900 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-purple-200 flex items-center gap-1">
                  <Crown size={12} />
                  صلاحيات مُعد النظام فقط
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">تغيير اسم السوق أو المحل، الهواتف، العناوين، وتذييل الفواتير المطبوعة</p>
            </div>
          </div>

          {!isStoreSettingsUnlocked && (
            <button
              onClick={() => setShowStorePinModal(true)}
              className="py-2 px-4 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center justify-center gap-2 shrink-0"
            >
              <Lock size={16} />
              إدخال رمز مُعد النظام للتعديل
            </button>
          )}
        </div>

        {/* Unlocked Form vs Locked Protection Banner */}
        {!isStoreSettingsUnlocked ? (
          <div className="p-5 bg-purple-50/60 border border-purple-200 rounded-xl text-purple-950 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-purple-200 text-purple-900 rounded-lg shrink-0">
                <Lock size={22} />
              </div>
              <div className="text-xs">
                <p className="font-bold text-sm text-purple-900 mb-0.5">التعديل مقفل بحماية مُعد النظام</p>
                <p className="text-purple-700">لتغيير اسم السوق المطبوع على الفاتورة والهاتف، يرجى التبديل لحساب مُعد النظام أو إدخال الرمز السري للمطور.</p>
              </div>
            </div>
            <button
              onClick={() => setShowStorePinModal(true)}
              className="py-2.5 px-5 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-xl shadow transition shrink-0 flex items-center gap-2"
            >
              <Unlock size={16} />
              فتح تعديل هوية المحل
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Form Inputs (2 Columns) */}
            <form onSubmit={handleSaveStoreInfo} className="lg:col-span-2 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1.5">
                    <Store size={14} className="text-purple-600" />
                    اسم السوق / المحل التجاري:
                  </label>
                  <input
                    type="text"
                    required
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="مثال: أسواق المزداوي"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-bold text-gray-900 focus:bg-white focus:border-purple-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1.5">
                    <Building2 size={14} className="text-purple-600" />
                    وصف النشاط / الشعار الفرعي:
                  </label>
                  <input
                    type="text"
                    value={storeSubtitle}
                    onChange={(e) => setStoreSubtitle(e.target.value)}
                    placeholder="مثال: للمواد الغذائية والمنزلية"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-bold text-gray-900 focus:bg-white focus:border-purple-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1.5">
                    <Phone size={14} className="text-purple-600" />
                    رقم هاتف المحل:
                  </label>
                  <input
                    type="text"
                    value={storePhone}
                    onChange={(e) => setStorePhone(e.target.value)}
                    placeholder="091-234-5678"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-mono font-bold text-gray-900 focus:bg-white focus:border-purple-600 focus:outline-none"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1.5">
                    <Receipt size={14} className="text-purple-600" />
                    الرقم الضريبي / السجل التجاري:
                  </label>
                  <input
                    type="text"
                    value={storeTaxNumber}
                    onChange={(e) => setStoreTaxNumber(e.target.value)}
                    placeholder="123456789"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-mono font-bold text-gray-900 focus:bg-white focus:border-purple-600 focus:outline-none"
                    dir="ltr"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1.5">
                  <MapPin size={14} className="text-purple-600" />
                  عنوان المحل والموقع:
                </label>
                <input
                  type="text"
                  value={storeAddress}
                  onChange={(e) => setStoreAddress(e.target.value)}
                  placeholder="مثال: طرابلس - شارع المدار"
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-bold text-gray-900 focus:bg-white focus:border-purple-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1.5">
                  <FileText size={14} className="text-purple-600" />
                  ملاحظة وتذييل الفاتورة المطبوعة:
                </label>
                <textarea
                  rows={2}
                  value={storeReceiptFooter}
                  onChange={(e) => setStoreReceiptFooter(e.target.value)}
                  placeholder="البضاعة المباعة لا ترد ولا تستبدل إلا بالفاتورة..."
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:bg-white focus:border-purple-600 focus:outline-none"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full sm:w-auto py-3 px-8 bg-purple-700 hover:bg-purple-800 text-white font-bold text-sm rounded-xl shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 active:scale-98"
                >
                  <Save size={18} />
                  حفظ تغييرات هوية النظام والفاتورة
                </button>
              </div>
            </form>

            {/* Live Receipt Header Preview Card (1 Column) */}
            <div className="bg-gray-100 p-4 rounded-xl border border-gray-300 flex flex-col justify-between">
              <div>
                <p className="text-xs font-bold text-gray-600 mb-3 text-center flex items-center justify-center gap-1.5">
                  <Receipt size={16} className="text-purple-700" />
                  معاينة الفاتورة المطبوعة مباشرة:
                </p>

                {/* Simulated Thermal Receipt */}
                <div className="bg-white p-4 rounded-lg shadow border border-gray-200 text-center font-sans space-y-2 text-black">
                  <h4 className="text-lg font-extrabold text-black leading-snug">{storeName || 'اسم المحل'}</h4>
                  {storeSubtitle && <p className="text-[11px] font-bold text-gray-800">{storeSubtitle}</p>}
                  {storeAddress && <p className="text-[10px] text-gray-600">{storeAddress}</p>}
                  {storePhone && <p className="text-[10px] text-gray-700 font-mono" dir="ltr">Tel: {storePhone}</p>}
                  {storeTaxNumber && <p className="text-[10px] text-gray-700 font-mono" dir="ltr">Tax No: {storeTaxNumber}</p>}

                  <div className="bg-black text-white text-[11px] font-bold py-1 my-2">
                    فاتورة مبيعات
                  </div>

                  <div className="border-t border-b border-dashed border-gray-400 py-2 my-2 text-xs font-bold flex justify-between">
                    <span>صنف تجريبي</span>
                    <span>10.00 د.ل</span>
                  </div>

                  <p className="text-[10px] font-bold text-gray-800 mt-3">شكراً لزيارتكم!</p>
                  {storeReceiptFooter && (
                    <p className="text-[9px] text-gray-600 leading-tight mt-1">{storeReceiptFooter}</p>
                  )}
                </div>
              </div>

              <p className="text-[10px] text-gray-500 text-center mt-3 font-medium">
                تظهر هذه المعلومات تلقائياً بجميع الفواتير المطبوعة وعلى شاشة المبيعات.
              </p>
            </div>

          </div>
        )}
      </div>

      {/* Unlock Store Info Modal */}
      <ActionPinModal
        isOpen={showStorePinModal}
        title="تأكيد الرمز السري لمُعد النظام"
        description="أدخل الرمز السري الخاص بمُعد النظام / المطور لفتح تعديل اسم المحل وهوية الفاتورة."
        users={users}
        onClose={() => setShowStorePinModal(false)}
        onSuccess={() => {
          setIsStoreSettingsUnlocked(true);
          setShowStorePinModal(false);
          setSuccessMessage('تم فتح صلاحيات تعديل هوية النظام بنجاح!');
          setTimeout(() => setSuccessMessage(null), 3000);
        }}
      />

      {/* User & Cashier Management Module */}
      <UserManager 
        users={users}
        currentUser={currentUser}
        onAddUser={onAddUser}
        onUpdateUser={onUpdateUser}
        onDeleteUser={onDeleteUser}
      />

      {/* System Statistics */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <HardDrive size={20} className="text-blue-600" />
              حالة البيانات الحالية بالنظام
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">إجمالي السجلات المخزنة محلياً بقاعدة البيانات</p>
          </div>

          <button
            onClick={handleDownloadBackup}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white rounded-xl font-bold text-xs shadow-xs hover:shadow transition cursor-pointer shrink-0"
            title="تصدير قاعدة بيانات النظام (Products, Transactions, Purchases) إلى ملف JSON"
          >
            <Download size={15} />
            <span>تحميل قاعدة البيانات (JSON)</span>
          </button>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 text-blue-700 rounded-lg">
              <Package size={22} />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">عدد المنتجات</p>
              <p className="text-lg font-bold text-gray-900">{products.length}</p>
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-lg">
              <ShoppingCart size={22} />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">سجلات المبيعات</p>
              <p className="text-lg font-bold text-gray-900">{transactions.length}</p>
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex items-center gap-3">
            <div className="p-2.5 bg-amber-100 text-amber-700 rounded-lg">
              <FileText size={22} />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">سجلات المشتريات</p>
              <p className="text-lg font-bold text-gray-900">{purchases.length}</p>
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex items-center gap-3">
            <div className="p-2.5 bg-purple-100 text-purple-700 rounded-lg">
              <Database size={22} />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">الحجم التقديري للبيانات</p>
              <p className="text-lg font-bold text-gray-900">{estimatedSizeKb} KB</p>
            </div>
          </div>
        </div>
      </div>

      {/* VAT Rate Configuration Card */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
            <SettingsIcon size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">إعدادات ضريبة القيمة المضافة (VAT)</h3>
            <p className="text-xs text-gray-500">تطبيق نسبة الضريبة المحددة تلقائياً وحسابها في الفواتير وعلى صفحة المبيعات</p>
          </div>
        </div>

        <form onSubmit={handleSaveVatRate} className="flex flex-col sm:flex-row items-stretch sm:items-end gap-4 max-w-xl">
          <div className="flex-1">
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              نسبة الضريبة المضافة (%)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={tempVatRate}
                onChange={(e) => setTempVatRate(e.target.value)}
                placeholder="0"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-bold focus:bg-white focus:border-blue-500 focus:outline-none transition text-left"
                dir="ltr"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">%</span>
            </div>
          </div>

          <button
            type="submit"
            className="py-2.5 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-sm hover:shadow transition shrink-0 flex items-center justify-center gap-2"
          >
            <CheckCircle2 size={18} />
            حفظ نسبة الضريبة
          </button>
        </form>

        <div className="mt-3 text-xs text-gray-500 bg-gray-50 p-3 rounded-xl border border-gray-100 flex items-center gap-2">
          <Info size={16} className="text-blue-500 shrink-0" />
          <span>
            {vatRate > 0 ? (
              <span>النسبة المعتمدة حالياً هي <strong className="text-blue-700 font-bold">{vatRate}%</strong>. سيتم احتسابها تلقائياً على سلة المشتريات وطباعتها بالفاتورة.</span>
            ) : (
              <span>نسبة الضريبة حالياً <strong className="text-gray-700 font-bold">0% (معطلة)</strong>. يمكنك كتابة أي نسبة تريدها وتطبيقها فوراً.</span>
            )}
          </span>
        </div>
      </div>

      {/* Backup and Restore Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Export / Download Section */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                  <Database size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">تحميل قاعدة البيانات</h3>
                  <p className="text-xs text-gray-500">تصدير ملف JSON للنسخ الاحتياطي اليدوي</p>
                </div>
              </div>
              <span className="px-2.5 py-1 bg-blue-50 text-blue-800 border border-blue-200 rounded-lg text-[11px] font-bold flex items-center gap-1 shrink-0">
                <ShieldCheck size={14} className="text-blue-600" />
                نسخ احتياطي يدوي
              </span>
            </div>

            <p className="text-sm text-gray-600 leading-relaxed mb-4">
              تصدير وتنزيل كافة بيانات المنظومة (المنتجات <code className="bg-gray-100 px-1 py-0.5 rounded text-blue-700 font-mono text-xs">Products</code>، المبيعات والفواتير <code className="bg-gray-100 px-1 py-0.5 rounded text-blue-700 font-mono text-xs">Transactions</code>، والمشتريات <code className="bg-gray-100 px-1 py-0.5 rounded text-blue-700 font-mono text-xs">Purchases</code>) في ملف قاعدة بيانات <code className="bg-gray-100 px-1.5 py-0.5 rounded text-blue-700 font-mono text-xs">JSON</code> لحفظ نسخة احتياطية يدوية ونقلها بأمان.
            </p>

            <div className="bg-blue-50/60 p-3.5 rounded-xl border border-blue-100 text-xs text-blue-900 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold">
                <Info size={16} className="text-blue-600" />
                <span>محتويات ملف قاعدة البيانات المصدر (JSON):</span>
              </div>
              <ul className="list-disc list-inside text-gray-700 space-y-1 pr-1">
                <li><strong className="text-gray-900">{products.length}</strong> منتج مسجل (Products) ببيانات الأسعار والمخزون والباركود</li>
                <li><strong className="text-gray-900">{transactions.length}</strong> حركة وفاتورة مبيعات مسجلة (Transactions)</li>
                <li><strong className="text-gray-900">{purchases.length}</strong> حركة مشتريات وفواتير توريد (Purchases)</li>
                <li><strong className="text-gray-900">{users.length}</strong> حساب مستخدم وصلاحياته</li>
                <li>هوية المتجر، العناوين، وشروط الفاتورة</li>
              </ul>
            </div>
          </div>

          <button
            onClick={handleDownloadBackup}
            className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 transform active:scale-98 cursor-pointer"
          >
            <Database size={20} />
            <span>تحميل قاعدة البيانات</span>
          </button>
        </div>

        {/* Restore / Import Section */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                <Upload size={24} />
              </div>
              <h3 className="text-lg font-bold text-gray-900">استعادة نسخة احتياطية</h3>
            </div>

            <p className="text-sm text-gray-600 leading-relaxed mb-4">
              اختر ملف النسخة الاحتياطية (<code className="bg-gray-100 px-1.5 py-0.5 rounded text-blue-700 font-mono text-xs">.json</code>) لاستعادة بيانات المنظومة أو نقلها من جهاز آخر.
            </p>

            {/* File Input Box */}
            <div className="border-2 border-dashed border-gray-300 hover:border-indigo-500 rounded-xl p-4 text-center cursor-pointer transition bg-gray-50/50 hover:bg-indigo-50/30"
                 onClick={() => fileInputRef.current?.click()}>
              <input 
                type="file" 
                ref={fileInputRef}
                accept=".json,application/json"
                onChange={handleFileChange}
                className="hidden" 
              />
              <Upload size={28} className="mx-auto text-gray-400 mb-2" />
              <p className="text-sm font-bold text-gray-700">اضغط هنا لاختيار ملف النسخة الاحتياطية</p>
              <p className="text-xs text-gray-400 mt-1">يدعم ملفات .json فقط</p>
            </div>

            {/* File Error */}
            {fileError && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                <AlertTriangle size={16} className="shrink-0" />
                <span>{fileError}</span>
              </div>
            )}

            {/* Preview of Selected Backup */}
            {parsedBackup && (
              <div className="mt-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-950 space-y-2">
                <div className="flex items-center justify-between font-bold">
                  <span className="flex items-center gap-1.5 text-emerald-800">
                    <CheckCircle2 size={16} className="text-emerald-600" />
                    تم التعرف على الملف بنجاح!
                  </span>
                  <span className="text-gray-500 font-normal">
                    {new Date(parsedBackup.timestamp).toLocaleDateString('ar-EG')}
                  </span>
                </div>
                
                <div className="grid grid-cols-3 gap-2 text-center pt-1">
                  <div className="bg-white p-1.5 rounded border border-emerald-100">
                    <span className="block text-gray-500 text-[10px]">منتجات</span>
                    <span className="font-bold">{parsedBackup.data.products.length}</span>
                  </div>
                  <div className="bg-white p-1.5 rounded border border-emerald-100">
                    <span className="block text-gray-500 text-[10px]">مبيعات</span>
                    <span className="font-bold">{parsedBackup.data.transactions.length}</span>
                  </div>
                  <div className="bg-white p-1.5 rounded border border-emerald-100">
                    <span className="block text-gray-500 text-[10px]">مشتريات</span>
                    <span className="font-bold">{parsedBackup.data.purchases.length}</span>
                  </div>
                </div>

                {/* Restore Options */}
                <div className="pt-2 border-t border-emerald-200/60 space-y-1.5">
                  <label className="block font-bold text-gray-800 text-[11px]">طريقة الاستعادة:</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRestoreMode('replace')}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition ${
                        restoreMode === 'replace'
                          ? 'bg-emerald-700 text-white border-emerald-800 shadow-sm'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      استبدال الكل
                    </button>
                    <button
                      type="button"
                      onClick={() => setRestoreMode('merge')}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition ${
                        restoreMode === 'merge'
                          ? 'bg-emerald-700 text-white border-emerald-800 shadow-sm'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      دمج مع الحالي
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            disabled={!parsedBackup}
            onClick={handleRequestRestore}
            className={`w-full py-3 px-4 font-bold rounded-xl shadow transition flex items-center justify-center gap-2 ${
              parsedBackup
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md hover:shadow-lg active:scale-98 cursor-pointer'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <RefreshCw size={20} />
            تأكيد استعادة البيانات
          </button>
        </div>

      </div>

      {/* Danger Zone / Reset */}
      <div className="bg-red-50/50 p-6 rounded-2xl border border-red-200/80 mt-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-100 text-red-600 rounded-xl">
              <Trash2 size={24} />
            </div>
            <div>
              <h3 className="text-base font-bold text-red-900">منطقة الحذف وإعادة الضبط</h3>
              <p className="text-xs text-red-700 mt-0.5">يمكنك مسح كافة المبيعات والمشتريات وإعادة المنتجات للوضع الافتراضي (تتطلب رمز المدير).</p>
            </div>
          </div>

          <button
            onClick={handleRequestReset}
            className="py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-2"
          >
            <Trash2 size={16} />
            إعادة ضبط المنظومة
          </button>
        </div>
      </div>

      {/* Restore Confirmation Modal */}
      {showConfirmRestore && parsedBackup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-gray-100 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 text-emerald-600 mb-3">
              <RefreshCw size={26} />
              <h3 className="text-lg font-bold text-gray-900">تأكيد استعادة النسخة الاحتياطية</h3>
            </div>

            <p className="text-sm text-gray-700 leading-relaxed mb-4">
              {restoreMode === 'replace' ? (
                <span>
                  سيؤدي هذا إلى <strong className="text-red-600">استبدال كامل</strong> لبيانات المنظومة الحالية بالبيانات الموجودة في الملف المختصر:
                </span>
              ) : (
                <span>
                  سيتم <strong className="text-emerald-700">دمج</strong> البيانات الجديدة مع بيانات المنظومة الحالية دون تكرار العناصر المتشابهة:
                </span>
              )}
            </p>

            <ul className="bg-gray-50 p-3 rounded-xl text-xs space-y-1.5 text-gray-700 mb-6">
              <li>• المنتجات: <strong>{parsedBackup.data.products.length}</strong> منتج</li>
              <li>• المبيعات: <strong>{parsedBackup.data.transactions.length}</strong> عملية</li>
              <li>• المشتريات: <strong>{parsedBackup.data.purchases.length}</strong> عملية</li>
            </ul>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowConfirmRestore(false)}
                className="py-2 px-4 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition"
              >
                إلغاء
              </button>
              <button
                onClick={handleExecuteRestore}
                className="py-2 px-5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition"
              >
                تأكيد الاستعادة الآن
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showConfirmReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-gray-100 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <AlertTriangle size={26} />
              <h3 className="text-lg font-bold text-gray-900">تأكيد إعادة ضبط المنظومة</h3>
            </div>

            <p className="text-sm text-gray-700 leading-relaxed mb-6">
              هل أنت أخيرًا متأكد من رغبتك في مسح كافة المبيعات والمشتريات وإعادة المنتجات للوضع الافتراضي؟ <strong className="text-red-600">لا يمكن التراجع عن هذه الخطوة!</strong>
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowConfirmReset(false)}
                className="py-2 px-4 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition"
              >
                إلغاء
              </button>
              <button
                onClick={handleExecuteReset}
                className="py-2 px-5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-md transition"
              >
                نعم، مسح وإعادة ضبط
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action PIN Verification Modal */}
      <ActionPinModal
        isOpen={showPinAuthModal}
        users={users}
        onClose={() => setShowPinAuthModal(false)}
        onSuccess={handlePinAuthSuccess}
      />

    </div>
  );
}
