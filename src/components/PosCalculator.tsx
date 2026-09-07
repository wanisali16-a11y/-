import React, { useState } from 'react';
import { Calculator as CalcIcon, Delete, Check, DollarSign, RefreshCw, CornerDownLeft, Percent } from 'lucide-react';

interface PosCalculatorProps {
  paidAmount: string;
  setPaidAmount: (val: string | ((prev: string) => string)) => void;
  total: number;
}

export default function PosCalculator({ paidAmount, setPaidAmount, total }: PosCalculatorProps) {
  const [calcDisplay, setCalcDisplay] = useState('0');
  const [equation, setEquation] = useState('');
  const [isCalculated, setIsCalculated] = useState(false);
  const [mode, setMode] = useState<'calc' | 'cash'>('cash'); // 'cash' directly edits paidAmount, 'calc' acts as math calculator

  // --- Math Calculator Logic ---
  const handleCalcNumber = (num: string) => {
    if (mode === 'cash') {
      if (paidAmount === '' || paidAmount === '0') {
        setPaidAmount(num);
      } else {
        if (paidAmount.length < 10) {
          setPaidAmount(prev => prev + num);
        }
      }
      return;
    }

    if (calcDisplay === '0' || isCalculated) {
      setCalcDisplay(num);
      setIsCalculated(false);
    } else {
      if (calcDisplay.length < 10) {
        setCalcDisplay(prev => prev + num);
      }
    }
  };

  const handleOperator = (op: string) => {
    if (mode === 'cash') {
      // Switch to calc mode with current paidAmount as initial display
      setMode('calc');
      setEquation((paidAmount || '0') + ' ' + op + ' ');
      setCalcDisplay('0');
      setIsCalculated(false);
      return;
    }

    setEquation(calcDisplay + ' ' + op + ' ');
    setCalcDisplay('0');
    setIsCalculated(false);
  };

  const handleEquals = () => {
    if (mode === 'cash') return;
    try {
      const fullEq = equation + calcDisplay;
      if (!fullEq.trim()) return;

      let sanitized = fullEq.replace(/x/g, '*').replace(/÷/g, '/').replace(/%/g, '/100');
      const result = Function(`"use strict"; return (${sanitized})`)();

      let formatted = String(result);
      if (typeof result === 'number') {
        formatted = Number.isInteger(result) ? String(result) : parseFloat(result.toFixed(2)).toString();
      }

      setCalcDisplay(formatted);
      setEquation('');
      setIsCalculated(true);
    } catch {
      setCalcDisplay('خطأ');
      setIsCalculated(true);
    }
  };

  const handleClear = () => {
    if (mode === 'cash') {
      setPaidAmount('');
    } else {
      setCalcDisplay('0');
      setEquation('');
      setIsCalculated(false);
    }
  };

  const handleDelete = () => {
    if (mode === 'cash') {
      setPaidAmount(prev => (prev.length > 1 ? prev.slice(0, -1) : ''));
    } else {
      if (isCalculated) {
        setCalcDisplay('0');
        setEquation('');
        setIsCalculated(false);
      } else if (calcDisplay.length > 1) {
        setCalcDisplay(prev => prev.slice(0, -1));
      } else {
        setCalcDisplay('0');
      }
    }
  };

  const handlePercent = () => {
    if (mode === 'cash') {
      const val = parseFloat(paidAmount);
      if (!isNaN(val)) setPaidAmount((val / 100).toString());
      return;
    }
    const val = parseFloat(calcDisplay);
    if (!isNaN(val)) {
      setCalcDisplay((val / 100).toString());
      setIsCalculated(true);
    }
  };

  // Quick preset cash additions
  const handleAddPresetCash = (amount: number) => {
    const current = parseFloat(paidAmount) || 0;
    setPaidAmount((current + amount).toFixed(2).replace(/\.00$/, ''));
  };

  const handleExactAmount = () => {
    setPaidAmount(total.toFixed(2));
  };

  // Apply calc result directly to paidAmount
  const handleApplyToPaid = () => {
    const val = parseFloat(calcDisplay);
    if (!isNaN(val)) {
      setPaidAmount(val.toString());
      setMode('cash');
    }
  };

  const currentDisplayVal = mode === 'cash' ? (paidAmount || '0') : calcDisplay;

  return (
    <div className="flex-1 bg-slate-900 border border-slate-800 p-2 shadow-md rounded-md flex flex-col justify-between text-right select-none font-sans">
      
      {/* Header & Mode Switcher */}
      <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 mb-1.5">
        <div className="flex items-center gap-1.5 text-blue-400 font-bold text-[11px]">
          <CalcIcon size={14} className="text-blue-400" />
          <span>حاسبة الكاشير</span>
        </div>

        <div className="flex bg-slate-800 p-0.5 rounded border border-slate-700">
          <button
            onClick={() => setMode('cash')}
            className={`px-2 py-0.5 text-[10px] font-bold rounded transition ${
              mode === 'cash' 
                ? 'bg-blue-600 text-white shadow-xs' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            إدخال مدفوع
          </button>
          <button
            onClick={() => setMode('calc')}
            className={`px-2 py-0.5 text-[10px] font-bold rounded transition ${
              mode === 'calc' 
                ? 'bg-purple-600 text-white shadow-xs' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            حاسبة رياضيات
          </button>
        </div>
      </div>

      {/* Screen Display */}
      <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 mb-2 text-left relative shadow-inner">
        <div className="flex justify-between items-center text-xs font-mono text-slate-400 h-5">
          <span className="text-slate-400 font-bold">
            {mode === 'cash' ? 'وضع إدخال النقدية' : 'وضع الحساب الرياضي'}
          </span>
          <span className="overflow-hidden text-ellipsis dir-ltr font-semibold text-slate-300">
            {mode === 'calc' ? equation : (total > 0 ? `المطلوب: ${total.toFixed(2)} د.ل` : '')}
          </span>
        </div>

        <div className="text-3xl font-mono font-extrabold text-emerald-400 tracking-wider overflow-x-auto whitespace-nowrap my-1 dir-ltr text-left">
          {currentDisplayVal} <span className="text-sm font-sans text-emerald-500 font-bold">د.ل</span>
        </div>

        {mode === 'calc' && (
          <button
            onClick={handleApplyToPaid}
            className="mt-1 w-full bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/50 text-emerald-300 py-1.5 rounded text-xs font-bold flex items-center justify-center gap-1 transition"
          >
            <Check size={14} /> اعتماد الناتج كمبلغ مدفوع
          </button>
        )}
      </div>

      {/* Quick Cash Presets Bar */}
      <div className="grid grid-cols-4 gap-1.5 mb-2">
        <button
          onClick={handleExactAmount}
          className="col-span-1 bg-gradient-to-b from-blue-600 to-blue-800 hover:from-blue-500 hover:to-blue-700 text-white border border-blue-900 font-extrabold text-xs p-2 rounded shadow-xs active:scale-95 transition"
          title="تطبيق صافي الفاتورة بالضبط"
        >
          بالضبط
        </button>
        {[10, 20, 50].map(val => (
          <button
            key={val}
            onClick={() => handleAddPresetCash(val)}
            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-400 font-extrabold text-xs p-2 rounded active:scale-95 transition flex items-center justify-center dir-ltr shadow-xs"
          >
            +{val}
          </button>
        ))}
      </div>

      {/* Main Keypad */}
      <div className="grid grid-cols-4 gap-1.5 font-extrabold dir-ltr flex-1">
        {/* Row 1 */}
        <button
          onClick={handleClear}
          className="bg-rose-950/90 hover:bg-rose-900 text-rose-300 border border-rose-800/80 p-3 rounded text-base active:scale-95 transition flex items-center justify-center"
        >
          C
        </button>
        <button
          onClick={handleDelete}
          className="bg-amber-950/90 hover:bg-amber-900 text-amber-300 border border-amber-800/80 p-3 rounded active:scale-95 transition flex items-center justify-center"
        >
          <Delete size={20} />
        </button>
        <button
          onClick={handlePercent}
          className="bg-slate-800 hover:bg-slate-700 text-purple-300 border border-slate-700 p-3 rounded text-sm active:scale-95 transition flex items-center justify-center"
        >
          %
        </button>
        <button
          onClick={() => handleOperator('÷')}
          className="bg-blue-900/90 hover:bg-blue-800 text-blue-200 border border-blue-700 p-3 rounded text-xl active:scale-95 transition flex items-center justify-center"
        >
          ÷
        </button>

        {/* Row 2 */}
        {['7', '8', '9'].map(num => (
          <button
            key={num}
            onClick={() => handleCalcNumber(num)}
            className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-700/80 p-3 rounded text-xl active:scale-95 transition flex items-center justify-center shadow-xs"
          >
            {num}
          </button>
        ))}
        <button
          onClick={() => handleOperator('x')}
          className="bg-blue-900/90 hover:bg-blue-800 text-blue-200 border border-blue-700 p-3 rounded text-xl active:scale-95 transition flex items-center justify-center"
        >
          ×
        </button>

        {/* Row 3 */}
        {['4', '5', '6'].map(num => (
          <button
            key={num}
            onClick={() => handleCalcNumber(num)}
            className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-700/80 p-3 rounded text-xl active:scale-95 transition flex items-center justify-center shadow-xs"
          >
            {num}
          </button>
        ))}
        <button
          onClick={() => handleOperator('-')}
          className="bg-blue-900/90 hover:bg-blue-800 text-blue-200 border border-blue-700 p-3 rounded text-xl active:scale-95 transition flex items-center justify-center"
        >
          -
        </button>

        {/* Row 4 */}
        {['1', '2', '3'].map(num => (
          <button
            key={num}
            onClick={() => handleCalcNumber(num)}
            className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-700/80 p-3 rounded text-xl active:scale-95 transition flex items-center justify-center shadow-xs"
          >
            {num}
          </button>
        ))}
        <button
          onClick={() => handleOperator('+')}
          className="bg-blue-900/90 hover:bg-blue-800 text-blue-200 border border-blue-700 p-3 rounded text-xl active:scale-95 transition flex items-center justify-center"
        >
          +
        </button>

        {/* Row 5 */}
        <button
          onClick={() => handleCalcNumber('0')}
          className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-700/80 p-3 rounded text-xl active:scale-95 transition flex items-center justify-center shadow-xs"
        >
          0
        </button>
        <button
          onClick={() => handleCalcNumber('00')}
          className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 p-3 rounded text-sm font-bold active:scale-95 transition flex items-center justify-center shadow-xs"
        >
          00
        </button>
        <button
          onClick={() => handleCalcNumber('.')}
          className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-700/80 p-3 rounded text-xl active:scale-95 transition flex items-center justify-center shadow-xs"
        >
          .
        </button>
        {mode === 'calc' ? (
          <button
            onClick={handleEquals}
            className="bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500 p-3 rounded text-2xl font-black active:scale-95 transition flex items-center justify-center shadow-md"
          >
            =
          </button>
        ) : (
          <button
            onClick={handleExactAmount}
            className="bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500 p-3 rounded text-2xl font-black active:scale-95 transition flex items-center justify-center shadow-md"
            title="تطبيق إجمالي الفاتورة بالكامل"
          >
            =
          </button>
        )}
      </div>
    </div>
  );
}
