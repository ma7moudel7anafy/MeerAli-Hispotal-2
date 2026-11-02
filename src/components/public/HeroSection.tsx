import React from 'react';
import { HOSPITAL_METADATA } from '../../lib/mockData';
import { Calendar, Stethoscope, FlaskConical, Clock, HeartHandshake, PhoneCall } from 'lucide-react';

interface HeroSectionProps {
  onNavigate: (section: string) => void;
  todayAttendanceCount: { present: number; total: number };
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onNavigate, todayAttendanceCount }) => {
  return (
    <section className="relative bg-gradient-to-b from-teal-900 via-teal-950 to-slate-900 text-white overflow-hidden py-16 sm:py-20">
      {/* Decorative background grid pattern */}
      <div 
        className="absolute inset-0 opacity-10 pointer-events-none" 
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '28px 28px'
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Prototype Notice Alert */}
        <div className="mb-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-800/80 border border-teal-600/40 text-xs text-teal-200">
          <HeartHandshake className="w-3.5 h-3.5 text-teal-300" />
          <span>نسخة أولية تجريبية — اسم المستشفى والشعار والبيانات قابلة للتعديل والاعتماد النهائي</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Main Title and Intro */}
          <div className="lg:col-span-7 space-y-6">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight text-white text-balance">
              رعاية صحية خيرية متميزة
              <span className="block text-teal-300 mt-2">لأهالي ميت علي وقراها</span>
            </h1>

            <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl">
              توفير نخبة من الاستشاريين والأخصائيين في مختلف العيادات، مع خدمات المعمل والأشعة بأسعار خيرية رمزية لخدمة مجتمعنا وكفالة العلاج لغير القادرين.
            </p>

            {/* Quick Navigation Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => onNavigate('attendance')}
                className="px-5 py-3 text-sm font-bold bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-xl transition-all shadow-md hover:shadow-teal-500/20 flex items-center gap-2 cursor-pointer"
              >
                <Calendar className="w-4 h-4 text-slate-950" />
                <span>متابعة حضور الأطباء اليوم</span>
              </button>

              <button
                onClick={() => onNavigate('specialties')}
                className="px-5 py-3 text-sm font-medium bg-slate-800/90 hover:bg-slate-700 text-white border border-slate-700 rounded-xl transition-all flex items-center gap-2 cursor-pointer"
              >
                <Stethoscope className="w-4 h-4 text-teal-300" />
                <span>دليل العيادات والأطباء</span>
              </button>

              <button
                onClick={() => onNavigate('diagnostics')}
                className="px-5 py-3 text-sm font-medium bg-slate-800/90 hover:bg-slate-700 text-white border border-slate-700 rounded-xl transition-all flex items-center gap-2 cursor-pointer"
              >
                <FlaskConical className="w-4 h-4 text-teal-300" />
                <span>المعمل والأشعة</span>
              </button>
            </div>
          </div>

          {/* Quick Info & Attendance Status Card */}
          <div className="lg:col-span-5">
            <div className="bg-slate-800/80 backdrop-blur-md border border-slate-700 rounded-2xl p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between border-b border-slate-700 pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-400" />
                  <span className="text-sm font-bold text-white">حالة عيادات اليوم</span>
                </div>
                <span className="text-xs text-slate-400 font-mono tabular-nums">
                  {new Date().toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>

              {/* Attendance metrics */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900/70 p-3.5 rounded-xl border border-slate-700/60">
                  <div className="text-xs text-slate-400 mb-1">الأطباء المتواجدون الآن</div>
                  <div className="text-2xl font-bold text-emerald-400 font-mono tabular-nums">
                    {todayAttendanceCount.present} <span className="text-xs font-normal text-slate-400">طبيب حاضر</span>
                  </div>
                </div>

                <div className="bg-slate-900/70 p-3.5 rounded-xl border border-slate-700/60">
                  <div className="text-xs text-slate-400 mb-1">إجمالي عيادات اليوم</div>
                  <div className="text-2xl font-bold text-teal-300 font-mono tabular-nums">
                    {todayAttendanceCount.total} <span className="text-xs font-normal text-slate-400">عيادة مجدولة</span>
                  </div>
                </div>
              </div>

              {/* Instructions on Attendance Confirmation */}
              <div className="bg-teal-950/60 border border-teal-800/60 rounded-xl p-3.5 text-xs text-teal-200 space-y-1">
                <div className="font-semibold text-teal-100 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-teal-400" />
                  <span>آلية تحديث الحضور اليومية:</span>
                </div>
                <p className="text-teal-300/90 leading-relaxed">
                  تظهر حالة الطبيب افتراضياً كـ <strong className="text-amber-300 font-medium">«غير مؤكد»</strong> في بداية كل يوم، وتتحول فورياً إلى <strong className="text-emerald-300 font-medium">«حاضر»</strong> فور تأكيد موظف الاستقبال لتواجد الطبيب بالعيادة، مع إظهار توقيت التحديث بدقة.
                </p>
              </div>

              {/* Emergency Hotline & Direct WhatsApp Action */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <a
                  href={`tel:${HOSPITAL_METADATA.phoneEmergencyClean}`}
                  className="flex-1 py-2 px-3 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>اتصال: {HOSPITAL_METADATA.phoneEmergency}</span>
                </a>

                <a
                  href={HOSPITAL_METADATA.whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <span className="font-bold">واتساب الاستقبال</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
