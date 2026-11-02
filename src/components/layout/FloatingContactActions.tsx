import React, { useState, useEffect } from 'react';
import { HOSPITAL_METADATA } from '../../lib/mockData';
import { Phone, MessageCircle, ArrowUp, X, PhoneCall } from 'lucide-react';

export const FloatingContactActions: React.FC = () => {
  const [isPhoneMenuOpen, setIsPhoneMenuOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 180);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="fixed bottom-5 left-5 z-40 flex flex-col items-start gap-2.5 print:hidden">
      {/* Phone Numbers Popup Menu (Opened via the Call Button) */}
      {isPhoneMenuOpen && (
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200 p-4 w-72 space-y-2.5 mb-1 animate-in fade-in slide-in-from-bottom-3 duration-200 text-right">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
              <PhoneCall className="w-4 h-4 text-teal-700" />
              <span>أرقام الاتصال بالمستشفى</span>
            </div>
            <button
              onClick={() => setIsPhoneMenuOpen(false)}
              className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed">
            اختر الرقم المطلوب للاتصال المباشر الفوري:
          </p>

          {/* Emergency / Mobile */}
          <a
            href={`tel:${HOSPITAL_METADATA.phoneEmergencyClean}`}
            onClick={() => setIsPhoneMenuOpen(false)}
            className="flex items-center justify-between p-2.5 bg-teal-50 hover:bg-teal-100/90 text-teal-950 rounded-xl transition-colors text-xs font-bold border border-teal-200 group"
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-teal-700 text-white rounded-lg flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Phone className="w-3.5 h-3.5" />
              </div>
              <div className="text-right">
                <span className="block">طوارئ واستقبال 24 ساعة</span>
                <span className="text-[10px] text-teal-700 font-normal">هاتف محمول مباشر</span>
              </div>
            </div>
            <span className="text-teal-800 font-mono text-[11px] dir-ltr font-extrabold">
              {HOSPITAL_METADATA.phoneEmergency}
            </span>
          </a>

          {/* Landline */}
          <a
            href={`tel:${HOSPITAL_METADATA.phoneLandlineClean}`}
            onClick={() => setIsPhoneMenuOpen(false)}
            className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-900 rounded-xl transition-colors text-xs font-bold border border-slate-200 group"
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-slate-800 text-white rounded-lg flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Phone className="w-3.5 h-3.5" />
              </div>
              <div className="text-right">
                <span className="block">الخط الأرضي للعيادات</span>
                <span className="text-[10px] text-slate-500 font-normal">مواعيد العمل الرسمية</span>
              </div>
            </div>
            <span className="text-slate-800 font-mono text-[11px] dir-ltr font-bold">
              {HOSPITAL_METADATA.phonePrimary}
            </span>
          </a>
        </div>
      )}

      {/* Floating Action Buttons Strip */}
      <div className="flex items-center gap-2">
        {/* 1. WhatsApp Button (Direct Link to WhatsApp) */}
        <a
          href={HOSPITAL_METADATA.whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          className="h-12 px-4 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg hover:shadow-emerald-500/30 flex items-center gap-2 transition-all cursor-pointer font-bold text-xs group"
          title="محادثة واتساب مباشرة مع المستشفى"
        >
          <MessageCircle className="w-5 h-5 fill-white shrink-0 group-hover:scale-110 transition-transform" />
          <span className="hidden sm:inline">واتساب</span>
        </a>

        {/* 2. Call Button (Toggles All Phone Numbers Popup) */}
        <button
          onClick={() => setIsPhoneMenuOpen(!isPhoneMenuOpen)}
          className={`h-12 px-4 rounded-full text-white shadow-lg flex items-center gap-2 transition-all cursor-pointer font-bold text-xs group ${
            isPhoneMenuOpen
              ? 'bg-teal-900 ring-2 ring-teal-400'
              : 'bg-teal-800 hover:bg-teal-700 hover:shadow-teal-700/30'
          }`}
          title="أرقام الاتصال بالمستشفى"
        >
          <Phone className="w-4 h-4 shrink-0 group-hover:scale-110 transition-transform" />
          <span>اتصال</span>
        </button>

        {/* 3. Arrow Up Button (Scrolls to Top / Home) */}
        <button
          onClick={scrollToTop}
          className={`w-11 h-11 rounded-full bg-white text-slate-700 hover:bg-slate-100 hover:text-teal-700 border border-slate-300 shadow-md flex items-center justify-center cursor-pointer transition-all ${
            showScrollTop ? 'opacity-100 scale-100' : 'opacity-85 hover:opacity-100'
          }`}
          title="العودة لأعلى الصفحة / الرئيسية"
          aria-label="العودة للرئيسية"
        >
          <ArrowUp className="w-5 h-5 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
};
