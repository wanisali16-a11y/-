import React, { useState, useRef } from 'react';
import { Delete, X, Copy, Check, Calculator as CalcIcon, Percent, GripHorizontal } from 'lucide-react';

interface CalculatorProps {
  isOpen?: boolean;
  onClose?: () => void;
  isEmbedded?: boolean;
}

export default function Calculator({ isOpen, onClose, isEmbedded = false }: CalculatorProps) {
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');
  const [hasCalculated, setHasCalculated] = useState(false);
  const [copied, setCopied] = useState(false);

  // Dragging state
  const [position, setPosition] = useState({ x: 20, y: 80 }); // Initial position (top left corner)
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, initX: 0, initY: 0 });

  const handleNumber = (num: string) => {
    if (display === '0' || hasCalculated) {
      setDisplay(num);
      setHasCalculated(false);
    } else {
      if (display.length < 12) {
        setDisplay(display + num);
      }
    }
  };

  const handleOperator = (op: string) => {
    setEquation(display + ' ' + op + ' ');
    setDisplay('0');
    setHasCalculated(false);
  };

  const calculate = () => {
    try {
      const fullEquation = equation + display;
      if (!fullEquation.trim()) return;

      let sanitized = fullEquation.replace(/x/g, '*').replace(/÷/g, '/');
      sanitized = sanitized.replace(/%/g, '/100');

      const result = Function(`"use strict"; return (${sanitized})`)();
      
      let formattedResult = String(result);
      if (typeof result === 'number') {
        formattedResult = Number.isInteger(result) 
          ? String(result) 
          : parseFloat(result.toFixed(4)).toString();
      }

      setDisplay(formattedResult);
      setEquation('');
      setHasCalculated(true);
    } catch (e) {
      setDisplay('خطأ');
      setHasCalculated(true);
    }
  };

  const clear = () => {
    setDisplay('0');
    setEquation('');
    setHasCalculated(false);
  };

  const deleteLast = () => {
    if (hasCalculated) {
      clear();
    } else if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay('0');
    }
  };

  const handlePercent = () => {
    try {
      const val = parseFloat(display);
      if (!isNaN(val)) {
        setDisplay(String(val / 100));
        setHasCalculated(true);
      }
    } catch {
      setDisplay('خطأ');
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(display);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: position.x,
      initY: position.y
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setPosition({
      x: dragRef.current.initX + dx,
      y: dragRef.current.initY + dy
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const calculatorContent = (
    <div className={`bg-white rounded-xl shadow-2xl border border-gray-300 overflow-hidden text-right select-none ${isEmbedded ? 'w-full' : 'w-56'} transition-shadow ${isDragging ? 'shadow-3xl ring-2 ring-blue-500/50' : ''}`}>
      {/* Header Bar - Draggable */}
      <div 
        className="bg-slate-800 text-white px-2 py-1.5 flex items-center justify-between border-b border-slate-700 cursor-move"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div className="flex items-center gap-1.5">
          <GripHorizontal size={14} className="text-slate-400" />
          <span className="font-bold text-[11px] text-slate-100 tracking-wide">الآلة الحاسبة</span>
        </div>

        {onClose && (
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="text-slate-400 hover:text-white p-1 hover:bg-rose-500 rounded-md transition cursor-pointer"
            title="إغلاق"
            onPointerDown={(e) => e.stopPropagation()} // Prevent drag when clicking close
          >
            <X size={14} />
          </button>
        )}
      </div>

      <div className="p-2 bg-slate-50 space-y-2">
        {/* Digital Screen Display */}
        <div className="bg-slate-900 rounded-lg p-2 border border-slate-800 text-left relative shadow-inner group">
          <div className="text-slate-400 text-[10px] font-mono h-3 overflow-hidden text-ellipsis whitespace-nowrap dir-ltr">
            {equation || ' '}
          </div>
          <div className="text-xl font-mono font-bold text-emerald-400 overflow-x-auto overflow-y-hidden whitespace-nowrap dir-ltr tracking-wider my-0.5">
            {display}
          </div>

          {/* Copy Button */}
          <button
            onClick={copyToClipboard}
            className="absolute top-1 right-1 text-slate-400 hover:text-emerald-400 p-1 hover:bg-slate-800 rounded transition text-xs flex items-center gap-1 opacity-80 group-hover:opacity-100"
            title="نسخ النتيجة"
          >
            {copied ? (
              <span className="text-emerald-400 flex items-center gap-1 text-[9px] font-sans font-bold">
                <Check size={10} /> تم
              </span>
            ) : (
              <Copy size={12} />
            )}
          </button>
        </div>

        {/* Keypad Grid */}
        <div className="grid grid-cols-4 gap-1 font-bold dir-ltr">
          {/* Row 1 */}
          <button onClick={clear} className="bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200/80 active:scale-95 h-8 rounded-lg text-xs transition flex items-center justify-center font-bold">
            C
          </button>
          <button onClick={deleteLast} className="bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200/80 active:scale-95 h-8 rounded-lg transition flex items-center justify-center">
            <Delete size={14} />
          </button>
          <button onClick={handlePercent} className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/80 active:scale-95 h-8 rounded-lg transition flex items-center justify-center text-xs font-extrabold">
            %
          </button>
          <button onClick={() => handleOperator('÷')} className="bg-blue-600 text-white hover:bg-blue-700 active:scale-95 h-8 rounded-lg text-sm transition flex items-center justify-center shadow-xs font-extrabold">
            ÷
          </button>

          {/* Row 2 */}
          <button onClick={() => handleNumber('7')} className="bg-white hover:bg-slate-100 text-slate-800 border border-slate-200/80 active:scale-95 h-8 rounded-lg text-xs transition font-extrabold shadow-xs">
            7
          </button>
          <button onClick={() => handleNumber('8')} className="bg-white hover:bg-slate-100 text-slate-800 border border-slate-200/80 active:scale-95 h-8 rounded-lg text-xs transition font-extrabold shadow-xs">
            8
          </button>
          <button onClick={() => handleNumber('9')} className="bg-white hover:bg-slate-100 text-slate-800 border border-slate-200/80 active:scale-95 h-8 rounded-lg text-xs transition font-extrabold shadow-xs">
            9
          </button>
          <button onClick={() => handleOperator('x')} className="bg-blue-600 text-white hover:bg-blue-700 active:scale-95 h-8 rounded-lg text-sm transition flex items-center justify-center shadow-xs font-extrabold">
            ×
          </button>

          {/* Row 3 */}
          <button onClick={() => handleNumber('4')} className="bg-white hover:bg-slate-100 text-slate-800 border border-slate-200/80 active:scale-95 h-8 rounded-lg text-xs transition font-extrabold shadow-xs">
            4
          </button>
          <button onClick={() => handleNumber('5')} className="bg-white hover:bg-slate-100 text-slate-800 border border-slate-200/80 active:scale-95 h-8 rounded-lg text-xs transition font-extrabold shadow-xs">
            5
          </button>
          <button onClick={() => handleNumber('6')} className="bg-white hover:bg-slate-100 text-slate-800 border border-slate-200/80 active:scale-95 h-8 rounded-lg text-xs transition font-extrabold shadow-xs">
            6
          </button>
          <button onClick={() => handleOperator('-')} className="bg-blue-600 text-white hover:bg-blue-700 active:scale-95 h-8 rounded-lg text-sm transition flex items-center justify-center shadow-xs font-extrabold">
            -
          </button>

          {/* Row 4 */}
          <button onClick={() => handleNumber('1')} className="bg-white hover:bg-slate-100 text-slate-800 border border-slate-200/80 active:scale-95 h-8 rounded-lg text-xs transition font-extrabold shadow-xs">
            1
          </button>
          <button onClick={() => handleNumber('2')} className="bg-white hover:bg-slate-100 text-slate-800 border border-slate-200/80 active:scale-95 h-8 rounded-lg text-xs transition font-extrabold shadow-xs">
            2
          </button>
          <button onClick={() => handleNumber('3')} className="bg-white hover:bg-slate-100 text-slate-800 border border-slate-200/80 active:scale-95 h-8 rounded-lg text-xs transition font-extrabold shadow-xs">
            3
          </button>
          <button onClick={() => handleOperator('+')} className="bg-blue-600 text-white hover:bg-blue-700 active:scale-95 h-8 rounded-lg text-sm transition flex items-center justify-center shadow-xs font-extrabold">
            +
          </button>

          {/* Row 5 */}
          <button onClick={() => handleNumber('0')} className="col-span-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200/80 active:scale-95 h-8 rounded-lg text-xs transition font-extrabold shadow-xs">
            0
          </button>
          <button onClick={() => handleNumber('.')} className="bg-white hover:bg-slate-100 text-slate-800 border border-slate-200/80 active:scale-95 h-8 rounded-lg text-xs transition font-extrabold shadow-xs">
            .
          </button>
          <button onClick={calculate} className="bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 h-8 rounded-lg text-sm transition flex items-center justify-center shadow-sm font-extrabold">
            =
          </button>
        </div>
      </div>
    </div>
  );

  // If used as modal / popup
  if (isOpen !== undefined) {
    if (!isOpen) return null;
    return (
      <div 
        className="fixed z-50 animate-in fade-in zoom-in-95 duration-200"
        style={{ left: position.x, top: position.y }}
      >
        {calculatorContent}
      </div>
    );
  }

  return calculatorContent;
}
