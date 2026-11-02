import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { StaffProfile, UserRole, Doctor } from '../../types';
import { dbService } from '../../lib/databaseService';
import { getSupabaseClient } from '../../lib/supabaseClient';
import {
  Users,
  UserPlus,
  ShieldCheck,
  UserCheck,
  Stethoscope,
  KeyRound,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  Check,
  X,
  Phone,
  Mail,
  Lock,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
  Info,
  FlaskConical,
  Scan,
} from 'lucide-react';

export const StaffManager: React.FC = () => {
  const { currentUser, role, isAdmin, refreshStaff } = useAuth();
  const [staffList, setStaffList] = useState<StaffProfile[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<StaffProfile | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // New Account Form Fields
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('receptionist');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');

  // Edit Account Form Fields
  const [staffToEdit, setStaffToEdit] = useState<StaffProfile | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('receptionist');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editDoctorId, setEditDoctorId] = useState('');
  const [editIsActive, setEditIsActive] = useState(true);

  const isSupabaseLive = getSupabaseClient() !== null;

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [staff, docs] = await Promise.all([
        dbService.getStaffProfiles(),
        dbService.getDoctors(),
      ]);
      setStaffList(staff);
      setDoctors(docs);
    } catch (e) {
      console.error(e);
      setMessage({ text: 'فشل تحميل بيانات الموظفين', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRoleChange = (role: UserRole) => {
    setNewRole(role);
    if (role === 'doctor' && doctors.length > 0 && !selectedDoctorId) {
      setSelectedDoctorId(doctors[0].id);
      if (!newName) setNewName(doctors[0].full_name);
      if (!newPhone && doctors[0].phone) setNewPhone(doctors[0].phone);
      if (!newEmail) {
        const slug = doctors[0].id.replace('doc-', 'dr_');
        setNewEmail(`${slug}@mitali-hosp.org`);
      }
    }
  };

  const handleSelectDoctorForAccount = (docId: string) => {
    setSelectedDoctorId(docId);
    const doc = doctors.find(d => d.id === docId);
    if (doc) {
      setNewName(doc.full_name);
      if (doc.phone) setNewPhone(doc.phone);
      const slug = doc.id.replace('doc-', 'dr_');
      setNewEmail(`${slug}@mitali-hosp.org`);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) {
      setMessage({ text: 'يرجى إدخال اسم الموظف والبريد الإلكتروني.', type: 'error' });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const created = await dbService.createStaffProfile(
        {
          full_name: newName.trim(),
          role: newRole,
          email: newEmail.trim().toLowerCase(),
          phone: newPhone.trim(),
          doctor_id: newRole === 'doctor' ? selectedDoctorId : undefined,
          password: newPassword.trim(),
        },
        currentUser || undefined
      );

      setMessage({
        text: `تم إنشاء حساب "${created.full_name}" بنجاح وتعيين الصلاحيات (${getRoleLabel(created.role)})!`,
        type: 'success',
      });

      setIsAddModalOpen(false);
      resetForm();
      await loadData();
      await refreshStaff();
    } catch (err: any) {
      setMessage({ text: err?.message || 'حدث خطأ أثناء إنشاء الحساب.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEditStaff = (staff: StaffProfile) => {
    setStaffToEdit(staff);
    setEditName(staff.full_name);
    setEditRole(staff.role);
    setEditEmail(staff.email || '');
    setEditPhone(staff.phone || '');
    setEditPassword('');
    setEditDoctorId(staff.doctor_id || '');
    setEditIsActive(staff.is_active);
  };

  const handleSaveEditStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffToEdit) return;
    if (!editName.trim() || !editEmail.trim()) {
      setMessage({ text: 'يرجى إدخال اسم الموظف والبريد الإلكتروني.', type: 'error' });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      await dbService.updateStaffProfile(
        staffToEdit.id,
        {
          full_name: editName.trim(),
          role: editRole,
          email: editEmail.trim().toLowerCase(),
          phone: editPhone.trim(),
          doctor_id: editRole === 'doctor' ? editDoctorId : undefined,
          is_active: editIsActive,
          password: editPassword.trim() || undefined,
        },
        currentUser || undefined
      );

      setMessage({
        text: `تم حفظ وتحديث بيانات حساب "${editName.trim()}" بنجاح!`,
        type: 'success',
      });

      setStaffToEdit(null);
      await loadData();
      await refreshStaff();
    } catch (err: any) {
      setMessage({ text: err?.message || 'فشل تحديث بيانات الحساب.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (staff: StaffProfile) => {
    try {
      const updated = await dbService.updateStaffProfile(
        staff.id,
        { is_active: !staff.is_active },
        currentUser || undefined
      );
      setMessage({
        text: `تم ${updated.is_active ? 'تنشيط' : 'تعليق'} حساب "${staff.full_name}".`,
        type: 'success',
      });
      await loadData();
    } catch (err: any) {
      setMessage({ text: err?.message || 'فشل تعديل حالة الحساب.', type: 'error' });
    }
  };

  const handleDeleteAccount = async () => {
    if (!accountToDelete) return;
    try {
      await dbService.deleteStaffProfile(accountToDelete.id, currentUser || undefined);
      setMessage({
        text: `تم حذف حساب "${accountToDelete.full_name}" بنجاح.`,
        type: 'success',
      });
      setAccountToDelete(null);
      await loadData();
      await refreshStaff();
    } catch (err: any) {
      setMessage({ text: err?.message || 'فشل حذف الحساب.', type: 'error' });
    }
  };

  const resetForm = () => {
    setNewName('');
    setNewRole('receptionist');
    setNewEmail('');
    setNewPhone('');
    setNewPassword('');
    setSelectedDoctorId('');
  };

  const getRoleLabel = (r: UserRole) => {
    switch (r) {
      case 'admin':
        return 'مدير النظام (Admin)';
      case 'doctor':
        return 'طبيب عيادة (Doctor)';
      case 'receptionist':
        return 'موظف استقبال (Receptionist)';
      case 'lab_tech':
        return 'فني معمل التحاليل (Lab Tech)';
      case 'radiology_tech':
        return 'فني أشعة وسونار (Radiology Tech)';
      default:
        return r;
    }
  };

  const getRoleBadgeClass = (r: UserRole) => {
    switch (r) {
      case 'admin':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'doctor':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'receptionist':
        return 'bg-teal-100 text-teal-800 border-teal-200';
      case 'lab_tech':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'radiology_tech':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const filteredStaff = staffList.filter(s => {
    const matchesSearch =
      !searchQuery ||
      s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.phone?.includes(searchQuery);

    if (!matchesSearch) return false;
    if (roleFilter === 'all') return true;
    return s.role === roleFilter;
  });

  const adminsCount = staffList.filter(s => s.role === 'admin').length;
  const docsCount = staffList.filter(s => s.role === 'doctor').length;
  const recepCount = staffList.filter(s => s.role === 'receptionist').length;
  const labTechCount = staffList.filter(s => s.role === 'lab_tech').length;
  const radTechCount = staffList.filter(s => s.role === 'radiology_tech').length;

  if (!isAdmin) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center max-w-lg mx-auto my-12">
        <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl mx-auto flex items-center justify-center mb-3">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-900 mb-1">
          عفواً، هذه اللوحة مخصصة لإدارة المستشفى فقط (Admin)
        </h3>
        <p className="text-xs text-slate-500">
          إدارة حسابات الموظفين والأطباء تتطلب صلاحيات المدير العام للمستشفى.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alert / Notice */}
      {message && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between gap-3 text-xs font-semibold ${
            message.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
          <button
            onClick={() => setMessage(null)}
            className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header & Quick Action */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-50 text-purple-700 rounded-2xl flex items-center justify-center shrink-0 border border-purple-100">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">إدارة حسابات طاقم العمل والموظفين</h2>
              <p className="text-xs text-slate-500 mt-1">
                إنشاء وتعديل حسابات تسجيل الدخول للمديرين، الأطباء، وموظفي الاستقبال
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                resetForm();
                setIsAddModalOpen(true);
              }}
              className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-colors cursor-pointer shadow-sm"
            >
              <UserPlus className="w-4 h-4" />
              <span>إضافة حساب موظف / طبيب جديد</span>
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-5 pt-4 border-t border-slate-100">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <span className="text-xs font-medium text-slate-600">إجمالي الحسابات</span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-2xl font-bold text-slate-900">{staffList.length}</span>
              <span className="text-[11px] text-slate-500">حساب</span>
            </div>
          </div>

          <div className="bg-purple-50/60 border border-purple-200/80 rounded-xl p-3">
            <span className="text-xs font-medium text-purple-800">المديرون (Admin)</span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-2xl font-bold text-purple-900">{adminsCount}</span>
              <span className="text-[11px] text-purple-700">مدير</span>
            </div>
          </div>

          <div className="bg-blue-50/60 border border-blue-200/80 rounded-xl p-3">
            <span className="text-xs font-medium text-blue-800">أطباء العيادات</span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-2xl font-bold text-blue-900">{docsCount}</span>
              <span className="text-[11px] text-blue-700">طبيب</span>
            </div>
          </div>

          <div className="bg-teal-50/60 border border-teal-200/80 rounded-xl p-3">
            <span className="text-xs font-medium text-teal-800">موظفو الاستقبال</span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-2xl font-bold text-teal-900">{recepCount}</span>
              <span className="text-[11px] text-teal-700">موظف</span>
            </div>
          </div>

          <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-3 col-span-2 sm:col-span-1">
            <span className="text-xs font-medium text-amber-800">فنيو المعمل والأشعة</span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-2xl font-bold text-amber-900">{labTechCount + radTechCount}</span>
              <span className="text-[11px] text-amber-700">فني وأخصائي</span>
            </div>
          </div>
        </div>
      </div>

      {/* Accounts List Workspace */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Filter & Search Bar */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="بحث بالاسم أو البريد الإلكتروني أو الهاتف..."
              className="w-full pr-9 pl-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-purple-600"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setRoleFilter('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg cursor-pointer transition-colors whitespace-nowrap ${
                roleFilter === 'all'
                  ? 'bg-slate-900 text-white font-bold'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              الكل ({staffList.length})
            </button>
            <button
              onClick={() => setRoleFilter('admin')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg cursor-pointer transition-colors whitespace-nowrap ${
                roleFilter === 'admin'
                  ? 'bg-purple-700 text-white font-bold'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-purple-50'
              }`}
            >
              مديرون ({adminsCount})
            </button>
            <button
              onClick={() => setRoleFilter('doctor')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg cursor-pointer transition-colors whitespace-nowrap ${
                roleFilter === 'doctor'
                  ? 'bg-blue-700 text-white font-bold'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-blue-50'
              }`}
            >
              أطباء ({docsCount})
            </button>
            <button
              onClick={() => setRoleFilter('receptionist')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg cursor-pointer transition-colors whitespace-nowrap ${
                roleFilter === 'receptionist'
                  ? 'bg-teal-700 text-white font-bold'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-teal-50'
              }`}
            >
              استقبال ({recepCount})
            </button>
            <button
              onClick={() => setRoleFilter('lab_tech')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg cursor-pointer transition-colors whitespace-nowrap ${
                roleFilter === 'lab_tech'
                  ? 'bg-amber-700 text-white font-bold'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-amber-50'
              }`}
            >
              فنيو معمل ({labTechCount})
            </button>
            <button
              onClick={() => setRoleFilter('radiology_tech')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg cursor-pointer transition-colors whitespace-nowrap ${
                roleFilter === 'radiology_tech'
                  ? 'bg-indigo-700 text-white font-bold'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-indigo-50'
              }`}
            >
              فنيو أشعة ({radTechCount})
            </button>
          </div>
        </div>

        {/* Staff Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="p-3.5">اسم الموظف / الطبيب</th>
                <th className="p-3.5">الدور الوظيفي والصلاحيات</th>
                <th className="p-3.5">البريد الإلكتروني</th>
                <th className="p-3.5">رقم الهاتف</th>
                <th className="p-3.5">حالة الحساب</th>
                <th className="p-3.5 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    لا توجد حسابات تطابق شروط البحث الحالية.
                  </td>
                </tr>
              ) : (
                filteredStaff.map(staff => (
                  <tr key={staff.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-xs ${
                            staff.role === 'admin'
                              ? 'bg-purple-100 text-purple-700'
                              : staff.role === 'doctor'
                              ? 'bg-blue-100 text-blue-700'
                              : staff.role === 'lab_tech'
                              ? 'bg-amber-100 text-amber-700'
                              : staff.role === 'radiology_tech'
                              ? 'bg-indigo-100 text-indigo-700'
                              : 'bg-teal-100 text-teal-700'
                          }`}
                        >
                          {staff.role === 'admin' ? (
                            <ShieldCheck className="w-4 h-4" />
                          ) : staff.role === 'doctor' ? (
                            <Stethoscope className="w-4 h-4" />
                          ) : staff.role === 'lab_tech' ? (
                            <FlaskConical className="w-4 h-4" />
                          ) : staff.role === 'radiology_tech' ? (
                            <Scan className="w-4 h-4" />
                          ) : (
                            <UserCheck className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 block">{staff.full_name}</span>
                          {staff.doctor_name && (
                            <span className="text-[11px] text-blue-700 block">
                              مرتبط بـ: {staff.doctor_name} ({staff.specialty_name})
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="p-3.5">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold border ${getRoleBadgeClass(
                          staff.role
                        )}`}
                      >
                        {getRoleLabel(staff.role)}
                      </span>
                    </td>

                    <td className="p-3.5 font-mono text-slate-600">
                      {staff.email || '—'}
                    </td>

                    <td className="p-3.5 font-mono text-slate-600">
                      {staff.phone || '—'}
                    </td>

                    <td className="p-3.5">
                      <button
                        onClick={() => handleToggleActive(staff)}
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold cursor-pointer transition-colors ${
                          staff.is_active
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                        title="انقر لتغيير حالة الحساب (تفعيل / تعليق)"
                      >
                        {staff.is_active ? (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                            <span>نشط ومفعل</span>
                          </>
                        ) : (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                            <span>معلّق مؤقتاً</span>
                          </>
                        )}
                      </button>
                    </td>

                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleOpenEditStaff(staff)}
                          className="p-1.5 text-teal-600 hover:text-teal-800 hover:bg-teal-50 rounded-lg cursor-pointer transition-colors"
                          title="تعديل بيانات الحساب"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        {staff.id !== 'staff-admin-01' ? (
                          <button
                            onClick={() => setAccountToDelete(staff)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                            title="حذف هذا الحساب"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-semibold px-1">
                            الرئيسي
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* Create Account Modal */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute left-4 top-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-5">
              <div className="w-12 h-12 bg-teal-50 text-teal-700 rounded-2xl mx-auto flex items-center justify-center mb-2">
                <UserPlus className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">إنشاء حساب جديد لطاقم العمل</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                تحديد الصلاحيات وربط الحساب بملف الطبيب أو موظف الاستقبال
              </p>
            </div>

            <form onSubmit={handleCreateAccount} className="space-y-4">
              {/* Role Picker */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  الدور الوظيفي والصلاحيات <span className="text-rose-600">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <button
                    type="button"
                    onClick={() => handleRoleChange('receptionist')}
                    className={`py-2 px-1 text-xs font-bold rounded-xl border cursor-pointer transition-colors text-center ${
                      newRole === 'receptionist'
                        ? 'bg-teal-50 border-teal-600 text-teal-950 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    استقبال
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRoleChange('doctor')}
                    className={`py-2 px-1 text-xs font-bold rounded-xl border cursor-pointer transition-colors text-center ${
                      newRole === 'doctor'
                        ? 'bg-blue-50 border-blue-600 text-blue-950 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    طبيب عيادة
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRoleChange('lab_tech')}
                    className={`py-2 px-1 text-xs font-bold rounded-xl border cursor-pointer transition-colors text-center ${
                      newRole === 'lab_tech'
                        ? 'bg-amber-50 border-amber-600 text-amber-950 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    فني معمل
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRoleChange('radiology_tech')}
                    className={`py-2 px-1 text-xs font-bold rounded-xl border cursor-pointer transition-colors text-center ${
                      newRole === 'radiology_tech'
                        ? 'bg-indigo-50 border-indigo-600 text-indigo-950 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    فني أشعة
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRoleChange('admin')}
                    className={`py-2 px-1 text-xs font-bold rounded-xl border cursor-pointer transition-colors text-center col-span-2 sm:col-span-1 ${
                      newRole === 'admin'
                        ? 'bg-purple-50 border-purple-600 text-purple-950 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    مدير النظام
                  </button>
                </div>
              </div>

              {/* If Doctor Role: Link to Doctor Record */}
              {newRole === 'doctor' && (
                <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3">
                  <label className="block text-xs font-bold text-blue-950 mb-1">
                    اختر ملف الطبيب المراد ربطه بهذا الحساب:
                  </label>
                  <select
                    value={selectedDoctorId}
                    onChange={e => handleSelectDoctorForAccount(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-blue-300 rounded-lg text-slate-900 focus:outline-hidden focus:border-blue-600"
                  >
                    {doctors.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.full_name} — {d.specialty_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  اسم الموظف / الطبيب الكامل <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="مثال: د. محمد سامي الألفي"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:border-teal-600 text-slate-900"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  البريد الإلكتروني المهني للدخول <span className="text-rose-600">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="name@mitali-hosp.org"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:border-teal-600 text-slate-900 font-mono"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  رقم الهاتف للتواصل
                </label>
                <input
                  type="tel"
                  value={newPhone}
                  onChange={e => setNewPhone(e.target.value)}
                  placeholder="01012345678"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:border-teal-600 text-slate-900"
                />
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    كلمة المرور المبدئية <span className="text-rose-600">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const pass = 'Hosp@' + Math.floor(1000 + Math.random() * 9000);
                      setNewPassword(pass);
                    }}
                    className="text-[11px] text-teal-700 hover:underline cursor-pointer"
                  >
                    توليد كلمة سر عشوائية
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:border-teal-600 text-slate-900 font-mono"
                />
              </div>

              {/* Actions */}
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold bg-teal-700 hover:bg-teal-800 text-white rounded-xl cursor-pointer disabled:opacity-50 shadow-sm flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSubmitting ? 'جاري الإنشاء...' : 'حفظ وإنشاء الحساب'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* Edit Staff Account Modal */}
      {/* ========================================================================= */}
      {staffToEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setStaffToEdit(null)}
              className="absolute left-4 top-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-5">
              <div className="w-12 h-12 bg-teal-50 text-teal-700 rounded-2xl mx-auto flex items-center justify-center mb-2">
                <Edit2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">تعديل بيانات حساب الموظف</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                تعديل الاسم، الدور الوظيفي، البريد، الهاتف، وتعيين كلمة سر جديدة
              </p>
            </div>

            <form onSubmit={handleSaveEditStaff} className="space-y-4">
              {/* Role Picker */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  الدور الوظيفي والصلاحيات <span className="text-rose-600">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditRole('receptionist');
                    }}
                    className={`py-2 px-1 text-xs font-bold rounded-xl border cursor-pointer transition-colors text-center ${
                      editRole === 'receptionist'
                        ? 'bg-teal-50 border-teal-600 text-teal-950 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    استقبال
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditRole('doctor');
                      if (!editDoctorId && doctors.length > 0) {
                        setEditDoctorId(doctors[0].id);
                      }
                    }}
                    className={`py-2 px-1 text-xs font-bold rounded-xl border cursor-pointer transition-colors text-center ${
                      editRole === 'doctor'
                        ? 'bg-blue-50 border-blue-600 text-blue-950 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    طبيب عيادة
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditRole('lab_tech');
                    }}
                    className={`py-2 px-1 text-xs font-bold rounded-xl border cursor-pointer transition-colors text-center ${
                      editRole === 'lab_tech'
                        ? 'bg-amber-50 border-amber-600 text-amber-950 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    فني معمل
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditRole('radiology_tech');
                    }}
                    className={`py-2 px-1 text-xs font-bold rounded-xl border cursor-pointer transition-colors text-center ${
                      editRole === 'radiology_tech'
                        ? 'bg-indigo-50 border-indigo-600 text-indigo-950 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    فني أشعة
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditRole('admin');
                    }}
                    className={`py-2 px-1 text-xs font-bold rounded-xl border cursor-pointer transition-colors text-center col-span-2 sm:col-span-1 ${
                      editRole === 'admin'
                        ? 'bg-purple-50 border-purple-600 text-purple-950 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    مدير النظام
                  </button>
                </div>
              </div>

              {/* If Doctor Role: Link to Doctor Record */}
              {editRole === 'doctor' && (
                <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3">
                  <label className="block text-xs font-bold text-blue-950 mb-1">
                    اختر ملف الطبيب المرتبط بهذا الحساب:
                  </label>
                  <select
                    value={editDoctorId}
                    onChange={e => setEditDoctorId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-blue-300 rounded-lg text-slate-900 focus:outline-hidden focus:border-blue-600"
                  >
                    <option value="">-- بدون ربط بطبيب محدد --</option>
                    {doctors.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.full_name} — {d.specialty_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  اسم الموظف / الطبيب الكامل <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  placeholder="مثال: د. محمد سامي الألفي"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:border-teal-600 text-slate-900"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  البريد الإلكتروني للدخول <span className="text-rose-600">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={e => setEditEmail(e.target.value)}
                  placeholder="name@mitali-hosp.org"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:border-teal-600 text-slate-900 font-mono"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  رقم الهاتف للتواصل
                </label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={e => setEditPhone(e.target.value)}
                  placeholder="01012345678"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:border-teal-600 text-slate-900 font-mono"
                />
              </div>

              {/* Optional Password Reset */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    تغيير كلمة المرور (اختياري)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const pass = 'Hosp@' + Math.floor(1000 + Math.random() * 9000);
                      setEditPassword(pass);
                    }}
                    className="text-[11px] text-teal-700 hover:underline cursor-pointer"
                  >
                    توليد كلمة سر جديدة
                  </button>
                </div>
                <input
                  type="text"
                  value={editPassword}
                  onChange={e => setEditPassword(e.target.value)}
                  placeholder="اترك هذا الحقل فارغاً إذا كنت لا ترغب بتغيير كلمة المرور"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:border-teal-600 text-slate-900 font-mono"
                />
              </div>

              {/* Account Active Status Toggle */}
              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">حالة الحساب</span>
                  <span className="text-[11px] text-slate-500">تمكين أو تعطيل دخول هذا المستخدم للنظام</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editIsActive}
                    onChange={e => setEditIsActive(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {/* Actions */}
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStaffToEdit(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold bg-teal-700 hover:bg-teal-800 text-white rounded-xl cursor-pointer disabled:opacity-50 shadow-sm flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSubmitting ? 'جاري الحفظ...' : 'حفظ التعديلات'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {accountToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-2xl relative">
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl mx-auto flex items-center justify-center mb-2">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">تأكيد حذف حساب الموظف</h3>
              <p className="text-xs text-slate-600 mt-2">
                هل أنت متأكد من رغبتك في حذف حساب <span className="font-bold text-slate-900">"{accountToDelete.full_name}"</span>؟ لن يتمكن من تسجيل الدخول إلى النظام بعد الآن.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => setAccountToDelete(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                تراجع
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                className="px-5 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl cursor-pointer"
              >
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
