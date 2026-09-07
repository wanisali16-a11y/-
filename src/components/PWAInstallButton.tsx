import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Monitor, ExternalLink, X, CheckCircle2 } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  // If already running as an installed standalone PWA, hide or show badge
  if (isInstalled) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 text-green-700 text-xs font-bold border border-green-200">
        <CheckCircle2 size={16} />
        <span>مثبت كتطبيق</span>
      </div>
    );
  }

  const handleButtonClick = async () => {
    if (isInstallable) {
      const result = await install();
      if (!result) {
        setShowGuideModal(true);
      }
    } else {
      setShowGuideModal(true);
    }
  };

  const handleOpenNewTab = () => {
    window.open(window.location.href, '_blank');
  };

  return (
    <>
      <button
        onClick={handleButtonClick}
        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-md hover:from-blue-700 hover:to-indigo-700 transition transform active:scale-95"
      >
        <Monitor size={18} />
        <span>تثبيت المنظومة / أيقونة سطح المكتب</span>
      </button>

      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm font-sans" dir="rtl">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Monitor className="text-blue-600" size={22} />
                تثبيت المنظومة على سطح المكتب
              </h3>
              <button
                onClick={() => setShowGuideModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <p className="text-sm text-gray-700 leading-relaxed">
                لكي تعمل المنظومة كبرنامج مستقل على حاسوبك وبدون شريط المتصفح:
              </p>

              {/* Step 1: Open in new window if inside iframe */}
              <div className="p-3.5 bg-blue-50 rounded-xl border border-blue-100 flex flex-col gap-2">
                <span className="text-xs font-bold text-blue-900">الخطوة 1: افتح المنظومة في نافذة مستقلة</span>
                <button
                  onClick={handleOpenNewTab}
                  className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-2 transition"
                >
                  <ExternalLink size={16} />
                  فتح المنظومة في نافذة جديدة
                </button>
              </div>

              {/* Step 2: Chrome / Edge Install instructions */}
              <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-700 leading-relaxed">
                <span className="font-bold text-gray-900 block mb-1">الخطوة 2: إنشاء الأيقونة من المتصفح</span>
                <ul className="list-disc list-inside space-y-1 text-gray-600">
                  {isIOS ? (
                    <>
                      <li>في متصفح Safari، اضغط على زر <strong>المشاركة (Share)</strong> بالأسفل.</li>
                      <li>اختر <strong>إضافة إلى الصفحة الرئيسية (Add to Home Screen)</strong>.</li>
                    </>
                  ) : (
                    <>
                      <li>في متصفح <strong>Google Chrome</strong> أو <strong>Edge</strong>:</li>
                      <li>اضغط على أيقونة التثبيت <Download size={12} className="inline mx-1 text-blue-600" /> الموجودة أعلى شريط العنوان، أو اضغط على قائمة النقاط الثلاث <code>⋮</code>.</li>
                      <li>اختر <strong>تثبيت المنظومة (Install)</strong> أو <strong>إنشاء اختصار على سطح المكتب (Create Shortcut)</strong>.</li>
                    </>
                  )}
                </ul>
              </div>
            </div>

            <button
              onClick={() => setShowGuideModal(false)}
              className="mt-5 w-full rounded-xl bg-gray-100 py-2.5 text-sm font-bold text-gray-800 hover:bg-gray-200 transition"
            >
              فهمت، إغلاق
            </button>
          </div>
        </div>
      )}
    </>
  );
};

