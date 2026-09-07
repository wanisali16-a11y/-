import React, { useState } from 'react';
import { User } from '../types';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  KeyRound, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  X, 
  ShieldAlert,
  BarChart3,
  Settings as SettingsIcon,
  UserCheck,
  FileText,
  Lock
} from 'lucide-react';

interface UserManagerProps {
  users: User[];
  currentUser: User;
  onAddUser: (user: User) => void;
  onUpdateUser: (user: User) => void;
  onDeleteUser: (userId: string) => void;
}

export default function UserManager({
  users,
  currentUser,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
}: UserManagerProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [passwordPin, setPasswordPin] = useState('');
  const [role, setRole] = useState<'super_admin' | 'admin' | 'cashier'>('cashier');
  const [canAccessReports, setCanAccessReports] = useState(false);
  const [canAccessPurchases, setCanAccessPurchases] = useState(false);
  const [canDeleteData, setCanDeleteData] = useState(false);
  const [canAccessSettings, setCanAccessSettings] = useState(false);

  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const resetForm = () => {
    setName('');
    setUsername('');
    setPasswordPin('');
    setRole('cashier');
    setCanAccessReports(false);
    setCanAccessPurchases(false);
    setCanDeleteData(false);
    setCanAccessSettings(false);
    setFormError(null);
  };

  const handleOpenAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleOpenEditModal = (user: User) => {
    const isSuperAdminTarget = user.role === 'super_admin' || user.isSuperAdmin || user.username === 'developer';
    const isCurrentSuperAdmin = currentUser.role === 'super_admin' || currentUser.isSuperAdmin || currentUser.username === 'developer';

    if (isSuperAdminTarget && !isCurrentSuperAdmin) {
      alert('حساب مُعد النظام محمي تماماً ولا يمكن تعديله بواسطة أي مستخدم آخر!');
      return;
    }

    setEditingUser(user);
    setName(user.name);
    setUsername(user.username);
    setPasswordPin(user.passwordPin);
    setRole(user.role);
    setCanAccessReports(user.canAccessReports);
    setCanAccessPurchases(user.canAccessPurchases ?? false);
    setCanDeleteData(user.canDeleteData);
    setCanAccessSettings(user.canAccessSettings);
    setFormError(null);
  };

  const handleRoleChange = (newRole: 'super_admin' | 'admin' | 'cashier') => {
    setRole(newRole);
    if (newRole === 'super_admin' || newRole === 'admin') {
      setCanAccessReports(true);
      setCanAccessPurchases(true);
      setCanDeleteData(true);
      setCanAccessSettings(true);
    } else {
      setCanAccessReports(false);
      setCanAccessPurchases(false);
      setCanDeleteData(false);
      setCanAccessSettings(false);
    }
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !username.trim() || !passwordPin.trim()) {
      setFormError('جميع الحقول المحددة مطلوبة (الاسم، اسم الحساب، والرمز السري).');
      return;
    }

    if (!editingUser && role === 'super_admin') {
      setFormError('لا يمكن إنشاء مستخدم جديد بدور مُعد النظام!');
      return;
    }

    if (editingUser) {
      // Check username collision
      const exists = users.some(u => u.username.toLowerCase() === username.trim().toLowerCase() && u.id !== editingUser.id);
      if (exists) {
        setFormError('اسم المستخدم هذا مستخدم بالفعل بحساب آخر!');
        return;
      }

      const updated: User = {
        ...editingUser,
        name: name.trim(),
        username: username.trim(),
        passwordPin: passwordPin.trim(),
        role: (editingUser.role === 'super_admin' || editingUser.isSuperAdmin) ? 'super_admin' : role,
        isSuperAdmin: editingUser.role === 'super_admin' || editingUser.isSuperAdmin || role === 'super_admin',
        canAccessReports,
        canAccessPurchases,
        canDeleteData,
        canAccessSettings,
      };

      onUpdateUser(updated);
      setEditingUser(null);
      setSuccessMsg(`تم تحديث بيانات المستخدم (${updated.name}) بنجاح!`);
    } else {
      // Check username collision
      const exists = users.some(u => u.username.toLowerCase() === username.trim().toLowerCase());
      if (exists) {
        setFormError('اسم المستخدم هذا موجود بالفعل!');
        return;
      }

      const newUser: User = {
        id: 'u-' + Date.now(),
        name: name.trim(),
        username: username.trim(),
        passwordPin: passwordPin.trim(),
        role: role === 'super_admin' ? 'admin' : role,
        isSuperAdmin: false,
        canAccessReports,
        canAccessPurchases,
        canDeleteData,
        canAccessSettings,
      };

      onAddUser(newUser);
      setShowAddModal(false);
      setSuccessMsg(`تمت إضافة المستخدم الجديد (${newUser.name}) بنجاح!`);
    }

    resetForm();
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const handleDelete = (userToDelete: User) => {
    const isSuperAdminTarget = userToDelete.role === 'super_admin' || userToDelete.isSuperAdmin || userToDelete.username === 'developer';
    if (isSuperAdminTarget) {
      alert('حساب مُعد النظام محمي ولا يمكن حذفه نهائياً!');
      return;
    }

    if (userToDelete.id === currentUser.id) {
      alert('لا يمكنك حذف الحساب النشط حالياً!');
      return;
    }

    const adminCount = users.filter(u => u.role === 'admin').length;
    if (userToDelete.role === 'admin' && adminCount <= 1) {
      alert('لا يمكنك حذف المدير الوحيد في النظام!');
      return;
    }

    if (confirm(`هل أنت متأكد من حذف المستخدم (${userToDelete.name})؟`)) {
      onDeleteUser(userToDelete.id);
      setSuccessMsg(`تم حذف المستخدم (${userToDelete.name}) بنجاح.`);
      setTimeout(() => setSuccessMsg(null), 4000);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 font-sans" dir="rtl">
      
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 mb-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-100 text-amber-800 rounded-xl">
            <Users size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">إدارة المستخدمين والصلاحيات</h3>
            <p className="text-xs text-gray-500">إضافة مستخدمين (كاشير / مدير)، ضبط كلمات المرور، وتقييد الصلاحيات</p>
          </div>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow transition flex items-center justify-center gap-2"
        >
          <UserPlus size={18} />
          إضافة مستخدم جديد
        </button>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Users List Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-right text-xs">
          <thead className="bg-gray-50 text-gray-700 font-bold border-b border-gray-200">
            <tr>
              <th className="p-3">المستخدم</th>
              <th className="p-3">الدور</th>
              <th className="p-3">كلمة المرور / PIN</th>
              <th className="p-3">الصلاحيات الممنوحة</th>
              <th className="p-3 text-center">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map(u => {
              const isCurrent = u.id === currentUser.id;
              return (
                <tr key={u.id} className={`hover:bg-gray-50/80 transition ${isCurrent ? 'bg-blue-50/40' : ''}`}>
                  <td className="p-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs shrink-0">
                        {u.name.substring(0, 1)}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-sm flex items-center gap-1.5">
                          {u.name}
                          {isCurrent && (
                            <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                              حسابك الحالي
                            </span>
                          )}
                        </p>
                        <p className="text-[11px] text-gray-500 font-mono">@{u.username}</p>
                      </div>
                    </div>
                  </td>

                  <td className="p-3">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold text-[11px] ${
                      u.role === 'super_admin' || u.isSuperAdmin
                        ? 'bg-purple-100 text-purple-900 border border-purple-300 shadow-sm'
                        : u.role === 'admin' 
                          ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                          : 'bg-blue-100 text-blue-800 border border-blue-200'
                    }`}>
                      <ShieldCheck size={14} />
                      {u.role === 'super_admin' || u.isSuperAdmin ? '👑 مُعد النظام' : u.role === 'admin' ? 'مدير نظام' : 'كاشير مبيعات'}
                    </span>
                  </td>

                  <td className="p-3">
                    <span className="font-mono bg-gray-100 px-2.5 py-1 rounded border border-gray-200 text-gray-800 font-bold">
                      {u.passwordPin}
                    </span>
                  </td>

                  <td className="p-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                        u.canAccessPurchases ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-400 line-through'
                      }`}>
                        <FileText size={12} />
                        المشتريات
                      </span>

                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                        u.canAccessReports ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-400 line-through'
                      }`}>
                        <BarChart3 size={12} />
                        التقارير
                      </span>

                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                        u.canDeleteData ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-400 line-through'
                      }`}>
                        <Trash2 size={12} />
                        الحذف
                      </span>

                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                        u.canAccessSettings ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-400 line-through'
                      }`}>
                        <SettingsIcon size={12} />
                        الإعدادات
                      </span>
                    </div>
                  </td>

                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {(() => {
                        const isSuperTarget = u.role === 'super_admin' || u.isSuperAdmin || u.username === 'developer';
                        const isCurrentSuper = currentUser.role === 'super_admin' || currentUser.isSuperAdmin || currentUser.username === 'developer';
                        const cannotEdit = isSuperTarget && !isCurrentSuper;

                        return (
                          <>
                            <button
                              onClick={() => handleOpenEditModal(u)}
                              disabled={cannotEdit}
                              title={cannotEdit ? 'حساب مُعد النظام محمي ضد التعديل' : 'تعديل بيانات المستخدم'}
                              className={`p-1.5 rounded-lg transition ${
                                cannotEdit 
                                  ? 'text-gray-300 cursor-not-allowed' 
                                  : 'text-blue-600 hover:bg-blue-50'
                              }`}
                            >
                              <Edit3 size={16} />
                            </button>

                            <button
                              onClick={() => handleDelete(u)}
                              disabled={isCurrent || isSuperTarget}
                              title={
                                isSuperTarget 
                                  ? 'حساب مُعد النظام محمي تماماً من الحذف' 
                                  : isCurrent 
                                    ? 'لا يمكنك حذف حسابك الحالي' 
                                    : 'حذف المستخدم'
                              }
                              className={`p-1.5 rounded-lg transition ${
                                isCurrent || isSuperTarget
                                  ? 'text-gray-300 cursor-not-allowed' 
                                  : 'text-red-500 hover:bg-red-50'
                              }`}
                            >
                              {isSuperTarget ? <Lock size={16} className="text-purple-400" /> : <Trash2 size={16} />}
                            </button>
                          </>
                        );
                      })()}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add / Edit User Modal */}
      {(showAddModal || editingUser) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-sans" dir="rtl">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-gray-100 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <ShieldCheck size={22} className="text-amber-600" />
                {editingUser ? `تعديل بيانات المستخدم: ${editingUser.name}` : 'إضافة مستخدم جديد'}
              </h3>
              <button 
                onClick={() => { setShowAddModal(false); setEditingUser(null); }}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-bold flex items-center gap-2">
                  <ShieldAlert size={16} className="shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">اسم المستخدم (الكامل):</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="مثال: أحمد علي"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-bold focus:bg-white focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">اسم الحساب (الدخول):</label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="مثال: ahmed"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-bold focus:bg-white focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">كلمة المرور / الرمز السري (PIN):</label>
                  <input
                    type="text"
                    required
                    value={passwordPin}
                    onChange={(e) => setPasswordPin(e.target.value)}
                    placeholder="مثال: 1234"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-mono font-bold focus:bg-white focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">دور المستخدم:</label>
                  {editingUser && (editingUser.role === 'super_admin' || editingUser.isSuperAdmin) ? (
                    <div className="w-full px-3.5 py-2.5 bg-purple-50 border border-purple-200 rounded-xl text-xs font-bold text-purple-900 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Lock size={14} className="text-purple-600" />
                        👑 مُعد النظام (محمي)
                      </span>
                      <span className="text-[10px] text-purple-700 bg-purple-100 px-2 py-0.5 rounded font-mono">غير قابل للتغيير</span>
                    </div>
                  ) : (
                    <select
                      value={role === 'super_admin' ? 'admin' : role}
                      onChange={(e) => handleRoleChange(e.target.value as 'admin' | 'cashier')}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-bold focus:bg-white focus:border-amber-500 focus:outline-none"
                    >
                      <option value="cashier">كاشير مبيعات</option>
                      <option value="admin">مدير نظام (كامل الصلاحيات)</option>
                    </select>
                  )}
                </div>
              </div>

              {/* Permissions Section */}
              <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200/80 space-y-2.5">
                <p className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <ShieldCheck size={16} className="text-amber-700" />
                  صلاحيات المستخدم المحددة:
                </p>

                <div className="space-y-2 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-800">
                    <input
                      type="checkbox"
                      checked={canAccessPurchases}
                      onChange={(e) => setCanAccessPurchases(e.target.checked)}
                      className="w-4 h-4 text-amber-600 rounded border-gray-300 focus:ring-amber-500"
                    />
                    <span>إمكانية دخول وإضافة المشتريات والسيطرة عليها</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-800">
                    <input
                      type="checkbox"
                      checked={canAccessReports}
                      onChange={(e) => setCanAccessReports(e.target.checked)}
                      className="w-4 h-4 text-amber-600 rounded border-gray-300 focus:ring-amber-500"
                    />
                    <span>إمكانية عرض تقارير المبيعات والأرباح</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-800">
                    <input
                      type="checkbox"
                      checked={canDeleteData}
                      onChange={(e) => setCanDeleteData(e.target.checked)}
                      className="w-4 h-4 text-amber-600 rounded border-gray-300 focus:ring-amber-500"
                    />
                    <span>صلاحية حذف المنتجات وتعديل السجلات وإعادة الضبط</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-800">
                    <input
                      type="checkbox"
                      checked={canAccessSettings}
                      onChange={(e) => setCanAccessSettings(e.target.checked)}
                      className="w-4 h-4 text-amber-600 rounded border-gray-300 focus:ring-amber-500"
                    />
                    <span>إمكانية دخول صفحة الإعدادات وتعديل المستخدمين</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setEditingUser(null); }}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl"
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 size={16} />
                  حفظ البيانات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
