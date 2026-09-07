import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    try {
      localStorage.clear();
    } catch (e) {
      console.error(e);
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 font-sans" dir="rtl">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-gray-200">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
              !
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">حدث خطأ أثناء تحميل المنظومة</h2>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              حدثت مشكلة غير متوقعة عند عرض الصفحة. يمكن إعادة ضبط المنظومة وتحديث الصفحة لحل الخلل.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl transition-colors text-sm"
              >
                إعادة التحميل
              </button>
              <button
                onClick={this.handleReset}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-2.5 px-4 rounded-xl transition-colors text-sm"
              >
                إعادة ضبط البيئة
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
