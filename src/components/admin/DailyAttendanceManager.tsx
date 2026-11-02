import React, { useState } from 'react';
import { DoctorDailyAttendance, AttendanceStatus } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  CheckCircle2,
  AlertCircle,
  Clock4,
  XCircle,
  Lock,
  Edit3,
  Calendar,
  Save,
  Clock,
  User,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Search,
  X,
  RotateCcw,
} from 'lucide-react';

interface DailyAttendanceManagerProps {
  attendanceList: DoctorDailyAttendance[];
  selectedDate: string;
  onDateChange: (date: string) => void;
  onUpdateAttendance: (
    doctorId: string,
    status: AttendanceStatus,
    delayTime?: string | null,
    internalNotes?: string | null
  ) => Promise<void>;
  isLoading: boolean;
}

export const DailyAttendanceManager: React.FC<DailyAttendanceManagerProps> = ({
  attendanceList,
  selectedDate,
  onDateChange,
  onUpdateAttendance,
  isLoading,
}) => {
  const { currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedNotesId, setExpandedNotesId] = useState<string | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [savingDoctorId, setSavingDoctorId] = useState<string | null>(null);

  // Statistics for quick status counts
  const stats = {
    total: attendanceList.length,
    present: attendanceList.filter(a => a.status === 'present').length,
    delayed: attendanceList.filter(a => a.status === 'delayed').length,
    apologized: attendanceList.filter(a => a.status === 'apologized').length,
    unconfirmed: attendanceList.filter(a => a.status === 'unconfirmed').length,
  };

  // Filter attendance by search query and optional status tab
  const filteredAttendance = attendanceList.filter(record => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      (record.doctor_name && record.doctor_name.toLowerCase().includes(q)) ||
      (record.specialty_name && record.specialty_name.toLowerCase().includes(q)) ||
      (record.doctor_title && record.doctor_title.toLowerCase().includes(q));

    const matchesStatus = statusFilter === 'all' || record.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleQuickStatusChange = async (record: DoctorDailyAttendance, newStatus: AttendanceStatus) => {
    setSavingDoctorId(record.doctor_id);
    try {
      const delayTime = newStatus === 'delayed' ? (record.delay_expected_time || '11:00') : null;
      await onUpdateAttendance(
        record.doctor_id,
        newStatus,
        delayTime,
        record.internal_notes
      );
    } catch (e: any) {
      alert(e?.message || 'فشل التحديث');
    } finally {
      setSavingDoctorId(null);
    }
  };

  const handleSaveNotes = async (record: DoctorDailyAttendance) => {
    const noteText = noteDrafts[record.doctor_id] !== undefined
      ? noteDrafts[record.doctor_id]
      : (record.internal_notes || '');
    setSavingDoctorId(record.doctor_id);
    try {
      await onUpdateAttendance(
        record.doctor_id,
        record.status,
        record.delay_expected_time,
        noteText
      );
      setExpandedNotesId(null);
    } catch (e: any) {
      alert(e?.message || 'فشل حفظ الملاحظة');
    } finally {
      setSavingDoctorId(null);
    }
  };

  const getStatusBadge = (status: AttendanceStatus, delayTime?: string | null) => {
    switch (status) {
      case 'present':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>حاضر بالعيادة</span>
          </span>
        );
      case 'unconfirmed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-100 text-amber-800">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
            <span>غير مؤكد حتى الآن</span>
          </span>
        );
      case 'delayed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-orange-100 text-orange-800">
            <Clock4 className="w-3.5 h-3.5 text-orange-600" />
            <span>متأخر {delayTime ? `(${delayTime})` : ''}</span>
          </span>
        );
      case 'apologized':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-rose-100 text-rose-800">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            <span>معتذر لليوم</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header and Date Filter */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900">
            إدارة الحضور والغياب اليومي للأطباء
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            عرض وتحديث بطاقات حضور العيادات بنقرة واحدة مع الملاحظات السرية للموظفين.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs font-semibold text-slate-600">تاريخ العمل:</span>
          <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 text-xs">
            <Calendar className="w-4 h-4 text-slate-600" />
            <input
              type="date"
              value={selectedDate}
              onChange={e => onDateChange(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 cursor-pointer focus:outline-hidden"
            />
          </div>
        </div>
      </div>

      {/* Search and Status Filter Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 sm:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
          <input
            type="text"
            placeholder="ابحث باسم الطبيب، العيادة، أو التخصص الطبي..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-9 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-hidden focus:border-teal-600 focus:bg-white transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-2.5 top-2 text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
              title="مسح البحث"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Quick Status Filter Tabs with Counts */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 text-xs">
          {[
            { id: 'all', label: 'كافة الأطباء', count: stats.total },
            { id: 'present', label: 'حاضر', count: stats.present },
            { id: 'delayed', label: 'متأخر', count: stats.delayed },
            { id: 'apologized', label: 'اعتذار', count: stats.apologized },
            { id: 'unconfirmed', label: 'غير مؤكد', count: stats.unconfirmed },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                statusFilter === tab.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200/70'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono tabular-nums ${
                  statusFilter === tab.id
                    ? 'bg-white/20 text-white font-extrabold'
                    : 'bg-white text-slate-700 border border-slate-200'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Bidirectional Sync & Privacy Notice */}
      <div className="bg-linear-to-r from-teal-50 to-blue-50 border border-teal-200 rounded-xl p-3 text-xs text-teal-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
        <div className="flex items-start gap-2">
          <Lock className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold">المزامنة الحية ثنائية الاتجاه (بدون تضارب):</strong> إذا قام الطبيب بتأكيد حضوره أو تأخره أو اعتذاره من حسابه الخاص، تنعكس حالته فوراً هنا مع شارة <span className="font-bold text-teal-800">"الطبيب بنفسه"</span>. وبالمثل، إذا قام الاستقبال بتحديث حالة الطبيب، تنعكس فوراً في شاشة الطبيب.
          </div>
        </div>
        <span className="shrink-0 self-end sm:self-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-200/70 text-teal-900 border border-teal-300">
          ● المزامنة اللحظية مفعلة
        </span>
      </div>

      {/* =========================================================================
          UNIFIED RESPONSIVE CARDS GRID (Mobile, Tablet, Desktop)
          Replaces clumsy tables with modern, touch-friendly, elegant cards
         ========================================================================= */}
      {filteredAttendance.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-xs text-slate-400 space-y-3">
          <p className="text-sm text-slate-600 font-medium">لا يوجد أطباء مطابقين لبيانات البحث أو التصفية الحالية</p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="px-4 py-2 bg-teal-50 text-teal-700 hover:bg-teal-100 font-bold rounded-xl border border-teal-200 cursor-pointer text-xs transition-colors"
            >
              إلغاء البحث وإظهار كافة الأطباء
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-4.5">
          {filteredAttendance.map(record => {
            const isNotesExpanded = expandedNotesId === record.doctor_id;
            const isThisDoctorSaving = savingDoctorId === record.doctor_id;

            return (
              <div
                key={record.doctor_id}
                className="bg-white rounded-2xl border border-slate-200 hover:border-slate-300 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
              >
                {/* Main Card Body */}
                <div className="p-4 sm:p-4.5 space-y-3.5">
                  {/* Doctor Info Header & Current Status Badge */}
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 text-teal-800 flex items-center justify-center font-bold shrink-0 mt-0.5">
                        <User className="w-5 h-5 text-teal-700" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-extrabold text-sm text-slate-900 leading-snug truncate" title={record.doctor_name}>
                          {record.doctor_name}
                        </h3>
                        <div className="flex items-center gap-1.5 flex-wrap text-xs text-slate-500 mt-0.5">
                          <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px]">
                            عيادة {record.specialty_name}
                          </span>
                          <span className="text-slate-400">·</span>
                          <span className="text-slate-500 text-[11px] truncate">{record.doctor_title}</span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {getStatusBadge(record.status, record.delay_expected_time)}
                    </div>
                  </div>

                  {/* 3 Primary Attendance Action Buttons with Prominent Border & Ring on Active Selection */}
                  <div className="pt-0.5">
                    <div className="text-[11px] font-bold text-slate-500 mb-1.5 flex items-center justify-between">
                      <span>تحديد حالة الحضور:</span>
                      {isThisDoctorSaving && (
                        <span className="text-teal-600 animate-pulse text-[10px] font-semibold">جارِ التحديث...</span>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {/* Present */}
                      <button
                        onClick={() => handleQuickStatusChange(record, 'present')}
                        disabled={isThisDoctorSaving}
                        className={`min-h-[46px] py-2 px-1 rounded-xl text-xs flex flex-col items-center justify-center transition-all cursor-pointer ${
                          record.status === 'present'
                            ? 'border-2 border-emerald-700 ring-2 ring-emerald-500/50 bg-emerald-600 text-white font-black shadow-sm'
                            : 'border border-emerald-200/80 bg-emerald-50/70 text-emerald-800 hover:bg-emerald-100 font-semibold'
                        }`}
                        title="تأكيد حضور الطبيب بالعيادة"
                      >
                        <CheckCircle2 className={`w-4 h-4 mb-0.5 ${record.status === 'present' ? 'text-white' : 'text-emerald-600'}`} />
                        <span>حاضر</span>
                      </button>

                      {/* Delayed */}
                      <button
                        onClick={() => handleQuickStatusChange(record, 'delayed')}
                        disabled={isThisDoctorSaving}
                        className={`min-h-[46px] py-2 px-1 rounded-xl text-xs flex flex-col items-center justify-center transition-all cursor-pointer ${
                          record.status === 'delayed'
                            ? 'border-2 border-orange-700 ring-2 ring-orange-500/50 bg-orange-500 text-white font-black shadow-sm'
                            : 'border border-orange-200/80 bg-orange-50/70 text-orange-800 hover:bg-orange-100 font-semibold'
                        }`}
                        title="تسجيل تأخر الطبيب مع تحديد موعد الوصول"
                      >
                        <Clock4 className={`w-4 h-4 mb-0.5 ${record.status === 'delayed' ? 'text-white' : 'text-orange-600'}`} />
                        <span>متأخر</span>
                      </button>

                      {/* Apologized */}
                      <button
                        onClick={() => handleQuickStatusChange(record, 'apologized')}
                        disabled={isThisDoctorSaving}
                        className={`min-h-[46px] py-2 px-1 rounded-xl text-xs flex flex-col items-center justify-center transition-all cursor-pointer ${
                          record.status === 'apologized'
                            ? 'border-2 border-rose-700 ring-2 ring-rose-500/50 bg-rose-600 text-white font-black shadow-sm'
                            : 'border border-rose-200/80 bg-rose-50/70 text-rose-800 hover:bg-rose-100 font-semibold'
                        }`}
                        title="تسجيل اعتذار الطبيب عن عيادة اليوم"
                      >
                        <XCircle className={`w-4 h-4 mb-0.5 ${record.status === 'apologized' ? 'text-white' : 'text-rose-600'}`} />
                        <span>اعتذار</span>
                      </button>
                    </div>

                    {/* Undo / Reset to Unconfirmed: Visible ONLY if a status is currently assigned */}
                    {record.status !== 'unconfirmed' && (
                      <button
                        onClick={() => handleQuickStatusChange(record, 'unconfirmed')}
                        disabled={isThisDoctorSaving}
                        className="mt-2 w-full py-1.5 px-2.5 rounded-lg text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200/90 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        title="التراجع عن التحديد الحالي وإعادة حالة الطبيب لوضع غير مؤكد"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                        <span>تراجع عن التحديد (إعادة لحالة غير مؤكد)</span>
                      </button>
                    )}
                  </div>

                  {/* Delay time picker if delayed */}
                  {record.status === 'delayed' && (
                    <div className="bg-orange-50/90 border border-orange-200 rounded-xl p-2.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-orange-950">
                        <Clock className="w-3.5 h-3.5 text-orange-600" />
                        <span>موعد الوصول المتوقع:</span>
                      </div>
                      <input
                        type="time"
                        defaultValue={record.delay_expected_time || '11:00'}
                        onChange={e => {
                          onUpdateAttendance(record.doctor_id, 'delayed', e.target.value, record.internal_notes);
                        }}
                        className="px-2 py-1 bg-white border border-orange-300 rounded-lg text-xs font-mono font-bold text-orange-900 focus:outline-hidden focus:ring-1 focus:ring-orange-400"
                      />
                    </div>
                  )}

                  {/* Internal Staff Notes Toggle & Quick Editor */}
                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <button
                        onClick={() => {
                          if (isNotesExpanded) {
                            setExpandedNotesId(null);
                          } else {
                            setExpandedNotesId(record.doctor_id);
                            if (noteDrafts[record.doctor_id] === undefined) {
                              setNoteDrafts(prev => ({ ...prev, [record.doctor_id]: record.internal_notes || '' }));
                            }
                          }
                        }}
                        className="text-teal-700 font-bold flex items-center gap-1.5 cursor-pointer py-1 hover:text-teal-900 transition-colors"
                      >
                        <Lock className="w-3.5 h-3.5 text-teal-600" />
                        <span>الملاحظات الداخلية ({record.internal_notes ? 'موجودة' : 'فارغة'})</span>
                        {isNotesExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>

                      {!isNotesExpanded && record.internal_notes && (
                        <span className="text-[11px] text-slate-500 font-medium truncate max-w-[140px]" title={record.internal_notes}>
                          "{record.internal_notes}"
                        </span>
                      )}
                    </div>

                    {isNotesExpanded && (
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                        <label className="block text-[11px] font-bold text-slate-700">
                          ملاحظات سرية للموظفين فقط:
                        </label>
                        <textarea
                          rows={2}
                          value={noteDrafts[record.doctor_id] !== undefined ? noteDrafts[record.doctor_id] : (record.internal_notes || '')}
                          onChange={e => setNoteDrafts(prev => ({ ...prev, [record.doctor_id]: e.target.value }))}
                          placeholder="سبب التأخير، هاتف تم الاتصال به، تعليمات خاصة..."
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:border-teal-600"
                        />
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setExpandedNotesId(null)}
                            className="px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-200 rounded-lg cursor-pointer"
                          >
                            إلغاء
                          </button>
                          <button
                            onClick={() => handleSaveNotes(record)}
                            disabled={isThisDoctorSaving}
                            className="px-3 py-1 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>حفظ الملاحظة</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer: Metadata (timestamp & staff name with doctor badge) */}
                <div className="bg-slate-50/80 px-4 py-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <div className="flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>آخر تحديث:</span>
                    <span className="font-semibold text-slate-700">
                      {new Date(record.updated_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  {record.updated_by_name?.includes('الطبيب') ? (
                    <div
                      className="flex items-center gap-1 text-[10px] font-bold text-teal-800 bg-teal-100 px-2 py-0.5 rounded-md border border-teal-200 truncate max-w-[170px]"
                      title={record.updated_by_name}
                    >
                      <CheckCircle2 className="w-3 h-3 text-teal-600 shrink-0" />
                      <span className="truncate">الطبيب بنفسه</span>
                    </div>
                  ) : (
                    <div
                      className="flex items-center gap-1 text-[10px] text-slate-500 truncate max-w-[150px]"
                      title={record.updated_by_name || 'موظف الاستقبال'}
                    >
                      <User className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{record.updated_by_name || 'موظف الاستقبال'}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
