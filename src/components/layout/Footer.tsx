import React from 'react';
import { HOSPITAL_METADATA } from '../../lib/mockData';
import { Phone, MapPin, Clock, Heart, Shield } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-300 pt-12 pb-8 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-8 border-b border-slate-800">
          {/* Hospital Identity & Mission */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl font-bold text-white">{HOSPITAL_METADATA.name}</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              {HOSPITAL_METADATA.tagline}. مشروع رعاية صحية تكافلي تحت مظلة لجنة زكاة ميت علي، يهدف لتوفير الكشف الطبي والتحاليل والأشعة بأجور رمزية وتخفيض الأعباء عن كاهل المرضى.
            </p>
            <div className="flex items-center gap-2 text-xs text-teal-400">
              <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
              <span>{HOSPITAL_METADATA.donationNote}</span>
            </div>
          </div>

          {/* Contact & Hours */}
          <div>
            <h4 className="text-sm font-bold text-white mb-3">العنوان وساعات العمل</h4>
            <div className="space-y-2 text-xs text-slate-400">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                <span>{HOSPITAL_METADATA.city}</span>
              </div>
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                <span>{HOSPITAL_METADATA.workHours}</span>
              </div>
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                <span>{HOSPITAL_METADATA.labHours}</span>
              </div>
            </div>
          </div>

          {/* Emergency & Numbers */}
          <div>
            <h4 className="text-sm font-bold text-white mb-3">أرقام التواصل والاستعلام</h4>
            <div className="space-y-2 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>الخط الأرضي: <a href={`tel:${HOSPITAL_METADATA.phoneLandlineClean}`} className="tabular-numbers text-white font-semibold hover:text-teal-300 hover:underline">{HOSPITAL_METADATA.phonePrimary}</a></span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>طوارئ واستقبال: <a href={`tel:${HOSPITAL_METADATA.phoneEmergencyClean}`} className="tabular-numbers text-white font-semibold hover:text-emerald-300 hover:underline">{HOSPITAL_METADATA.phoneEmergency}</a></span>
              </div>
              <div className="pt-1 flex items-center gap-2">
                <a
                  href={HOSPITAL_METADATA.whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold transition-colors"
                >
                  <span>محادثة واتساب مباشرة</span>
                </a>
                <a
                  href={`tel:${HOSPITAL_METADATA.phoneEmergencyClean}`}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-teal-800 hover:bg-teal-700 text-white text-xs font-bold transition-colors"
                >
                  <Phone className="w-3 h-3" />
                  <span>اتصال هاتفي</span>
                </a>
              </div>
              <div className="mt-3 p-3 bg-slate-800/80 rounded-lg border border-slate-700/60">
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <Shield className="w-4 h-4 text-teal-400" />
                  <span>تنبيه: الكشف متاح بحضور المريض مباشرة، دون حجز مسبق عبر الإنترنت في الإصدار الحالي.</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <div>
            © {new Date().getFullYear()} {HOSPITAL_METADATA.name} — جميع الحقوق محفوظة لخدمة أهالي ميت علي.
          </div>
          <div className="flex items-center gap-3">
            <span>نظام إداري محمي بقاعدة بيانات مشفرة وسياسات RLS</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
