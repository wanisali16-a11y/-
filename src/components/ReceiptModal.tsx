import React, { useEffect, useState } from 'react';
import { Transaction, StoreInfo, DEFAULT_STORE_INFO } from '../types';
import { Printer, X, CheckCircle2, FileText, Settings2 } from 'lucide-react';

interface ReceiptModalProps {
  transaction: Transaction;
  onClose: () => void;
  autoPrint?: boolean;
  storeInfo?: StoreInfo;
}

export default function ReceiptModal({ transaction, onClose, autoPrint = false, storeInfo = DEFAULT_STORE_INFO }: ReceiptModalProps) {
  const [paperWidth, setPaperWidth] = useState<'80mm' | '58mm'>('80mm');

  const handlePrint = () => {
    window.print();
  };

  useEffect(() => {
    if (autoPrint) {
      const timer = setTimeout(() => {
        window.print();
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [autoPrint]);

  // Handle keyboard shortcuts (Enter to print, Esc to close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        window.print();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const dateObj = new Date(transaction.date);
  const formattedTime = dateObj.toLocaleTimeString('en-US', { hour12: true, hour: 'numeric', minute: '2-digit', second: '2-digit' }).replace(' ', '');
  const formattedDate = `${dateObj.getFullYear()}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${String(dateObj.getDate()).padStart(2, '0')}`;

  const formattedInvoiceNumber = transaction.invoiceNumber 
    ? `#${String(transaction.invoiceNumber).padStart(4, '0')}` 
    : (transaction.id.startsWith('INV-') ? `#${transaction.id.replace('INV-', '')}` : `#${transaction.id.toUpperCase().substring(0, 8)}`);

  const paidCashVal = transaction.paidCash ?? (transaction.paymentMethod === 'cash' ? transaction.total : undefined);
  const changeVal = transaction.changeAmount ?? (paidCashVal && paidCashVal > transaction.total ? paidCashVal - transaction.total : 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs print:bg-transparent print:p-0 print:static">
      <div className={`bg-white rounded-2xl shadow-2xl w-full flex flex-col overflow-hidden print:p-0 print:shadow-none print:max-w-full ${paperWidth === '58mm' ? 'max-w-xs' : 'max-w-sm'}`}>
        
        {/* On-Screen Success Banner & Header (Hidden on Print) */}
        <div className="bg-emerald-600 text-white p-4 print:hidden flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 size={24} className="text-emerald-200 shrink-0 animate-bounce" />
            <div>
              <h3 className="font-extrabold text-base leading-tight">تمت إتمام المعاملة بنجاح!</h3>
              <p className="text-xs text-emerald-100 font-mono">فاتورة رقم: {formattedInvoiceNumber}</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1 rounded-lg hover:bg-emerald-700/80 text-emerald-100 hover:text-white transition cursor-pointer"
            title="إغلاق (Esc)"
          >
            <X size={20} />
          </button>
        </div>

        {/* Thermal Print Controls Bar (Hidden on Print) */}
        <div className="p-3.5 bg-emerald-50 border-b border-emerald-100 print:hidden flex flex-col gap-2.5" dir="rtl">
          <button 
            onClick={handlePrint} 
            className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-extrabold py-3 px-4 rounded-xl flex justify-center items-center gap-2.5 shadow-md hover:shadow-lg transition cursor-pointer text-base"
          >
            <Printer size={20} />
            طباعة حرارية فورية (Enter)
          </button>

          {/* Paper size toggle & Indicator */}
          <div className="flex items-center justify-between text-xs font-bold text-gray-700 bg-white p-2 rounded-xl border border-emerald-200">
            <span className="flex items-center gap-1 text-gray-600">
              <Settings2 size={14} className="text-emerald-600" />
              عرض ورق الطابعة:
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPaperWidth('80mm')}
                className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                  paperWidth === '80mm' ? 'bg-emerald-600 text-white shadow-2xs' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                80 مم (قياسي)
              </button>
              <button
                onClick={() => setPaperWidth('58mm')}
                className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                  paperWidth === '58mm' ? 'bg-emerald-600 text-white shadow-2xs' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                58 مم (صغير)
              </button>
            </div>
          </div>

          <div className="flex justify-between items-center text-[11px] text-gray-500 font-medium px-1">
            <span>طباعة تلقائية حرارية مفعلة</span>
            <span>اضغط Esc للإغلاق</span>
          </div>
        </div>

        {/* Printable Thermal Receipt Body */}
        <div className="p-4 overflow-y-auto max-h-[70vh] print:max-h-none print:overflow-visible">
          <div 
            id="printable-receipt" 
            className={`bg-white p-2 text-black font-sans w-full ${paperWidth === '58mm' ? 'text-[11px]' : 'text-[13px]'}`} 
            dir="rtl"
          >
            {/* Title Block - Dynamic Store Name */}
            <div className="text-center mb-3">
              <h2 className={`font-extrabold text-black mb-0.5 ${paperWidth === '58mm' ? 'text-lg' : 'text-xl'}`}>{storeInfo.name}</h2>
              {storeInfo.subtitle && <p className="text-[11px] font-bold text-gray-800">{storeInfo.subtitle}</p>}
              {storeInfo.address && <p className="text-[10px] text-gray-600 mt-0.5">{storeInfo.address}</p>}
              {storeInfo.phone && <p className="text-[10px] text-gray-700 mt-0.5 font-mono" dir="ltr">Tel: {storeInfo.phone}</p>}
              {storeInfo.taxNumber && <p className="text-[10px] text-gray-700 font-mono" dir="ltr">Tax No: {storeInfo.taxNumber}</p>}
            </div>

            <div 
              className="bg-black text-white text-center font-bold text-[12px] py-1 mb-1" 
              style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}
            >
              فاتورة مبيعات
            </div>
            <div className="text-center text-[10px] tracking-[0.2em] font-bold mt-1 mb-2 uppercase font-serif" dir="ltr">
              Sales Receipt
            </div>

            {/* Meta Info: Date/Time & Transaction ID */}
            <div className="flex justify-between text-[11px] font-mono font-bold px-1" dir="ltr">
              <span>{formattedTime} {formattedDate}</span>
              <span>{formattedInvoiceNumber}</span>
            </div>
            
            {/* Payment Method & Cashier */}
            <div className="flex justify-between text-xs font-bold mt-2 pb-1 border-b-[1.5px] border-black px-1">
              <span>الكاشير: {transaction.cashierName || 'علي المزداوي'}</span>
              <span>
                {transaction.paymentMethod === 'card' ? 'البطاقة المصرفية' : transaction.paymentMethod === 'split' ? 'مقسم (نقدي + بطاقة)' : 'نقدي'}
              </span>
            </div>

            {/* Table */}
            <table className="w-full font-bold mt-1 border-collapse text-[12px]">
              <thead>
                <tr className="border-b-[1.5px] border-black text-black">
                  <th className="text-right py-1 w-[15%]">ك</th>
                  <th className="text-right py-1 w-[45%]">الصنف</th>
                  <th className="text-center py-1 w-[20%]">السعر</th>
                  <th className="text-left py-1 w-[20%]">القيمة</th>
                </tr>
              </thead>
              <tbody>
                {transaction.items.map((item, idx) => (
                  <tr key={item.cartItemId || `${item.id}-${idx}`} className="leading-tight align-top border-b border-gray-200">
                    <td className="py-1 text-right">{item.quantity}</td>
                    <td className="py-1 text-right pl-1">
                      <span>{item.name}</span>
                      {item.selectedUnit && item.selectedUnit !== 'piece' && (
                        <span className="text-[10px] font-bold block text-gray-750 font-mono">
                          [{item.selectedUnit === 'box' ? `صندوق (${item.unitMultiplier || ''})` : `ستيكة (${item.unitMultiplier || ''})`}]
                        </span>
                      )}
                    </td>
                    <td className="py-1 text-center font-mono">{item.price.toFixed(2)}</td>
                    <td className="py-1 text-left font-mono">{(item.price * item.quantity).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="border-t-[1.5px] border-black pt-2 mt-2 px-1 space-y-1">
              {transaction.vatRate && transaction.vatRate > 0 ? (
                <>
                  <div className="flex justify-between items-center text-xs font-bold text-gray-800">
                    <span>المجموع الفرعي:</span>
                    <span className="font-mono">{(transaction.subtotal || transaction.total).toFixed(2)} د.ل</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-bold text-gray-800 pb-1 border-b border-dashed border-black">
                    <span>ضريبة القيمة المضافة ({transaction.vatRate}%):</span>
                    <span className="font-mono">{(transaction.vatAmount || 0).toFixed(2)} د.ل</span>
                  </div>
                </>
              ) : null}
              
              <div className="flex justify-between items-center text-base font-extrabold pt-0.5 border-b border-black pb-1">
                <span>الإجمالي الكلي:</span>
                <span className="font-mono text-lg">{transaction.total.toFixed(2)} د.ل</span>
              </div>

              {/* Cash Paid and Change */}
              {transaction.paymentMethod === 'cash' && paidCashVal !== undefined && (
                <div className="flex flex-col gap-0.5 pt-1 text-xs font-bold text-black border-b border-dashed border-black pb-1">
                  <div className="flex justify-between">
                    <span>المدفوع نقداً:</span>
                    <span className="font-mono">{paidCashVal.toFixed(2)} د.ل</span>
                  </div>
                  <div className="flex justify-between">
                    <span>المتبقي (الفكة):</span>
                    <span className="font-mono">{changeVal.toFixed(2)} د.ل</span>
                  </div>
                </div>
              )}

              {/* Split Payment Details */}
              {transaction.paymentMethod === 'split' && (
                <div className="flex flex-col gap-0.5 pt-1 text-xs font-bold text-black border-b border-dashed border-black pb-1">
                  <div className="flex justify-between">
                    <span>المدفوع نقداً:</span>
                    <span className="font-mono">{(transaction.cashAmount || 0).toFixed(2)} د.ل</span>
                  </div>
                  <div className="flex justify-between">
                    <span>المدفوع بالبطاقة:</span>
                    <span className="font-mono">{(transaction.cardAmount || 0).toFixed(2)} د.ل</span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer / Thank you */}
            <div className="text-center mt-5 mb-2">
              <p className="font-bold text-xs">شكراً لزيارتكم ونتمنى لكم يوماً سعيداً!</p>
              {storeInfo.receiptFooter && (
                <p className="text-[10px] text-gray-600 mt-1 leading-tight">{storeInfo.receiptFooter}</p>
              )}
            </div>

            {/* Barcode for Receipt */}
            <div className="flex flex-col items-center mt-3">
              <div className="w-44 h-9 bg-black" style={{ maskImage: 'repeating-linear-gradient(to right, black 0, black 2px, transparent 2px, transparent 4px, black 4px, black 5px, transparent 5px, transparent 8px)', WebkitMaskImage: 'repeating-linear-gradient(to right, black 0, black 2px, transparent 2px, transparent 4px, black 4px, black 5px, transparent 5px, transparent 8px)' }}></div>
              <span className="text-[10px] font-mono mt-0.5">#{transaction.id.toUpperCase()}</span>
            </div>
          </div>
        </div>

        {/* Bottom Action Footer (Hidden on Print) */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 print:hidden flex justify-between items-center gap-3">
          <button 
            onClick={onClose} 
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-2.5 px-4 rounded-xl flex justify-center items-center gap-2 transition text-sm cursor-pointer"
          >
            <X size={16} />
            إغلاق / فاتورة جديدة
          </button>
        </div>

      </div>
    </div>
  );
}

