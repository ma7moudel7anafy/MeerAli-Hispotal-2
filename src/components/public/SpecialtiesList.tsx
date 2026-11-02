import React, { useState } from 'react';
import { Specialty, Doctor, DoctorSchedule } from '../../types';
import {
  Stethoscope,
  Calendar,
  Clock,
  ChevronDown,
  ChevronUp,
  Filter,
  DollarSign,
  UserCheck,
} from 'lucide-react';

interface SpecialtiesListProps {
  specialties: Specialty[];
  doctors: Doctor[];
  schedules: DoctorSchedule[];
}

export const SpecialtiesList: React.FC<SpecialtiesListProps> = ({
  specialties,
  doctors,
  schedules,
}) => {
  const [selectedSpecId, setSelectedSpecId] = useState<string>(specialties[0]?.id || '');
  const [expandedDoctorId, setExpandedDoctorId] = useState<string | null>(null);

  const daysArabic = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

  const currentSpecialty = specialties.find(s => s.id === selectedSpecId) || specialties[0];
  const specialtyDoctors = doctors.filter(d => d.specialty_id === currentSpecialty?.id);

  return (
    <section
      id="specialties"
      className="py-16 bg-gradient-to-b from-slate-100/90 via-slate-50 to-white border-t-4 border-indigo-600 border-b border-slate-200"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header with visual badge */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-100 text-indigo-900 border border-indigo-200 text-xs font-bold mb-2.5">
            <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
            <span>القسم الثاني: دليل العيادات والأطباء</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            دليل العيادات ومواعيد الأطباء الأسبوعية
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-2">
            نخبة من أساتذة واستشاريي الطب في محافظة الدقهلية يقدمون خدماتهم في مقر المستشفى بميت علي بأجور خيرية رمزية.
          </p>
        </div>

        {/* Prominent Dropdown Selection Card */}
        <div className="max-w-2xl mx-auto mb-10 bg-white p-5 rounded-2xl border-2 border-indigo-200/80 shadow-xs">
          <label
            htmlFor="specialty-dropdown"
            className="block text-xs sm:text-sm font-bold text-slate-800 mb-2 flex items-center gap-2"
          >
            <Stethoscope className="w-4 h-4 text-indigo-600" />
            <span>اختر العيادة أو التخصص الطبي المطلوب من القائمة:</span>
          </label>

          <div className="relative">
            <select
              id="specialty-dropdown"
              value={selectedSpecId}
              onChange={e => {
                setSelectedSpecId(e.target.value);
                setExpandedDoctorId(null);
              }}
              className="w-full pl-4 pr-11 py-3 text-sm font-bold bg-indigo-50/50 hover:bg-indigo-50/80 border-2 border-indigo-300 rounded-xl text-slate-900 focus:outline-hidden focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200 transition-all cursor-pointer appearance-none shadow-2xs"
            >
              {specialties.map(spec => {
                const docCount = doctors.filter(d => d.specialty_id === spec.id).length;
                return (
                  <option key={spec.id} value={spec.id}>
                    عيادة {spec.name} ({docCount} {docCount === 1 ? 'طبيب' : 'أطباء'})
                  </option>
                );
              })}
            </select>

            <div className="absolute left-3.5 top-3.5 pointer-events-none text-indigo-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Selected Specialty Details Card */}
        {currentSpecialty && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm">
            <div className="border-b border-slate-100 pb-5 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider block mb-0.5">
                  العيادة المختارة حالياً:
                </span>
                <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                  {currentSpecialty.name}
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  {currentSpecialty.description}
                </p>
              </div>

              <div className="bg-indigo-50 text-indigo-900 px-3.5 py-1.5 rounded-xl border border-indigo-200 text-xs font-bold shrink-0 self-start sm:self-auto">
                {specialtyDoctors.length} {specialtyDoctors.length === 1 ? 'طبيب معتمد' : 'أطباء معتمدين'}
              </div>
            </div>

            {/* Doctors in this specialty */}
            {specialtyDoctors.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-xs bg-slate-50 rounded-xl border border-dashed border-slate-200">
                جاري تحديث جدول أطباء هذه العيادة في الوقت الحالي. يرجى مراجعة الاستقبال.
              </div>
            ) : (
              <div className="space-y-4">
                {specialtyDoctors.map(doc => {
                  const docSchedules = schedules.filter(s => s.doctor_id === doc.id);
                  const isExpanded = expandedDoctorId === doc.id;

                  return (
                    <div
                      key={doc.id}
                      className="border border-slate-200 rounded-2xl p-5 hover:border-indigo-300 transition-all bg-slate-50/60 shadow-2xs"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1.5">
                            <h4 className="text-base sm:text-lg font-bold text-slate-900">
                              {doc.full_name}
                            </h4>
                            <span className="text-xs text-indigo-800 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-md font-semibold">
                              {doc.title}
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
                            {doc.bio}
                          </p>
                        </div>

                        {/* Consultation fee and Schedules trigger */}
                        <div className="flex items-center gap-4 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-200">
                          <div className="flex items-center gap-2.5 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200">
                            <div className="text-right px-1.5 border-l border-slate-200">
                              <span className="text-[10px] text-slate-500 block font-medium">كشف جديد</span>
                              <span className="text-sm font-extrabold text-teal-700 font-mono tabular-nums">
                                {doc.consultation_fee} ج.م
                              </span>
                            </div>
                            <div className="text-right px-1.5">
                              <span className="text-[10px] text-indigo-600 block font-medium">إعادة واستشارة</span>
                              <span className="text-sm font-extrabold text-indigo-700 font-mono tabular-nums">
                                {doc.followup_fee !== undefined ? doc.followup_fee : Math.round(doc.consultation_fee / 2)} ج.م
                              </span>
                            </div>
                          </div>

                          <button
                            onClick={() => setExpandedDoctorId(isExpanded ? null : doc.id)}
                            className="px-3.5 py-2 text-xs font-bold text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                          >
                            <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                            <span>مواعيد العيادة ({docSchedules.length})</span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      {/* Expanded Schedules Grid */}
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-slate-200">
                          <div className="text-xs font-bold text-slate-800 mb-2.5 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                            <span>الأيام والمواعيد الأسبوعية الثابتة للكشف:</span>
                          </div>

                          {docSchedules.length === 0 ? (
                            <p className="text-xs text-slate-500">
                              المواعيد يتم تنسيقها دورياً حسب الحالات في الاستقبال.
                            </p>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                              {docSchedules.map(sch => (
                                <div
                                  key={sch.id}
                                  className="bg-white p-3 rounded-xl border border-slate-200 text-xs flex items-center justify-between shadow-2xs"
                                >
                                  <span className="font-bold text-slate-900">
                                    يوم {daysArabic[sch.day_of_week]}
                                  </span>
                                  <div className="flex items-center gap-1.5 text-slate-700 font-mono tabular-nums font-semibold">
                                    <Clock className="w-3.5 h-3.5 text-indigo-500" />
                                    <span>{sch.start_time} - {sch.end_time}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
