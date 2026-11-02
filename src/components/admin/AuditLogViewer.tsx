import React, { useState, useEffect, useMemo } from 'react';
import { AuditLog } from '../../types';
import { dbService } from '../../lib/databaseService';
import { useAuth } from '../../context/AuthContext';
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  Clock,
  User,
  RefreshCw,
  Search,
  Eye,
  CheckCircle2,
  AlertCircle,
  FileText,
  Calendar,
  Activity,
  X,
  Stethoscope,
  Users,
  Building2,
  Trash2,
  Edit3,
  UserCheck,
  DollarSign,
  ChevronLeft,
  Filter,
} from 'lucide-react';

export const AuditLogViewer: React.FC = () => {
  const { isAdmin } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [showJsonRaw, setShowJsonRaw] = useState<boolean>(false);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const data = await dbService.getAuditLogs();
      setLogs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Stats calculation
  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayLogs = logs.filter(l => l.created_at && l.created_at.startsWith(todayStr));
    const patientAndVisitLogs = logs.filter(
      l => l.action.includes('PATIENT') || l.action.includes('VISIT')
    );
    const doctorAndClinicLogs = logs.filter(
      l =>
        l.action.includes('DOCTOR') ||
        l.action.includes('SPECIALTY') ||
        l.action.includes('ATTENDANCE')
    );
    const criticalLogs = logs.filter(
      l =>
        l.action.includes('DELETE') ||
        l.action.includes('CANCEL') ||
        l.action === 'UPDATE_DOCTOR'
    );

    return {
      total: logs.length,
      today: todayLogs.length,
      patientVisits: patientAndVisitLogs.length,
      doctorClinic: doctorAndClinicLogs.length,
      critical: criticalLogs.length,
    };
  }, [logs]);

  // Human readable description helper
  const getLogSummary = (log: AuditLog): { title: string; subtitle: string; icon: React.ReactNode; color: string } => {
    const n = log.new_data || {};
    const o = log.old_data || {};

    switch (log.action) {
      case 'UPDATE_ATTENDANCE': {
        const docName = n.doctor || 'طبيب';
        const statusMap: Record<string, string> = {
          present: 'حاضر بالعيادة',
          delayed: n.delay_time ? `متأخر (متوقع ${n.delay_time})` : 'متأخر',
          apologized: 'معتذر اليوم',
          unconfirmed: 'غير مؤكد حتى الآن',
        };
        const statusText = statusMap[n.status] || n.status || 'تحديث الحضور';
        return {
          title: `تحديث حضور: ${docName}`,
          subtitle: `تم تغيير حالة الحضور إلى: "${statusText}"`,
          icon: <UserCheck className="w-4 h-4" />,
          color: 'teal',
        };
      }
      case 'CREATE_PATIENT': {
        const patientName = n.full_name || 'مريض جديد';
        const pNum = n.patient_number ? ` (كود: ${n.patient_number})` : '';
        return {
          title: `فتح ملف مريض جديد`,
          subtitle: `تسجيل المريض: ${patientName}${pNum}`,
          icon: <Users className="w-4 h-4" />,
          color: 'purple',
        };
      }
      case 'REGISTER_VISIT': {
        const patient = n.patient_name || n.patient_id ? `المريض [${n.patient_name || n.patient_id}]` : 'مريض';
        const doc = n.doctor ? `لدى ${n.doctor}` : '';
        const spec = n.specialty ? ` (${n.specialty})` : '';
        return {
          title: `تسجيل تذكرة كشف جديدة`,
          subtitle: `حجز تذكرة كشف لـ ${patient} ${doc}${spec}`,
          icon: <FileText className="w-4 h-4" />,
          color: 'blue',
        };
      }
      case 'UPDATE_VISIT_STATUS': {
        const statusMap: Record<string, string> = {
          attended: 'تم الحضور بالعيادة',
          completed: 'اكتمل الكشف الطبي',
          cancelled: n.cancellation_reason ? `ملغي: ${n.cancellation_reason}` : 'ملغي',
          registered: 'مسجل بالانتظار',
        };
        const statusText = statusMap[n.status] || n.status;
        return {
          title: `تغيير حالة كشف`,
          subtitle: `تم تحويل المسار إلى: "${statusText}"`,
          icon: <Activity className="w-4 h-4" />,
          color: n.status === 'cancelled' ? 'rose' : 'amber',
        };
      }
      case 'CREATE_DOCTOR': {
        const docName = n.full_name || 'طبيب جديد';
        const docTitle = n.title ? ` (${n.title})` : '';
        return {
          title: `إضافة طبيب جديد للمنظومة`,
          subtitle: `تم تسجيل ${docName}${docTitle} بنجاح`,
          icon: <Stethoscope className="w-4 h-4" />,
          color: 'emerald',
        };
      }
      case 'UPDATE_DOCTOR': {
        const docName = n.full_name || o.full_name || 'طبيب';
        let detail = `تعديل بيانات الطبيب: ${docName}`;
        if (o.consultation_fee && n.consultation_fee && o.consultation_fee !== n.consultation_fee) {
          detail += ` (تعديل سعر الكشف: ${o.consultation_fee} ⬅️ ${n.consultation_fee} ج.م)`;
        }
        return {
          title: `تعديل بيانات طبيب`,
          subtitle: detail,
          icon: <Edit3 className="w-4 h-4" />,
          color: 'amber',
        };
      }
      case 'DELETE_DOCTOR': {
        const docName = o.full_name || 'طبيب';
        return {
          title: `حذف طبيب من النظام`,
          subtitle: `تم حذف ملف الطبيب: ${docName}`,
          icon: <Trash2 className="w-4 h-4" />,
          color: 'rose',
        };
      }
      case 'CREATE_SPECIALTY': {
        const name = n.name || 'تخصص وعيادة';
        return {
          title: `إنشاء عيادة / تخصص جديد`,
          subtitle: `تم إضافة قسم: ${name}`,
          icon: <Building2 className="w-4 h-4" />,
          color: 'indigo',
        };
      }
      case 'DELETE_SPECIALTY': {
        return {
          title: `حذف عيادة / تخصص`,
          subtitle: `تم حذف قسم أو إلغاء تفعيله من النظام`,
          icon: <Trash2 className="w-4 h-4" />,
          color: 'rose',
        };
      }
      default:
        return {
          title: log.action,
          subtitle: `عملية إجرائية على جدول [${log.entity_name}]`,
          icon: <ShieldCheck className="w-4 h-4" />,
          color: 'slate',
        };
    }
  };

  // Filter and search logic
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Category filter
      if (filterCategory === 'today') {
        const todayStr = new Date().toISOString().split('T')[0];
        if (!log.created_at || !log.created_at.startsWith(todayStr)) return false;
      } else if (filterCategory === 'attendance' && log.action !== 'UPDATE_ATTENDANCE') {
        return false;
      } else if (
        filterCategory === 'patients' &&
        !log.action.includes('PATIENT') &&
        !log.action.includes('VISIT')
      ) {
        return false;
      } else if (
        filterCategory === 'doctors' &&
        !log.action.includes('DOCTOR') &&
        !log.action.includes('SPECIALTY')
      ) {
        return false;
      } else if (filterCategory === 'critical') {
        const isCrit =
          log.action.includes('DELETE') ||
          log.action.includes('CANCEL') ||
          log.action === 'UPDATE_DOCTOR' ||
          (log.new_data && log.new_data.status === 'cancelled');
        if (!isCrit) return false;
      }

      // Search query filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const staffMatch = log.staff_name?.toLowerCase().includes(q);
      const actionMatch = log.action.toLowerCase().includes(q);
      const entityMatch = log.entity_name.toLowerCase().includes(q);
      const jsonMatch =
        JSON.stringify(log.new_data || {}).toLowerCase().includes(q) ||
        JSON.stringify(log.old_data || {}).toLowerCase().includes(q);

      return staffMatch || actionMatch || entityMatch || jsonMatch;
    });
  }, [logs, filterCategory, searchQuery]);

  if (!isAdmin) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center max-w-lg mx-auto my-12 shadow-sm">
        <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl mx-auto flex items-center justify-center mb-4 border border-rose-100">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-slate-900 mb-1.5">
          سجل التدقيق مقصور على مديري النظام فقط (Admin)
        </h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          بموجب سياسات RLS وقواعد حماية البيانات الطبية، لا يحق لموظفي الاستقبال الاطلاع على سجلات الحركات الشاملة.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Header with clean branding and refresh */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">سجل التدقيق والرقابة الإدارية (Audit Trail)</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            توثيق فوري ومحمي لكل حركة داخل النظام يوضح هوية الموظف والوقت وتفاصيل التغيير.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            سجل موثق غير قابل للتعديل أو المسح
          </span>

          <button
            onClick={fetchLogs}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer border border-slate-200 disabled:opacity-50"
            title="تحديث السجل"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>تحديث البيانات</span>
          </button>
        </div>
      </div>

      {/* 2. Executive KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-500 font-medium">إجمالي الحركات</div>
            <div className="text-xl font-bold text-slate-900 font-mono tabular-nums">{stats.total}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-500 font-medium">حركات اليوم</div>
            <div className="text-xl font-bold text-teal-700 font-mono tabular-nums">{stats.today}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-500 font-medium">المرضى والكشوفات</div>
            <div className="text-xl font-bold text-purple-700 font-mono tabular-nums">{stats.patientVisits}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-500 font-medium">حركات حرجة/تعديل</div>
            <div className="text-xl font-bold text-rose-700 font-mono tabular-nums">{stats.critical}</div>
          </div>
        </div>
      </div>

      {/* 3. Filter Toolbar & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="ابحث باسم الموظف، المريض، الطبيب، أو نوع الحركة..."
              className="w-full pr-9 pl-4 py-2 text-xs bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-xl outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all text-slate-800"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="text-xs text-slate-500 font-mono tabular-nums text-left sm:text-right">
            عرض <strong className="text-slate-800">{filteredLogs.length}</strong> من أصل {logs.length} حركة
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          {[
            { id: 'all', label: 'كافة الحركات' },
            { id: 'today', label: 'حركات اليوم' },
            { id: 'attendance', label: 'حضور الأطباء' },
            { id: 'patients', label: 'المرضى والكشوفات' },
            { id: 'doctors', label: 'الأطباء والعيادات' },
            { id: 'critical', label: 'حركات حرجة وتعديل' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterCategory(tab.id)}
              className={`px-3 py-1.5 font-semibold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                filterCategory === tab.id
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Desktop Audit Log Table */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-bold">
                <th className="py-3.5 px-4 w-48">العملية والنوع</th>
                <th className="py-3.5 px-4">تفاصيل الحركة الإدارية</th>
                <th className="py-3.5 px-4 w-44">الموظف القائم بالإجراء</th>
                <th className="py-3.5 px-4 w-36">التوقيت والتاريخ</th>
                <th className="py-3.5 px-4 w-28 text-center">الإجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400">
                    <div className="w-10 h-10 rounded-full bg-slate-100 mx-auto flex items-center justify-center text-slate-400 mb-2">
                      <Search className="w-5 h-5" />
                    </div>
                    {isLoading ? 'جاري تحميل السجلات الموثقة...' : 'لا توجد حركات مطابقة لبحثك أو التصفية الحالية'}
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => {
                  const summary = getLogSummary(log);
                  const isCritical =
                    log.action.includes('DELETE') ||
                    log.action.includes('CANCEL') ||
                    log.action === 'UPDATE_DOCTOR';

                  const badgeColorClass =
                    summary.color === 'teal'
                      ? 'bg-teal-50 text-teal-700 border-teal-200'
                      : summary.color === 'purple'
                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                      : summary.color === 'blue'
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : summary.color === 'rose'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : summary.color === 'amber'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : summary.color === 'emerald'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-slate-100 text-slate-700 border-slate-200';

                  return (
                    <tr
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                        isCritical ? 'bg-amber-50/20' : ''
                      }`}
                    >
                      {/* Action Category Badge */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold text-[11px] border ${badgeColorClass}`}
                          >
                            {summary.icon}
                            {summary.title}
                          </span>
                        </div>
                      </td>

                      {/* Human-readable Summary */}
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-800 leading-snug">
                          {summary.subtitle}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2">
                          <span className="font-mono">الكيان: {log.entity_name}</span>
                          {log.ip_address && (
                            <span className="font-mono">IP: {log.ip_address}</span>
                          )}
                        </div>
                      </td>

                      {/* Staff Name & Role */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-[10px]">
                            {log.staff_name ? log.staff_name.charAt(0) : 'م'}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-900 block leading-tight text-xs">
                              {log.staff_name || 'موظف النظام'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Date & Time */}
                      <td className="py-3 px-4 whitespace-nowrap text-slate-600 text-[11px]">
                        <div className="font-medium text-slate-800">
                          {new Date(log.created_at).toLocaleTimeString('ar-EG', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono tabular-nums">
                          {new Date(log.created_at).toLocaleDateString('ar-EG', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                      </td>

                      {/* Details button */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            setSelectedLog(log);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-teal-700 font-semibold border border-slate-200 text-xs inline-flex items-center gap-1 shadow-2xs transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>التفاصيل</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Mobile Clean Activity Stream / Cards */}
      <div className="block md:hidden space-y-3">
        {filteredLogs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-400">
            {isLoading ? 'جاري تحميل السجلات الموثقة...' : 'لا توجد حركات مطابقة لبحثك'}
          </div>
        ) : (
          filteredLogs.map(log => {
            const summary = getLogSummary(log);
            return (
              <div
                key={log.id}
                onClick={() => setSelectedLog(log)}
                className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs space-y-2.5 text-xs cursor-pointer active:scale-[0.99] transition-transform"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900">
                    <span className="text-teal-700">{summary.icon}</span>
                    <span>{summary.title}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono tabular-nums">
                    {new Date(log.created_at).toLocaleTimeString('ar-EG', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                <div className="text-slate-800 font-medium text-xs leading-relaxed">
                  {summary.subtitle}
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 bg-slate-50 p-2 rounded-xl">
                  <div>
                    <span className="text-slate-400 block text-[10px]">المسؤول:</span>
                    <span className="font-semibold text-slate-800">{log.staff_name || 'موظف النظام'}</span>
                  </div>
                  <div className="text-left font-mono text-[10px] text-slate-400">
                    {new Date(log.created_at).toLocaleDateString('ar-EG')}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 6. Interactive Audit Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="bg-white w-full max-w-xl rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">تفاصيل حركة التدقيق الأمني</h3>
                  <p className="text-[11px] text-slate-400 font-mono">المعرف: {selectedLog.id}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedLog(null);
                  setShowJsonRaw(false);
                }}
                className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto text-xs">
              {/* Event Overview Card */}
              <div className="bg-teal-50/60 border border-teal-100 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 font-bold text-teal-900 text-sm">
                  {getLogSummary(selectedLog).icon}
                  <span>{getLogSummary(selectedLog).title}</span>
                </div>
                <p className="text-slate-700 leading-relaxed font-medium">
                  {getLogSummary(selectedLog).subtitle}
                </p>
              </div>

              {/* Key Metadata Grid */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-[11px] text-slate-400 block mb-0.5">الموظف القائم بالإجراء:</span>
                  <span className="font-semibold text-slate-900 text-xs">
                    {selectedLog.staff_name || 'موظف النظام'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block mb-0.5">التاريخ والوقت بالثانية:</span>
                  <span className="font-mono text-slate-800 text-xs font-semibold tabular-nums">
                    {new Date(selectedLog.created_at).toLocaleString('ar-EG', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block mb-0.5">الجدول / الكيان:</span>
                  <span className="font-mono text-teal-800 font-semibold">{selectedLog.entity_name}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block mb-0.5">عنوان IP المسجل:</span>
                  <span className="font-mono text-slate-700">{selectedLog.ip_address || '127.0.0.1 (داخلي)'}</span>
                </div>
              </div>

              {/* Data Diff (Old vs New) */}
              {(selectedLog.old_data || selectedLog.new_data) && (
                <div className="space-y-2">
                  <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    <span>مقارنة التغييرات المسجلة</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Old Data */}
                    <div className="bg-rose-50/50 border border-rose-100 rounded-xl p-3">
                      <div className="text-[11px] font-bold text-rose-800 mb-1.5 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                        <span>البيانات السابقة (قبل التعديل)</span>
                      </div>
                      {selectedLog.old_data ? (
                        <div className="space-y-1 font-mono text-[11px] text-rose-950">
                          {Object.entries(selectedLog.old_data).map(([key, val]) => (
                            <div key={key} className="flex justify-between border-b border-rose-100/60 pb-0.5">
                              <span className="text-rose-700">{key}:</span>
                              <span className="font-semibold">{String(val)}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">لا توجد بيانات سابقة (إنشاء جديد)</span>
                      )}
                    </div>

                    {/* New Data */}
                    <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-3">
                      <div className="text-[11px] font-bold text-emerald-800 mb-1.5 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>البيانات الحالية (بعد التعديل)</span>
                      </div>
                      {selectedLog.new_data ? (
                        <div className="space-y-1 font-mono text-[11px] text-emerald-950">
                          {Object.entries(selectedLog.new_data).map(([key, val]) => (
                            <div key={key} className="flex justify-between border-b border-emerald-100/60 pb-0.5">
                              <span className="text-emerald-700">{key}:</span>
                              <span className="font-semibold">{String(val)}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">لا توجد بيانات حالية (حذف)</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Technical JSON Toggle */}
              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowJsonRaw(!showJsonRaw)}
                  className="text-[11px] text-slate-500 hover:text-slate-800 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Lock className="w-3 h-3 text-slate-400" />
                  <span>{showJsonRaw ? 'إخفاء كود الـ JSON التقني' : 'عرض كود التدقيق التقني الخام (JSON للمبرمجين)'}</span>
                </button>

                {showJsonRaw && (
                  <div className="mt-2 bg-slate-900 text-emerald-400 p-3 rounded-xl font-mono text-[10px] overflow-x-auto max-h-40 border border-slate-800">
                    <pre>{JSON.stringify(selectedLog, null, 2)}</pre>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">سجل غير قابل للتعديل أو الحذف</span>
              <button
                type="button"
                onClick={() => {
                  setSelectedLog(null);
                  setShowJsonRaw(false);
                }}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                إغلاق النافذة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
