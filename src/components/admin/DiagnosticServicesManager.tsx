import React, { useState, useEffect } from 'react';
import {
  FlaskConical,
  Scan,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Banknote,
  FileText,
  Filter,
  Sparkles,
  HelpCircle,
  X
} from 'lucide-react';
import { DiagnosticService } from '../../types';
import {
  getAllDiagnosticServices,
  createDiagnosticService,
  updateDiagnosticService,
  deleteDiagnosticService
} from '../../lib/databaseService';

export const DiagnosticServicesManager: React.FC = () => {
  const [services, setServices] = useState<DiagnosticService[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'lab' | 'radiology'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingService, setEditingService] = useState<DiagnosticService | null>(null);
  const [serviceToDelete, setServiceToDelete] = useState<DiagnosticService | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    latin_name: '',
    type: 'lab' as 'lab' | 'radiology',
    category: '',
    price: 40,
    estimated_duration: 'نفس اليوم (خلال ساعتين)',
    preparation: 'لا يشترط الصيام',
    description: '',
    is_active: true,
  });

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = () => {
    try {
      const data = getAllDiagnosticServices();
      setServices(data);
    } catch (e) {
      console.error('Failed to load diagnostic services', e);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleOpenAdd = () => {
    setFormData({
      name: '',
      latin_name: '',
      type: typeFilter === 'radiology' ? 'radiology' : 'lab',
      category: typeFilter === 'radiology' ? 'أشعة عادية' : 'كيمياء الدم',
      price: 50,
      estimated_duration: 'نفس اليوم',
      preparation: 'لا يشترط تحضير خاص',
      description: '',
      is_active: true,
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (svc: DiagnosticService) => {
    setEditingService(svc);
    setFormData({
      name: svc.name,
      latin_name: svc.latin_name || '',
      type: (svc.type || svc.service_type || 'lab') as 'lab' | 'radiology',
      category: svc.category || '',
      price: svc.price,
      estimated_duration: svc.estimated_duration || 'نفس اليوم',
      preparation: svc.preparation || svc.preparation_instructions || '',
      description: svc.description || '',
      is_active: svc.is_active !== undefined ? svc.is_active : (svc.is_available ?? true),
    });
  };

  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      createDiagnosticService({
        name: formData.name.trim(),
        latin_name: formData.latin_name.trim() || undefined,
        type: formData.type,
        category: formData.category.trim() || (formData.type === 'lab' ? 'تحاليل عامة' : 'أشعة عامة'),
        price: Number(formData.price) || 0,
        estimated_duration: formData.estimated_duration.trim() || 'نفس اليوم',
        preparation: formData.preparation.trim() || 'لا يشترط تحضير مسبق',
        description: formData.description.trim() || undefined,
        is_active: formData.is_active,
      });
      loadServices();
      setIsAddModalOpen(false);
      showToast('تمت إضافة الخدمة التشخيصية بنجاح وتحديث الأسعار للموقع والاستقبال');
    } catch {
      showToast('حدث خطأ أثناء إضافة الخدمة', 'error');
    }
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService || !formData.name.trim()) return;

    try {
      updateDiagnosticService(editingService.id, {
        name: formData.name.trim(),
        latin_name: formData.latin_name.trim() || undefined,
        type: formData.type,
        category: formData.category.trim() || undefined,
        price: Number(formData.price) || 0,
        estimated_duration: formData.estimated_duration.trim() || undefined,
        preparation: formData.preparation.trim() || undefined,
        description: formData.description.trim() || undefined,
        is_active: formData.is_active,
      });
      loadServices();
      setEditingService(null);
      showToast('تم تحديث بيانات وسعر الفحص بنجاح');
    } catch {
      showToast('حدث خطأ أثناء التحديث', 'error');
    }
  };

  const handleToggleActive = (svc: DiagnosticService) => {
    try {
      updateDiagnosticService(svc.id, { is_active: !svc.is_active });
      loadServices();
      showToast(
        !svc.is_active
          ? `تم تفعيل فحص "${svc.name}" وإتاحته للمرضى`
          : `تم إيقاف فحص "${svc.name}" مؤقتاً`
      );
    } catch {
      showToast('فشل تعديل حالة الخدمة', 'error');
    }
  };

  const handleDelete = () => {
    if (!serviceToDelete) return;
    try {
      deleteDiagnosticService(serviceToDelete.id);
      loadServices();
      setServiceToDelete(null);
      showToast('تم حذف الفحص من قائمة الخدمات بنجاح');
    } catch {
      showToast('فشل حذف الفحص', 'error');
    }
  };

  // Filtered services
  const filteredServices = services.filter(svc => {
    const matchesType = typeFilter === 'all' || svc.type === typeFilter;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && svc.is_active) ||
      (statusFilter === 'inactive' && !svc.is_active);

    const term = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !term ||
      svc.name.toLowerCase().includes(term) ||
      (svc.latin_name && svc.latin_name.toLowerCase().includes(term)) ||
      (svc.category && svc.category.toLowerCase().includes(term)) ||
      (svc.preparation && svc.preparation.toLowerCase().includes(term));

    return matchesType && matchesStatus && matchesSearch;
  });

  // Stats
  const totalCount = services.length;
  const labCount = services.filter(s => s.type === 'lab').length;
  const radCount = services.filter(s => s.type === 'radiology').length;
  const activeCount = services.filter(s => s.is_active).length;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 animate-bounce">
          <div
            className={`px-4 py-2.5 rounded-xl shadow-lg border text-sm font-bold flex items-center gap-2 ${
              toastMessage.type === 'success'
                ? 'bg-emerald-600 text-white border-emerald-500'
                : 'bg-rose-600 text-white border-rose-500'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Header & Description */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl border border-amber-200/60">
                <FlaskConical className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  إدارة خدمات وأسعار المعمل والأشعة
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  تحديد قائمة التحاليل والفحوصات، تسعيرها الخيري، مدة النتائج وشروط الصيام والتحضير (تنعكس فوراً على الموقع والاستقبال)
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold text-xs shadow-xs transition-colors cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة فحص / تحليل جديد</span>
          </button>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-slate-100">
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <span className="text-[11px] font-semibold text-slate-500 block">إجمالي الفحوصات والتحاليل</span>
            <span className="text-xl font-extrabold text-slate-900 mt-0.5 block">{totalCount}</span>
          </div>
          <div className="bg-amber-50/60 rounded-xl p-3 border border-amber-100/70">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-amber-800 block">تحاليل المعمل الطبي</span>
              <FlaskConical className="w-4 h-4 text-amber-600" />
            </div>
            <span className="text-xl font-extrabold text-amber-950 mt-0.5 block">{labCount}</span>
          </div>
          <div className="bg-indigo-50/60 rounded-xl p-3 border border-indigo-100/70">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-indigo-800 block">فحوصات الأشعة والسونار</span>
              <Scan className="w-4 h-4 text-indigo-600" />
            </div>
            <span className="text-xl font-extrabold text-indigo-950 mt-0.5 block">{radCount}</span>
          </div>
          <div className="bg-emerald-50/60 rounded-xl p-3 border border-emerald-100/70">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-emerald-800 block">الفحوصات المتاحة للجمهور</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <span className="text-xl font-extrabold text-emerald-950 mt-0.5 block">{activeCount}</span>
          </div>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Type Filter Buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl border border-slate-200/60 overflow-x-auto">
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0 ${
              typeFilter === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            كل الفحوصات ({totalCount})
          </button>
          <button
            onClick={() => setTypeFilter('lab')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0 ${
              typeFilter === 'lab'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-amber-800'
            }`}
          >
            <FlaskConical className="w-3.5 h-3.5" />
            <span>معمل التحاليل ({labCount})</span>
          </button>
          <button
            onClick={() => setTypeFilter('radiology')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0 ${
              typeFilter === 'radiology'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-indigo-800'
            }`}
          >
            <Scan className="w-3.5 h-3.5" />
            <span>قسم الأشعة ({radCount})</span>
          </button>
        </div>

        {/* Search & Status Filter */}
        <div className="flex items-center gap-2 flex-1 md:max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="ابحث باسم التحليل، الفحص، أو شروط التحضير..."
              className="w-full pl-3 pr-9 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-teal-600 focus:bg-white text-slate-900 transition-colors"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="px-2.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-hidden focus:border-teal-600 cursor-pointer"
          >
            <option value="all">كل الحالات</option>
            <option value="active">متاح فقط</option>
            <option value="inactive">موقوف مؤقتاً</option>
          </select>
        </div>
      </div>

      {/* Services Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">جاري تحميل قائمة الخدمات...</div>
        ) : filteredServices.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <AlertCircle className="w-8 h-8 mx-auto text-slate-300" />
            <p className="text-sm font-semibold text-slate-600">لا توجد تحاليل أو فحوصات تطابق بحثك</p>
            <p className="text-xs text-slate-400">يمكنك تعديل كلمات البحث أو إضافة فحص جديد بالضغط على الزر أعلاه</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-200/80">
                <tr>
                  <th className="p-3.5">اسم الفحص / التحليل</th>
                  <th className="p-3.5">القسم والتصنيف</th>
                  <th className="p-3.5">السعر الخيري</th>
                  <th className="p-3.5">مدة ظهور النتيجة</th>
                  <th className="p-3.5">شروط الفحص والتحضير</th>
                  <th className="p-3.5">حالة التوفر</th>
                  <th className="p-3.5 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredServices.map(svc => (
                  <tr key={svc.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Name & Latin */}
                    <td className="p-3.5">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                            svc.type === 'lab'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-indigo-100 text-indigo-700'
                          }`}
                        >
                          {svc.type === 'lab' ? (
                            <FlaskConical className="w-4 h-4" />
                          ) : (
                            <Scan className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 block">{svc.name}</span>
                          {svc.latin_name && (
                            <span className="text-[11px] font-mono text-slate-400 block" dir="ltr">
                              {svc.latin_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Department & Category */}
                    <td className="p-3.5">
                      <div className="space-y-0.5">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            svc.type === 'lab'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200/60'
                              : 'bg-indigo-50 text-indigo-800 border border-indigo-200/60'
                          }`}
                        >
                          {svc.type === 'lab' ? 'معمل تحاليل' : 'قسم أشعة'}
                        </span>
                        {svc.category && (
                          <span className="text-[11px] text-slate-500 block">{svc.category}</span>
                        )}
                      </div>
                    </td>

                    {/* Price */}
                    <td className="p-3.5">
                      <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-extrabold border border-emerald-200/60">
                        <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{svc.price} ج.م</span>
                      </div>
                    </td>

                    {/* Turnaround Time */}
                    <td className="p-3.5">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{svc.estimated_duration || 'نفس اليوم'}</span>
                      </div>
                    </td>

                    {/* Preparation Instructions */}
                    <td className="p-3.5 max-w-xs">
                      <div className="text-[11px] text-slate-600 line-clamp-2" title={svc.preparation}>
                        {svc.preparation || 'لا يشترط تحضير خاص'}
                      </div>
                    </td>

                    {/* Active Toggle */}
                    <td className="p-3.5">
                      <button
                        onClick={() => handleToggleActive(svc)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold cursor-pointer transition-colors border ${
                          svc.is_active
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                        }`}
                        title="انقر لتغيير حالة توفر الخدمة"
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            svc.is_active ? 'bg-emerald-600' : 'bg-rose-500'
                          }`}
                        ></span>
                        <span>{svc.is_active ? 'متاح للطلب' : 'موقوف مؤقتاً'}</span>
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(svc)}
                          className="p-1.5 text-slate-500 hover:text-teal-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          title="تعديل السعر أو البيانات"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setServiceToDelete(svc)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="حذف الفحص"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add New Service Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-teal-50 text-teal-600 rounded-lg">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">إضافة فحص أو تحليل طبي جديد</h3>
                  <p className="text-[11px] text-slate-400">سيظهر فوراً للمرضى في الموقع وفي شاشة موظفي الاستقبال</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAdd} className="space-y-3.5">
              {/* Type Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  القسم المختص <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'lab' })}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                      formData.type === 'lab'
                        ? 'bg-amber-50 text-amber-900 border-amber-500 shadow-xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <FlaskConical className="w-4 h-4 text-amber-600" />
                    <span>معمل التحاليل الطبية</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'radiology' })}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                      formData.type === 'radiology'
                        ? 'bg-indigo-50 text-indigo-900 border-indigo-500 shadow-xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Scan className="w-4 h-4 text-indigo-600" />
                    <span>قسم الأشعة والتصوير</span>
                  </button>
                </div>
              </div>

              {/* Name (Arabic) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  اسم الفحص أو التحليل بالعربية <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder={formData.type === 'lab' ? 'مثال: صورة دم كاملة (CBC)' : 'مثال: أشعة سينية على الصدر (X-Ray)'}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-teal-600 text-slate-900"
                />
              </div>

              {/* Latin / English Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الاسم باللغة الإنجليزية / المصطلح الطبي (اختياري)
                </label>
                <input
                  type="text"
                  value={formData.latin_name}
                  onChange={e => setFormData({ ...formData, latin_name: e.target.value })}
                  placeholder="Complete Blood Count / Chest X-Ray"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-teal-600 text-slate-900 font-mono"
                  dir="ltr"
                />
              </div>

              {/* Category & Price */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    التصنيف الفرعي
                  </label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    placeholder={formData.type === 'lab' ? 'أمراض دم، وظائف كبد، هرمونات' : 'أشعة عادية، سونار، إيكو'}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-teal-600 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    السعر الخيري الموحد (ج.م) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="5"
                    required
                    value={formData.price}
                    onChange={e => setFormData({ ...formData, price: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-teal-600 text-slate-900 font-mono"
                  />
                </div>
              </div>

              {/* Turnaround Duration & Preparation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    موعد استلام النتيجة
                  </label>
                  <input
                    type="text"
                    value={formData.estimated_duration}
                    onChange={e => setFormData({ ...formData, estimated_duration: e.target.value })}
                    placeholder="مثال: نفس اليوم (ساعتان) أو 24 ساعة"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-teal-600 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    شروط التحضير والصيام
                  </label>
                  <input
                    type="text"
                    value={formData.preparation}
                    onChange={e => setFormData({ ...formData, preparation: e.target.value })}
                    placeholder="مثال: صيام من 8 إلى 12 ساعة / لا يشترط"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-teal-600 text-slate-900"
                  />
                </div>
              </div>

              {/* Brief Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ملاحظات أو نبذة طبية (اختياري)
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="ملاحظات تظهر للمريض أو لفني القسم..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-teal-600 text-slate-900"
                ></textarea>
              </div>

              {/* Active Status Toggle */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="add-is-active"
                  checked={formData.is_active}
                  onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded-sm border-slate-300 text-teal-600 focus:ring-teal-500 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="add-is-active" className="text-xs font-bold text-slate-700 cursor-pointer">
                  متاح فوراً للطلب (جاهز بالمعمل / مركز الأشعة)
                </label>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  حفظ وإتاحة الفحص
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Service Modal */}
      {editingService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">تعديل بيانات وسعر الفحص</h3>
                  <p className="text-[11px] text-slate-400">تعديل التسعير أو شروط التحضير أو وقت ظهور النتيجة</p>
                </div>
              </div>
              <button
                onClick={() => setEditingService(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5">
              {/* Type Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  القسم المختص <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'lab' })}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                      formData.type === 'lab'
                        ? 'bg-amber-50 text-amber-900 border-amber-500 shadow-xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <FlaskConical className="w-4 h-4 text-amber-600" />
                    <span>معمل التحاليل الطبية</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'radiology' })}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                      formData.type === 'radiology'
                        ? 'bg-indigo-50 text-indigo-900 border-indigo-500 shadow-xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Scan className="w-4 h-4 text-indigo-600" />
                    <span>قسم الأشعة والتصوير</span>
                  </button>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  اسم الفحص أو التحليل بالعربية <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-teal-600 text-slate-900"
                />
              </div>

              {/* Latin Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الاسم باللغة الإنجليزية / المصطلح الطبي
                </label>
                <input
                  type="text"
                  value={formData.latin_name}
                  onChange={e => setFormData({ ...formData, latin_name: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-teal-600 text-slate-900 font-mono"
                  dir="ltr"
                />
              </div>

              {/* Category & Price */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    التصنيف الفرعي
                  </label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-teal-600 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    السعر الخيري (ج.م) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="5"
                    required
                    value={formData.price}
                    onChange={e => setFormData({ ...formData, price: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-teal-600 text-slate-900 font-mono font-bold"
                  />
                </div>
              </div>

              {/* Turnaround Duration & Preparation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    موعد استلام النتيجة
                  </label>
                  <input
                    type="text"
                    value={formData.estimated_duration}
                    onChange={e => setFormData({ ...formData, estimated_duration: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-teal-600 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    شروط التحضير والصيام
                  </label>
                  <input
                    type="text"
                    value={formData.preparation}
                    onChange={e => setFormData({ ...formData, preparation: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-teal-600 text-slate-900"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ملاحظات أو نبذة طبية
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-teal-600 text-slate-900"
                ></textarea>
              </div>

              {/* Active Status */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="edit-is-active"
                  checked={formData.is_active}
                  onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                  className="rounded-sm border-slate-300 text-teal-600 focus:ring-teal-500 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="edit-is-active" className="text-xs font-bold text-slate-700 cursor-pointer">
                  متاح حالياً (غير موقوف)
                </label>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingService(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  حفظ التعديلات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {serviceToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-sm w-full p-5 space-y-3">
            <div className="p-3 bg-rose-50 text-rose-600 rounded-xl w-fit">
              <Trash2 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">تأكيد حذف الفحص من النظام؟</h3>
            <p className="text-xs text-slate-600">
              هل أنت متأكد من رغبتك في حذف <strong className="text-slate-900">"{serviceToDelete.name}"</strong> نهائياً؟ يمكنك إيقافه مؤقتاً بدلاً من حذفه إذا كان هناك نقص في المواد فقط.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setServiceToDelete(null)}
                className="px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                تراجع
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition-colors cursor-pointer"
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
