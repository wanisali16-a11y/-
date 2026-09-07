import React, { useState, useEffect, useMemo } from 'react';
import { Transaction, StoreInfo, User, DEFAULT_STORE_INFO } from '../types';
import { 
  Printer, 
  X, 
  FileDown, 
  Calendar, 
  UserCheck, 
  CreditCard, 
  Banknote, 
  Hash, 
  Receipt, 
  CheckCircle2, 
  Building2,
  Settings2,
  FileText,
  Clock,
  Layers,
  ShoppingBag
} from 'lucide-react';

interface InvoicesReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  totalAvailableCount: number;
  isCustomSelection: boolean;
  storeInfo?: StoreInfo;
  currentUser: User;
  dateRangeText: string;
  invoiceNumberMap: Map<string, number>;
}

export default function InvoicesReportModal({
  isOpen,
  onClose,
  transactions,
  totalAvailableCount,
  isCustomSelection,
  storeInfo = DEFAULT_STORE_INFO,
  currentUser,
  dateRangeText,
  invoiceNumberMap,
}: InvoicesReportModalProps) {
  const [paperFormat, setPaperFormat] = useState<'a4' | 'thermal'>('a4');
  const [includeCashierSummary, setIncludeCashierSummary] = useState<boolean>(true);
  const [includeItemsDetail, setIncludeItemsDetail] = useState<boolean>(false);

  // Keyboard shortcut Esc to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Statistical calculations for the report
  const stats = useMemo(() => {
    let totalSales = 0;
    let totalCash = 0;
    let totalCard = 0;
    let totalItems = 0;
    const cashierMap: Record<string, { name: string; count: number; total: number; cash: number; card: number }> = {};

    transactions.forEach(t => {
      totalSales += t.total;
      if (t.paymentMethod === 'cash') {
        totalCash += t.total;
      } else if (t.paymentMethod === 'card') {
        totalCard += t.total;
      } else if (t.paymentMethod === 'split') {
        totalCash += (t.cashAmount || 0);
        totalCard += (t.cardAmount || 0);
      }

      // Items count
      const itemsCount = t.items.reduce((sum, it) => sum + it.quantity, 0);
      totalItems += itemsCount;

      // Cashier
      const cName = t.cashierName || 'علي المزداوي';
      if (!cashierMap[cName]) {
        cashierMap[cName] = { name: cName, count: 0, total: 0, cash: 0, card: 0 };
      }
      cashierMap[cName].count += 1;
      cashierMap[cName].total += t.total;
      if (t.paymentMethod === 'cash') cashierMap[cName].cash += t.total;
      else if (t.paymentMethod === 'card') cashierMap[cName].card += t.total;
      else if (t.paymentMethod === 'split') {
        cashierMap[cName].cash += (t.cashAmount || 0);
        cashierMap[cName].card += (t.cardAmount || 0);
      }
    });

    const averageInvoice = transactions.length > 0 ? (totalSales / transactions.length) : 0;
    const cashiers = Object.values(cashierMap).sort((a, b) => b.total - a.total);

    return {
      totalInvoices: transactions.length,
      totalSales,
      totalCash,
      totalCard,
      totalItems,
      averageInvoice,
      cashiers,
    };
  }, [transactions]);

  const getInvoiceDisplay = (t: Transaction) => {
    const num = t.invoiceNumber || invoiceNumberMap.get(t.id) || 1;
    return `#${String(num).padStart(4, '0')}`;
  };

  const handlePrint = () => {
    // Add printable-report style to page
    const styleEl = document.createElement('style');
    styleEl.id = 'dynamic-report-print-style';
    styleEl.innerHTML = paperFormat === 'a4' 
      ? `@media print { @page { size: A4 portrait; margin: 8mm; } }` 
      : `@media print { @page { size: 80mm auto; margin: 0; } }`;
    document.head.appendChild(styleEl);

    document.body.classList.add('printing-report');

    window.print();

    // Cleanup after print dialog
    const cleanup = () => {
      document.body.classList.remove('printing-report');
      const el = document.getElementById('dynamic-report-print-style');
      if (el) el.remove();
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    setTimeout(cleanup, 2000);
  };

  const handleExportPDF = () => {
    // Triggers print dialog which has built-in 'Save as PDF'
    handlePrint();
  };

  // Download standalone HTML report file which can be opened and saved directly as PDF in any browser
  const handleDownloadStandaloneHTML = () => {
    const element = document.getElementById('printable-report-content');
    if (!element) return;

    const htmlContent = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>تقرير_الفواتير_${new Date().toISOString().slice(0, 10)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; margin: 20px; color: #111827; background: #fff; }
    table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }
    th, td { border: 1px solid #d1d5db; padding: 6px 10px; text-align: right; }
    th { background: #f3f4f6; font-weight: bold; }
    .header-box { text-align: center; border-bottom: 2px solid #1f2937; padding-bottom: 15px; margin-bottom: 20px; }
    .title { font-size: 20px; font-weight: bold; margin: 5px 0; }
    .subtitle { font-size: 13px; color: #4b5563; }
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 15px 0; }
    .kpi-box { border: 1px solid #e5e7eb; padding: 10px; border-radius: 6px; text-align: center; background: #f9fafb; }
    .kpi-num { font-size: 16px; font-weight: bold; color: #1d4ed8; }
    .kpi-label { font-size: 11px; color: #6b7280; }
    .footer-box { margin-top: 30px; padding-top: 15px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; font-size: 11px; color: #6b7280; }
    @media print {
      body { margin: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  ${element.innerHTML}
  <script>
    window.onload = function() {
      // Auto open print dialog if opened in new window
    };
  </script>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `تقرير_ملخص_الفواتير_${new Date().toISOString().slice(0, 10)}.html`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  const printTimeStr = new Date().toLocaleTimeString('ar-LY', { hour: '2-digit', minute: '2-digit' });
  const printDateStr = new Date().toLocaleDateString('ar-LY', { year: 'numeric', month: '2-digit', day: '2-digit' });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4 backdrop-blur-xs print:bg-transparent print:p-0 print:static">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col overflow-hidden border border-gray-200 print:shadow-none print:border-none print:max-w-full print:max-h-none print:rounded-none">
        
        {/* On-Screen Modal Header (Hidden on Print) */}
        <div className="bg-blue-900 text-white p-4 print:hidden flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-800 text-blue-200 flex items-center justify-center border border-blue-700">
              <Printer size={22} />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg flex items-center gap-2">
                <span>طباعة وتصدير تقرير الفواتير</span>
                <span className="text-xs bg-blue-700 px-2.5 py-0.5 rounded-full font-mono text-blue-100">
                  {transactions.length} فاتورة {isCustomSelection ? '(محددة يدوياً)' : '(نتائج التصفية)'}
                </span>
              </h3>
              <p className="text-xs text-blue-200">
                تنسيق طباعة مخصص يتضمن الملخص المالي التنفيذي وجدول الفواتير
              </p>
            </div>
          </div>

          <button 
            onClick={onClose} 
            className="p-1.5 rounded-lg hover:bg-blue-800 text-blue-200 hover:text-white transition cursor-pointer"
            title="إغلاق (Esc)"
          >
            <X size={20} />
          </button>
        </div>

        {/* Action Controls & Format Options Toolbar (Hidden on Print) */}
        <div className="p-3 bg-gray-50 border-b border-gray-200 print:hidden flex flex-wrap items-center justify-between gap-3 text-xs" dir="rtl">
          
          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handlePrint}
              className="bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-bold py-2 px-4 rounded-xl flex items-center gap-2 shadow-xs transition cursor-pointer"
            >
              <Printer size={16} />
              <span>طباعة التقرير (Print)</span>
            </button>

            <button
              onClick={handleExportPDF}
              className="bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold py-2 px-4 rounded-xl flex items-center gap-2 shadow-xs transition cursor-pointer"
              title="يفتح نافذة الطباعة لاختيار 'حفظ بتنسيق PDF'"
            >
              <FileDown size={16} />
              <span>تصدير كـ PDF</span>
            </button>

            <button
              onClick={handleDownloadStandaloneHTML}
              className="bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 font-bold py-2 px-3 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
              title="تنزيل نسخة تقرير جاهزة للفتح والحفظ"
            >
              <FileText size={15} className="text-blue-600" />
              <span>تحميل مستند التقرير</span>
            </button>
          </div>

          {/* Format Settings */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Paper Format */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-gray-200">
              <span className="text-gray-500 font-bold px-1.5">الحجم:</span>
              <button
                type="button"
                onClick={() => setPaperFormat('a4')}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  paperFormat === 'a4' ? 'bg-blue-600 text-white shadow-2xs' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                A4 رسمي
              </button>
              <button
                type="button"
                onClick={() => setPaperFormat('thermal')}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  paperFormat === 'thermal' ? 'bg-blue-600 text-white shadow-2xs' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                حراري 80mm
              </button>
            </div>

            {/* Toggle Cashier Breakdown */}
            <label className="flex items-center gap-1.5 font-bold text-gray-700 cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={includeCashierSummary} 
                onChange={(e) => setIncludeCashierSummary(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
              <span>ملخص الكاشير</span>
            </label>

            {/* Toggle Items Detail */}
            <label className="flex items-center gap-1.5 font-bold text-gray-700 cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={includeItemsDetail} 
                onChange={(e) => setIncludeItemsDetail(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
              <span>تفاصيل الأصناف المباعة</span>
            </label>
          </div>

        </div>

        {/* Scrollable Printable Report Preview Body */}
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[75vh] print:max-h-none print:overflow-visible print:p-0 bg-gray-100 print:bg-white">
          
          <div 
            id="printable-report" 
            className={`mx-auto bg-white shadow-sm border border-gray-200 print:border-none print:shadow-none text-gray-900 font-sans p-6 sm:p-8 transition-all ${
              paperFormat === 'thermal' ? 'max-w-[80mm] text-[11px] p-2 sm:p-3' : 'max-w-[210mm] text-xs leading-relaxed'
            }`} 
            dir="rtl"
          >
            <div id="printable-report-content">
              
              {/* Header Box */}
              <div className="border-b-2 border-gray-900 pb-4 mb-5 text-center">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 mb-2">
                  <div className="text-right">
                    <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                      {storeInfo.name}
                    </h1>
                    {storeInfo.subtitle && (
                      <p className="text-xs font-bold text-gray-600 mt-0.5">{storeInfo.subtitle}</p>
                    )}
                    {storeInfo.address && (
                      <p className="text-[11px] text-gray-500">{storeInfo.address}</p>
                    )}
                  </div>

                  <div className="text-left font-mono text-[11px] text-gray-600" dir="ltr">
                    {storeInfo.phone && <p className="font-bold">Tel: {storeInfo.phone}</p>}
                    {storeInfo.taxNumber && <p>Tax No: {storeInfo.taxNumber}</p>}
                  </div>
                </div>

                {/* Report Title Badge */}
                <div className="bg-gray-900 text-white font-extrabold text-sm sm:text-base py-1.5 px-4 rounded-md my-2 inline-block shadow-2xs">
                  تقرير ملخص المبيعات والفواتير
                </div>

                {/* Meta Details Row */}
                <div className="flex flex-wrap items-center justify-between text-xs text-gray-600 pt-2 border-t border-gray-100">
                  <div className="flex items-center gap-1.5 font-bold">
                    <Calendar size={13} className="text-blue-600" />
                    <span>فترة التقرير:</span>
                    <span className="text-gray-900 bg-gray-100 px-2 py-0.5 rounded font-mono">{dateRangeText}</span>
                  </div>

                  <div className="flex items-center gap-3 text-[11px]">
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      <span>تاريخ الإصدار:</span>
                      <strong className="font-mono">{printDateStr} {printTimeStr}</strong>
                    </span>

                    <span className="flex items-center gap-1">
                      <UserCheck size={12} className="text-amber-600" />
                      <span>المحاسب:</span>
                      <strong>{currentUser.name}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Financial Summary KPI Cards (Executive Overview) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
                {/* Total Invoices */}
                <div className="bg-gray-50 border border-gray-200 p-2.5 rounded-lg text-center">
                  <span className="block text-[11px] text-gray-500 font-bold mb-0.5">عدد الفواتير</span>
                  <span className="text-lg font-black text-gray-900 font-mono">
                    {stats.totalInvoices}
                  </span>
                  <span className="block text-[10px] text-gray-400">فاتورة مسجلة</span>
                </div>

                {/* Total Sales */}
                <div className="bg-blue-50/80 border border-blue-200 p-2.5 rounded-lg text-center">
                  <span className="block text-[11px] text-blue-700 font-bold mb-0.5">إجمالي المبيعات</span>
                  <span className="text-lg font-black text-blue-900 font-mono">
                    {stats.totalSales.toFixed(2)}
                  </span>
                  <span className="block text-[10px] text-blue-600 font-bold">دينار ليبي</span>
                </div>

                {/* Cash Sales */}
                <div className="bg-emerald-50/80 border border-emerald-200 p-2.5 rounded-lg text-center">
                  <span className="block text-[11px] text-emerald-700 font-bold mb-0.5">مبيعات نقدية</span>
                  <span className="text-lg font-black text-emerald-900 font-mono">
                    {stats.totalCash.toFixed(2)}
                  </span>
                  <span className="block text-[10px] text-emerald-600 font-bold">د.ل نقداً</span>
                </div>

                {/* Card Sales */}
                <div className="bg-purple-50/80 border border-purple-200 p-2.5 rounded-lg text-center">
                  <span className="block text-[11px] text-purple-700 font-bold mb-0.5">مبيعات بطاقة</span>
                  <span className="text-lg font-black text-purple-900 font-mono">
                    {stats.totalCard.toFixed(2)}
                  </span>
                  <span className="block text-[10px] text-purple-600 font-bold">د.ل إلكتروني</span>
                </div>
              </div>

              {/* Secondary Metrics Bar */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 mb-5 flex flex-wrap items-center justify-around text-xs font-bold text-gray-700">
                <div className="flex items-center gap-1.5">
                  <ShoppingBag size={14} className="text-blue-600" />
                  <span>إجمالي القطع المباعة:</span>
                  <span className="font-mono text-gray-900">{stats.totalItems} قطعة</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Receipt size={14} className="text-amber-600" />
                  <span>متوسط قيمة الفاتورة:</span>
                  <span className="font-mono text-gray-900">{stats.averageInvoice.toFixed(2)} د.ل</span>
                </div>
              </div>

              {/* Cashiers Performance Breakdown (Optional Toggle) */}
              {includeCashierSummary && stats.cashiers.length > 0 && (
                <div className="mb-5">
                  <h3 className="font-bold text-xs text-gray-800 mb-1.5 flex items-center gap-1.5 border-b pb-1">
                    <UserCheck size={14} className="text-amber-600" />
                    <span>ملخص المبيعات حسب الكاشير:</span>
                  </h3>
                  <table className="w-full text-right border-collapse text-[11px]">
                    <thead>
                      <tr className="bg-gray-100 border border-gray-300 font-bold text-gray-700">
                        <th className="p-1.5 border border-gray-300">اسم الكاشير</th>
                        <th className="p-1.5 border border-gray-300 text-center">عدد الفواتير</th>
                        <th className="p-1.5 border border-gray-300 text-center">نقدي</th>
                        <th className="p-1.5 border border-gray-300 text-center">بطاقة</th>
                        <th className="p-1.5 border border-gray-300 text-left">إجمالي المبيعات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.cashiers.map((c, i) => (
                        <tr key={i} className="border border-gray-200">
                          <td className="p-1.5 border border-gray-200 font-bold">{c.name}</td>
                          <td className="p-1.5 border border-gray-200 text-center font-mono">{c.count}</td>
                          <td className="p-1.5 border border-gray-200 text-center font-mono text-emerald-700">{c.cash.toFixed(2)}</td>
                          <td className="p-1.5 border border-gray-200 text-center font-mono text-purple-700">{c.card.toFixed(2)}</td>
                          <td className="p-1.5 border border-gray-200 text-left font-bold font-mono text-blue-900">{c.total.toFixed(2)} د.ل</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Invoices List Table */}
              <div className="mb-6">
                <h3 className="font-bold text-xs text-gray-800 mb-1.5 flex items-center justify-between border-b pb-1">
                  <div className="flex items-center gap-1.5">
                    <Hash size={14} className="text-blue-600" />
                    <span>تفاصيل الفواتير المشمولة في التقرير:</span>
                  </div>
                  <span className="text-[10px] text-gray-500">
                    عدد السجلات: {transactions.length}
                  </span>
                </h3>

                <table className="w-full text-right border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-gray-100 border border-gray-300 font-bold text-gray-800">
                      <th className="p-1.5 border border-gray-300 text-center w-8">#</th>
                      <th className="p-1.5 border border-gray-300">رقم الفاتورة</th>
                      <th className="p-1.5 border border-gray-300">التاريخ والوقت</th>
                      <th className="p-1.5 border border-gray-300">الكاشير</th>
                      <th className="p-1.5 border border-gray-300 text-center">طريقة الدفع</th>
                      <th className="p-1.5 border border-gray-300 text-center">الأصناف</th>
                      <th className="p-1.5 border border-gray-300 text-left">القيمة (د.ل)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((t, idx) => {
                      const tDate = new Date(t.date);
                      const itemsCount = t.items.reduce((sum, item) => sum + item.quantity, 0);

                      return (
                        <React.Fragment key={t.id}>
                          <tr className="border border-gray-200 hover:bg-gray-50">
                            <td className="p-1.5 border border-gray-200 text-center font-mono text-gray-500">{idx + 1}</td>
                            <td className="p-1.5 border border-gray-200 font-mono font-bold text-blue-900">
                              {getInvoiceDisplay(t)}
                            </td>
                            <td className="p-1.5 border border-gray-200 font-mono text-[10px] text-gray-600">
                              {tDate.toLocaleDateString('ar-LY')} {tDate.toLocaleTimeString('ar-LY', { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="p-1.5 border border-gray-200 font-semibold">{t.cashierName || 'علي المزداوي'}</td>
                            <td className="p-1.5 border border-gray-200 text-center">
                              <span className="font-bold">
                                {t.paymentMethod === 'cash' ? 'نقدي' : t.paymentMethod === 'card' ? 'بطاقة' : 'مقسم'}
                              </span>
                            </td>
                            <td className="p-1.5 border border-gray-200 text-center font-mono">{itemsCount}</td>
                            <td className="p-1.5 border border-gray-200 text-left font-bold font-mono text-gray-900">
                              {t.total.toFixed(2)}
                            </td>
                          </tr>

                          {/* Sub-row for items details if enabled */}
                          {includeItemsDetail && t.items.length > 0 && (
                            <tr className="bg-gray-50/70 border-b border-gray-200 text-[10px] text-gray-600">
                              <td colSpan={7} className="p-1.5 pr-8">
                                <div className="flex flex-wrap gap-x-4 gap-y-1">
                                  <span className="font-bold text-gray-500">محتوى الفاتورة:</span>
                                  {t.items.map((it, itemIdx) => (
                                    <span key={itemIdx} className="font-mono">
                                      • {it.name} (×{it.quantity}) {it.selectedUnit && it.selectedUnit !== 'piece' ? `[${it.selectedUnit === 'box' ? 'صندوق' : 'ستيكة'}]` : ''} = {(it.price * it.quantity).toFixed(2)} د.ل
                                    </span>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>

                  {/* Totals Summary Footer Row */}
                  <tfoot>
                    <tr className="bg-gray-200 border-2 border-gray-400 font-black text-gray-900 text-xs">
                      <td colSpan={5} className="p-2 text-right">
                        الإجمالي الكلي لـ ({transactions.length}) فاتورة:
                      </td>
                      <td className="p-2 text-center font-mono">{stats.totalItems}</td>
                      <td className="p-2 text-left font-mono text-blue-950 font-black text-sm">
                        {stats.totalSales.toFixed(2)} د.ل
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Signatures & Certification Area */}
              <div className="mt-8 pt-4 border-t-2 border-gray-300 grid grid-cols-2 gap-8 text-center text-xs text-gray-700">
                <div>
                  <p className="font-bold mb-8">إعداد وتدقيق المحاسب</p>
                  <p className="text-[11px] text-gray-500">التوقيع: .......................................</p>
                </div>
                <div>
                  <p className="font-bold mb-8">اعتماد الإدارة والختم</p>
                  <p className="text-[11px] text-gray-500">التوقيع / الختم: .......................................</p>
                </div>
              </div>

              {/* System Print Footer Notice */}
              <div className="mt-6 pt-3 border-t border-gray-200 text-center text-[10px] text-gray-400">
                <p>تم استخراج هذا التقرير آلياً عبر منظومة {storeInfo.name} - إدارة نقاط البيع والمبيعات</p>
              </div>

            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
