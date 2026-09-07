import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, X, CheckCircle2, AlertCircle, Volume2, RefreshCw, Zap } from 'lucide-react';
import { Product } from '../types';

interface BarcodeScannerModalProps {
  products: Product[];
  isOpen: boolean;
  onClose: () => void;
  onScanProduct: (product: Product) => void;
}

export default function BarcodeScannerModal({
  products,
  isOpen,
  onClose,
  onScanProduct,
}: BarcodeScannerModalProps) {
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [scanMessage, setScanMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [continuousMode, setContinuousMode] = useState(true);

  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'barcode-camera-reader';
  const isProcessingRef = useRef(false);

  // Play audio feedback on scan
  const playBeep = (isSuccess: boolean) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(isSuccess ? 880 : 300, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.2);
    } catch (e) {
      console.warn('Audio feedback failed:', e);
    }
  };

  const handleBarcodeDecoded = (decodedText: string) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    setLastScannedCode(decodedText);

    // Find product matching barcode or ID
    const cleanCode = decodedText.trim().toLowerCase();
    const matchedProduct = products.find(p => 
      (p.barcode && p.barcode.trim().toLowerCase() === cleanCode) ||
      p.id.toLowerCase() === cleanCode ||
      p.name.toLowerCase() === cleanCode
    );

    if (matchedProduct) {
      playBeep(true);
      onScanProduct(matchedProduct);
      setScanMessage({
        type: 'success',
        text: `تمت إضافة [${matchedProduct.name}] بسعر ${matchedProduct.price.toFixed(2)} د.ل!`,
      });

      if (!continuousMode) {
        setTimeout(() => {
          stopScanner();
          onClose();
        }, 800);
        return;
      }
    } else {
      playBeep(false);
      setScanMessage({
        type: 'error',
        text: `رمز الباركود (${decodedText}) غير مسجل لأي منتج!`,
      });
    }

    // Cooldown before processing next frame
    setTimeout(() => {
      isProcessingRef.current = false;
    }, 1500);
  };

  const startScanner = async () => {
    setCameraError(null);
    setScanMessage(null);

    try {
      if (html5QrcodeRef.current) {
        await stopScanner();
      }

      const html5Qrcode = new Html5Qrcode(scannerContainerId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.ITF,
          Html5QrcodeSupportedFormats.QR_CODE,
        ],
        verbose: false,
      });

      html5QrcodeRef.current = html5Qrcode;

      const config = {
        fps: 15,
        qrbox: { width: 260, height: 160 },
        aspectRatio: 1.0,
      };

      await html5Qrcode.start(
        { facingMode: 'environment' },
        config,
        (decodedText) => {
          handleBarcodeDecoded(decodedText);
        },
        () => {
          // Frame parse failures are normal, ignore
        }
      );

      setIsScanning(true);
    } catch (err: any) {
      console.error('Camera startup error:', err);
      setIsScanning(false);
      setCameraError(
        'تعذر تشغيل الكاميرا. يرجى التأكد من السماح بالوصول للكاميرا في المتصفح أو التأكد من توفر كاميرا بالجهاز.'
      );
    }
  };

  const stopScanner = async () => {
    if (html5QrcodeRef.current) {
      try {
        if (html5QrcodeRef.current.isScanning) {
          await html5QrcodeRef.current.stop();
        }
        html5QrcodeRef.current.clear();
      } catch (err) {
        console.warn('Error stopping scanner:', err);
      } finally {
        html5QrcodeRef.current = null;
        setIsScanning(false);
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      // Small timeout to ensure DOM container is rendered
      const timer = setTimeout(() => {
        startScanner();
      }, 200);
      return () => {
        clearTimeout(timer);
        stopScanner();
      };
    } else {
      stopScanner();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden flex flex-col border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 to-blue-600 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-xl">
              <Camera size={22} />
            </div>
            <div>
              <h3 className="font-bold text-base">ماسح الباركود بالكاميرا</h3>
              <p className="text-xs text-blue-100">وجه الكاميرا نحو رمز الباركود على المنتج</p>
            </div>
          </div>

          <button
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition"
            title="إغلاق"
          >
            <X size={20} />
          </button>
        </div>

        {/* Camera Container & Viewport */}
        <div className="p-4 flex flex-col items-center">
          {cameraError ? (
            <div className="w-full bg-red-50 border border-red-200 rounded-xl p-5 text-center flex flex-col items-center gap-3 my-4">
              <AlertCircle size={36} className="text-red-500" />
              <p className="text-xs font-semibold text-red-700 leading-relaxed">{cameraError}</p>
              <button
                onClick={startScanner}
                className="mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg flex items-center gap-2 shadow-xs transition"
              >
                <RefreshCw size={14} />
                إعادة المحاولة
              </button>
            </div>
          ) : (
            <div className="relative w-full max-w-[320px] aspect-square rounded-xl overflow-hidden bg-black border-2 border-blue-500 shadow-inner flex items-center justify-center">
              <div id={scannerContainerId} className="w-full h-full object-cover"></div>

              {/* Scanning visual overlay overlay frame */}
              {isScanning && (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
                  <div className="w-56 h-36 border-2 border-dashed border-amber-400 rounded-lg relative flex items-center justify-center shadow-[0_0_15px_rgba(251,191,36,0.3)]">
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-blue-500 -mt-1 -ml-1"></div>
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-blue-500 -mt-1 -mr-1"></div>
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-blue-500 -mb-1 -ml-1"></div>
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-blue-500 -mb-1 -mr-1"></div>
                    
                    {/* Scanning Laser Line */}
                    <div className="w-full h-0.5 bg-red-500 shadow-[0_0_8px_#ef4444] animate-pulse"></div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Feedback Message Toast */}
          {scanMessage && (
            <div
              className={`mt-3 w-full p-3 rounded-xl border flex items-center gap-2.5 text-xs font-bold animate-in fade-in slide-in-from-top-2 ${
                scanMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-red-50 text-red-800 border-red-200'
              }`}
            >
              {scanMessage.type === 'success' ? (
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle size={18} className="text-red-600 shrink-0" />
              )}
              <span className="flex-1">{scanMessage.text}</span>
            </div>
          )}

          {/* Continuous Scan Toggle & Information */}
          <div className="mt-4 w-full bg-gray-50 border border-gray-100 p-3 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap size={16} className="text-blue-600" />
              <span className="text-xs font-bold text-gray-700">مسح متصل متتابع</span>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={continuousMode}
                onChange={(e) => setContinuousMode(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-gray-50 border-t border-gray-100 flex justify-end">
          <button
            onClick={() => {
              stopScanner();
              onClose();
            }}
            className="px-5 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold text-xs rounded-xl transition"
          >
            إغلاق الماسح
          </button>
        </div>

      </div>
    </div>
  );
}
