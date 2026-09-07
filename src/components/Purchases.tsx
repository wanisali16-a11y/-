import React, { useState } from 'react';
import { Purchase } from '../types';
import { PlusCircle, FileText } from 'lucide-react';

interface PurchasesProps {
  purchases: Purchase[];
  onAddPurchase: (purchase: Purchase) => void;
}

export default function Purchases({ purchases, onAddPurchase }: PurchasesProps) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount || isNaN(Number(amount))) return;

    const newPurchase: Purchase = {
      id: Math.random().toString(36).substring(2, 9),
      date: new Date().toISOString(),
      description,
      amount: Number(amount),
      type: 'purchase',
    };

    onAddPurchase(newPurchase);
    setDescription('');
    setAmount('');
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 h-full">
      {/* Add Purchase Form */}
      <div className="w-full md:w-1/3 bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col h-fit">
        <h2 className="text-xl font-bold mb-4 text-gray-800 border-b pb-2 flex items-center gap-2">
          <PlusCircle className="text-blue-600" />
          إضافة مشتريات
        </h2>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-gray-700 font-semibold mb-2">الوصف / البيان</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="مثال: فاتورة بضاعة جديدة"
              required
            />
          </div>
          
          <div>
            <label className="block text-gray-700 font-semibold mb-2">القيمة (د.ل)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="0.00"
              required
            />
          </div>

          <button
            type="submit"
            className="mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-colors flex justify-center items-center gap-2"
          >
            <PlusCircle size={20} />
            تسجيل المشتريات
          </button>
        </form>
      </div>

      {/* Purchases List */}
      <div className="w-full md:w-2/3 bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col">
        <h2 className="text-xl font-bold mb-4 text-gray-800 border-b pb-2 flex items-center gap-2">
          <FileText className="text-gray-600" />
          سجل المشتريات
        </h2>
        
        <div className="flex-1 overflow-y-auto">
          {purchases.length === 0 ? (
            <div className="text-center text-gray-400 mt-10">لا توجد مشتريات مسجلة</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="p-3 font-semibold text-gray-600">التاريخ</th>
                    <th className="p-3 font-semibold text-gray-600">البيان</th>
                    <th className="p-3 font-semibold text-gray-600">القيمة</th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((p) => (
                    <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="p-3 text-gray-500 text-sm">
                        {new Date(p.date).toLocaleDateString('ar-LY')} {new Date(p.date).toLocaleTimeString('ar-LY', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="p-3 font-medium text-gray-800">{p.description}</td>
                      <td className="p-3 font-bold text-red-600">{p.amount.toFixed(2)} د.ل</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
