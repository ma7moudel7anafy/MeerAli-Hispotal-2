import React, { useState } from 'react';
import { PublicDoctorAttendance, Specialty } from '../../types';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Clock4,
  Search,
  Calendar,
  RefreshCw,
  Stethoscope,
  Filter,
} from 'lucide-react';

interface AttendanceBoardProps {
  attendanceList: PublicDoctorAttendance[];
  specialties: Specialty[];
  selectedDate: string;
  onDateChange: (date: string) => void;
  onRefresh: () => void;
  isLoading: boolean;
}

export const AttendanceBoard: React.FC<AttendanceBoardProps> = ({
  attendanceList,
  specialties,
  selectedDate,
  onDateChange,
  onRefresh,
  isLoading,
}) => {
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredList = attendanceList.filter(item => {
    const matchesSpec = selectedSpecialty === 'all' || item.specialty_id === selectedSpecialty;
    const matchesSearch =
      !searchQuery.trim() ||
      item.doctor_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.specialty_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSpec && matchesSearch;
  });

  const getStatusBadge = (status: PublicDoctorAttendance['status'], delayTime?: string | null) => {
    switch (status) {
      case 'present':
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>حاضر بالعيادة</span>
          </div>
        );
      case 'unconfirmed':
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-amber-50 text-amber-800 border border-amber-300 text-xs font-bold">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <span>غير مؤكد حتى الآن</span>
          </div>
        );
      case 'delayed':
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-orange-50 text-orange-800 border border-orange-300 text-xs font-bold">
            <Clock4 className="w-4 h-4 text-orange-600" />
            <span>
              متأخر {delayTime ? `(متوقع ${delayTime})` : ''}
            </span>
          </div>
        );
      case 'apologized':
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-rose-50 text-rose-800 border border-rose-300 text-xs font-bold">
            <XCircle className="w-4 h-4 text-rose-600" />
            <span>معتذر عن موعد اليوم</span>
          </div>
        );
      default:
        return null;
    }
  };

  const formatTimestamp = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString('ar-EG', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  return (
    <section
      id="attendance"
      className="py-14 bg-gradient-to-b from-teal-50/60 via-white to-teal-50/30 border-t-4 border-teal-600 border-b border-slate-200"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Visual Indicator Badge & Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-100 text-teal-900 border border-teal-200 text-xs font-bold mb-2.5">
              <span className="w-2 h-2 rounded-full bg-teal-600"></span>
              <span>القسم الأول: متابعة مباشرة</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              حالة حضور الأطباء بالعيادات اليومية
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1.5 max-w-2xl">
              تُحدَّث هذه الشاشة فور تأكيد الحضور من موظفي الاستقبال لضمان مصداقية المواعيد قبل توجه المريض للمستشفى.
            </p>
          </div>

          {/* Date Picker & Refresh */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-xl border border-slate-300 shadow-2xs text-xs">
              <Calendar className="w-4 h-4 text-teal-700" />
              <input
                type="date"
                value={selectedDate}
                onChange={e => onDateChange(e.target.value)}
                className="bg-transparent text-slate-800 font-bold focus:outline-hidden cursor-pointer"
              />
            </div>

            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="p-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 transition-colors cursor-pointer border border-slate-300 shadow-2xs disabled:opacity-50"
              title="تحديث البيانات الآن"
            >
              <RefreshCw className={`w-4 h-4 text-teal-700 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Prominent Dropdown Selection & Search Toolbar */}
        <div className="bg-white p-5 rounded-2xl border border-teal-200/80 shadow-xs mb-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            {/* Specialty Dropdown Selector (Required improvement) */}
            <div className="md:col-span-7">
              <label
                htmlFor="specialty-select"
                className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5"
              >
                <Filter className="w-3.5 h-3.5 text-teal-700" />
                <span>تصفية حسب التخصص الطبي (قائمة منسدلة):</span>
              </label>

              <div className="relative">
                <select
                  id="specialty-select"
                  value={selectedSpecialty}
                  onChange={e => setSelectedSpecialty(e.target.value)}
                  className="w-full pl-4 pr-10 py-2.5 text-xs sm:text-sm font-semibold bg-teal-50/50 hover:bg-teal-50/80 border-2 border-teal-600/30 hover:border-teal-600 rounded-xl text-slate-900 focus:outline-hidden focus:border-teal-700 focus:ring-2 focus:ring-teal-200 transition-all cursor-pointer appearance-none"
                >
                  <option value="all">
                    🏥 كل العيادات والتخصصات ({attendanceList.length} أطباء مسجلين)
                  </option>
                  {specialties.map(spec => {
                    const countInSpec = attendanceList.filter(a => a.specialty_id === spec.id).length;
                    return (
                      <option key={spec.id} value={spec.id}>
                        عيادة {spec.name} {countInSpec > 0 ? `(${countInSpec} أطباء)` : '(لا توجد عيادة اليوم)'}
                      </option>
                    );
                  })}
                </select>

                <div className="absolute left-3 top-3 pointer-events-none text-teal-700">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Doctor Search */}
            <div className="md:col-span-5">
              <label
                htmlFor="search-doctor"
                className="block text-xs font-bold text-slate-700 mb-1.5"
              >
                البحث السريع باسم الطبيب:
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3 pointer-events-none" />
                <input
                  id="search-doctor"
                  type="text"
                  placeholder="اكتب اسم الطبيب للبحث الفوري..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-3 pr-10 py-2.5 text-xs sm:text-sm bg-white rounded-xl border border-slate-300 focus:outline-hidden focus:border-teal-600 focus:ring-2 focus:ring-teal-100 transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Attendance Cards Grid */}
        {filteredList.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300 p-6">
            <AlertCircle className="w-9 h-9 text-slate-400 mx-auto mb-2.5" />
            <p className="text-sm font-bold text-slate-800">لا توجد عيادات مسجلة مطابقة للاختيار في هذا اليوم</p>
            <p className="text-xs text-slate-500 mt-1">
              يرجى اختيار تخصص آخر من القائمة المنسدلة أعلاه أو اختيار تاريخ آخر.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredList.map(item => (
              <div
                key={item.doctor_id}
                className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs hover:shadow-md hover:border-teal-300 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Specialty and Status */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-md border border-teal-200/60">
                      {item.specialty_name}
                    </span>
                    {getStatusBadge(item.status, item.delay_expected_time)}
                  </div>

                  {/* Doctor Info */}
                  <h3 className="text-base font-extrabold text-slate-900 leading-snug mt-1">
                    {item.doctor_name}
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 mb-4 leading-relaxed">
                    {item.doctor_title}
                  </p>
                </div>

                {/* Status Explanation & Timestamp */}
                <div className="pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>آخر تحديث:</span>
                    <span className="font-mono tabular-nums text-slate-800 font-bold">
                      {formatTimestamp(item.updated_at)}
                    </span>
                  </div>

                  {item.status === 'unconfirmed' && (
                    <span className="text-amber-800 text-[11px] font-semibold">في انتظار التأكيد اليومي</span>
                  )}
                  {item.status === 'present' && (
                    <span className="text-emerald-800 text-[11px] font-semibold">متاح بالعيادة</span>
                  )}
                  {item.status === 'apologized' && (
                    <span className="text-rose-800 text-[11px] font-semibold">اعتذر عن الحضور</span>
                  )}
                  {item.status === 'delayed' && (
                    <span className="text-orange-800 text-[11px] font-semibold">في الطريق</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
