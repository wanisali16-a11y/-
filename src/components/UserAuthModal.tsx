import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { Lock, UserCheck, KeyRound, AlertCircle, X, ShieldAlert, LogIn } from 'lucide-react';

interface UserAuthModalProps {
  users: User[];
  currentUser: User | null;
  isOpen: boolean;
  onClose: () => void;
  onSwitchUser: (user: User) => void;
  forceLogin?: boolean;
}

export function UserSwitchModal({ users, currentUser, isOpen, onClose, onSwitchUser, forceLogin = false }: UserAuthModalProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (currentUser && !forceLogin) {
        setSelectedUserId(currentUser.id);
      } else if (users.length > 0) {
        setSelectedUserId(users[0].id);
      }
      setPin('');
      setError(null);
    }
  }, [isOpen, currentUser, forceLogin, users]);

  if (!isOpen) return null;

  const handleVerifyAndSwitch = (e: React.FormEvent) => {
    e.preventDefault();
    const userToLogin = users.find(u => u.id === selectedUserId);
    if (!userToLogin) {
      setError('الرجاء اختيار مستخدم');
      return;
    }

    if (pin.trim() === userToLogin.passwordPin) {
      onSwitchUser(userToLogin);
      if (!forceLogin) {
        onClose();
      }
      setPin('');
      setError(null);
    } else {
      setError('كلمة المرور / الرمز السري غير صحيح!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-sans" dir="rtl">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl shrink-0">
              <UserCheck size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 leading-tight">{forceLogin ? 'تسجيل الدخول للنظام' : 'تبديل المستخدم الحالي'}</h3>
              {currentUser && !forceLogin ? (
                <p className="text-xs text-gray-500 mt-1">المستخدم النشط: <span className="font-bold text-blue-600">{currentUser.name}</span></p>
              ) : (
                <p className="text-xs text-gray-500 mt-1">يرجى اختيار المستخدم للدخول</p>
              )}
            </div>
          </div>
          {!forceLogin && (
            <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
              <X size={20} />
            </button>
          )}
        </div>

        <form onSubmit={handleVerifyAndSwitch} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1">
               اختر المستخدم:
            </label>
            <div className="relative">
              <select
                value={selectedUserId}
                onChange={(e) => {
                  setSelectedUserId(e.target.value);
                  setPin('');
                  setError(null);
                }}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-right text-sm font-bold focus:bg-white focus:border-blue-500 focus:outline-none appearance-none cursor-pointer"
              >
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role === 'super_admin' || u.isSuperAdmin ? 'مُعد النظام' : u.role === 'admin' ? 'مدير' : 'كاشير'})
                  </option>
                ))}
              </select>
              <div className="absolute left-3 top-3.5 pointer-events-none text-gray-500">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1">
              <KeyRound size={14} className="text-blue-600" />
              أدخل كلمة المرور / الرمز السري:
            </label>
            <input
              type="password"
              autoFocus
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="****"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-center text-lg font-mono font-bold tracking-widest focus:bg-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2 font-bold">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            {!forceLogin && (
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl"
              >
                إلغاء
              </button>
            )}
            <button
              type="submit"
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow flex items-center justify-center gap-2"
            >
              <LogIn size={16} />
              تأكيد الدخول
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


interface ActionPinModalProps {
  isOpen: boolean;
  title?: string;
  description?: string;
  users: User[];
  onClose: () => void;
  onSuccess: () => void;
}

export function ActionPinModal({
  isOpen,
  title = 'تأكيد الرمز السري',
  description = 'هذه العملية تتطلب إذن مدير النظام. أدخل الرمز السري للمتابعة.',
  users,
  onClose,
  onSuccess,
}: ActionPinModalProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    // Check if entered pin matches any admin user's passwordPin or any user with required permission
    const authorized = users.some(
      u => u.passwordPin === pin.trim() && (u.role === 'admin' || u.canDeleteData || u.canAccessReports)
    );

    if (authorized) {
      onSuccess();
      setPin('');
      setError(null);
      onClose();
    } else {
      setError('الرمز السري غير صحيح أو ليس لديك صلاحية تنفيذ هذا الأمر!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-sans" dir="rtl">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center gap-3 text-amber-600 mb-2">
          <div className="p-2.5 bg-amber-100 rounded-xl text-amber-700">
            <ShieldAlert size={24} />
          </div>
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
        </div>

        <p className="text-xs text-gray-600 leading-relaxed mb-4">{description}</p>

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1">
              <Lock size={14} className="text-amber-600" />
              كلمة مرور المدير / الرمز السري:
            </label>
            <input
              type="password"
              autoFocus
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="****"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-center text-lg font-mono font-bold tracking-widest focus:bg-white focus:border-amber-500 focus:outline-none"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2 font-bold">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow flex items-center justify-center gap-1.5"
            >
              موافق وتأكيد
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
