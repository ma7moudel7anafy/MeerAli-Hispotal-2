import React from 'react';
import { HOSPITAL_METADATA } from '../../lib/mockData';
import { MapPin, Phone, Clock, ShieldCheck, Navigation } from 'lucide-react';

export const ContactSection: React.FC = () => {
  return (
    <section
      id="contact"
      className="py-16 bg-gradient-to-b from-slate-100 via-slate-50 to-slate-200/60 border-t-4 border-slate-700 border-b border-slate-300"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-200 text-slate-800 border border-slate-300 text-xs font-bold mb-2.5">
            <span className="w-2 h-2 rounded-full bg-slate-700"></span>
            <span>القسم الرابع: التواصل والموقع الجغرافي</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            العنوان وأرقام التواصل المباشرة
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-2">
            مستشفى لجنة الزكاة بميت علي في قلب القرية، مجهز لاستقبال الحالات وتوجيهها للعيادات المتخصصة.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Contact Details */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0 shadow-2xs">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">مقر المستشفى بميت علي</h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {HOSPITAL_METADATA.city}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    يسهل الوصول إلينا من موقف سيارات ميت علي الرئيسي على مسافة دقيقتين سيراً.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 shadow-2xs">
                  <Phone className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-slate-900">الاستعلامات والطوارئ والمحادثة</h4>
                  <p className="text-xs text-slate-600 mt-1">
                    الخط الأرضي: <a href={`tel:${HOSPITAL_METADATA.phoneLandlineClean}`} className="font-mono tabular-nums font-bold text-slate-800 hover:text-teal-700 hover:underline">{HOSPITAL_METADATA.phonePrimary}</a>
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    الاستقبال المباشر: <a href={`tel:${HOSPITAL_METADATA.phoneEmergencyClean}`} className="font-mono tabular-nums font-bold text-emerald-700 hover:text-emerald-800 hover:underline">{HOSPITAL_METADATA.phoneEmergency}</a>
                  </p>

                  {/* Immediate Action Buttons */}
                  <div className="pt-3 flex flex-wrap gap-2">
                    <a
                      href={HOSPITAL_METADATA.whatsappLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>محادثة واتساب فورية</span>
                    </a>

                    <a
                      href={`tel:${HOSPITAL_METADATA.phoneEmergencyClean}`}
                      className="px-3.5 py-2 rounded-xl bg-teal-800 hover:bg-teal-700 text-white text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>اتصال فوري بالموبايل</span>
                    </a>

                    <a
                      href={`tel:${HOSPITAL_METADATA.phoneLandlineClean}`}
                      className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold border border-slate-300 transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <span>الخط الأرضي</span>
                    </a>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 shadow-2xs">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">ساعات الخدمة</h4>
                  <p className="text-xs text-slate-600 mt-1">
                    {HOSPITAL_METADATA.workHours}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 text-teal-100 p-5 rounded-2xl shadow-sm space-y-2 border border-slate-800">
              <div className="flex items-center gap-2 font-bold text-white text-sm">
                <ShieldCheck className="w-4 h-4 text-teal-400" />
                <span>الشفافية والعمل الخيري المعتمد</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                أموال الكشوفات والتبرعات تدار بالكامل تحت إشراف لجنة زكاة ميت علي، وتوجّه لتطوير الأجهزة الطبية ودعم الأسر الأولى بالرعاية داخل القرية ومحيطها.
              </p>
            </div>
          </div>

          {/* Interactive Simulated Map / Landmark */}
          <div className="lg:col-span-7">
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm h-full flex flex-col">
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-teal-700" />
                  <span className="text-xs font-bold text-slate-800">خريطة وموقع المستشفى</span>
                </div>
                <span className="text-xs text-slate-500 font-medium">ميت علي، مركز المنصورة، الدقهلية</span>
              </div>

              <div className="flex-1 min-h-[260px] bg-slate-100 relative flex items-center justify-center p-6 text-center">
                <div className="space-y-3.5 max-w-sm">
                  <div className="w-14 h-14 bg-teal-700 text-white rounded-2xl mx-auto flex items-center justify-center shadow-md animate-bounce">
                    <MapPin className="w-7 h-7" />
                  </div>
                  <h4 className="text-base font-bold text-slate-900">
                    مستشفى لجنة الزكاة بميت علي
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    بجوار المجمع الإسلامي الخيري، شارع داير الناحية، ميت علي، مركز المنصورة، محافظة الدقهلية.
                  </p>
                  <div className="pt-2">
                    <a
                      href="https://maps.google.com/?q=Mit+Ali+Mansoura+Egypt"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
                    >
                      <span>فتح الموقع على خرائط Google</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
