import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { ShieldCheck, UserCheck, Lock, X, AlertCircle, Stethoscope, ChevronDown, ChevronUp, FlaskConical, Scan } from 'lucide-react';
import { getSupabaseClient } from '../../lib/supabaseClient';
import { dbService } from '../../lib/databaseService';

interface StaffLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const StaffLoginModal: React.FC<StaffLoginModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { login } = useAuth();
  const [selectedRole, setSelectedRole] = useState<UserRole>('receptionist');
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('doc-01');
  const [doctorsList, setDoctorsList] = useState<any[]>([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showDemoSection, setShowDemoSection] = useState(true);
  const isSupabaseLive = getSupabaseClient() !== null;

  useEffect(() => {
    // In live Supabase mode, hide demo credentials by default
    if (isSupabaseLive) {
      setShowDemoSection(false);
    }
  }, [isSupabaseLive]);

  useEffect(() => {
    // Load hospital doctors for linking
    const fetchDoctors = async () => {
      try {
        const docs = await dbService.getDoctors();
        setDoctorsList(docs);
        if (docs.length > 0 && !selectedDoctorId) {
          setSelectedDoctorId(docs[0].id);
        }
      } catch (err) {
        console.error('Failed to load doctors list:', err);
      }
    };
    fetchDoctors();
  }, []);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    try {
      let loginEmail = email;
      if (!loginEmail) {
        if (selectedRole === 'admin') loginEmail = 'admin@mitali-hosp.org';
        else if (selectedRole === 'lab_tech') loginEmail = 'lab@mitali-hosp.org';
        else if (selectedRole === 'radiology_tech') loginEmail = 'rad@mitali-hosp.org';
        else if (selectedRole === 'doctor') {
          const doc = doctorsList.find(d => d.id === selectedDoctorId);
          loginEmail = doc?.email || 'dr.mohamed@mitali-hosp.org';
        } else {
          loginEmail = 'reception@mitali-hosp.org';
        }
      }

      const ok = await login(
        loginEmail,
        selectedRole,
        selectedRole === 'doctor' ? selectedDoctorId : undefined
      );

      if (ok) {
        onSuccess();
        onClose();
      } else {
        setErrorMsg('فشل تسجيل الدخول، يرجى مراجعة الصلاحيات والبيانات المدخلة.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'حدث خطأ أثناء تسجيل الدخول.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFastDemoLogin = async (role: UserRole, docId?: string) => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      let demoEmail = 'reception@mitali-hosp.org';
      if (role === 'admin') demoEmail = 'admin@mitali-hosp.org';
      if (role === 'lab_tech') demoEmail = 'lab@mitali-hosp.org';
      if (role === 'radiology_tech') demoEmail = 'rad@mitali-hosp.org';
      if (role === 'doctor') {
        const doc = doctorsList.find(d => d.id === docId);
        demoEmail = doc?.email || (docId === 'doc-04' ? 'dr.heba@mitali-hosp.org' : docId === 'doc-03' ? 'dr.tarek@mitali-hosp.org' : 'dr.mohamed@mitali-hosp.org');
      }

      await login(demoEmail, role, docId);
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'حدث خطأ.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute left-4 top-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer transition-colors"
          title="إغلاق"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-5">
          <div className="w-12 h-12 bg-teal-50 text-teal-700 rounded-2xl mx-auto flex items-center justify-center mb-2">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">تسجيل دخول طاقم المستشفى</h3>
          <p className="text-xs text-slate-500 mt-1">
            بوابة مستقلة لكل دور: (استقبال عام • عيادة طبيب شخصية • إدارة عامة)
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Quick Demo Role Picker (Can be toggled or auto-hidden when Supabase is live) */}
        <div className="mb-5 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-700">
              دخول سريع لمعاينة العيادات والأدوار:
            </span>
            <button
              type="button"
              onClick={() => setShowDemoSection(!showDemoSection)}
              className="text-[11px] text-teal-700 hover:underline flex items-center gap-1 cursor-pointer"
            >
              {showDemoSection ? (
                <>
                  <span>إخفاء</span>
                  <ChevronUp className="w-3.5 h-3.5" />
                </>
              ) : (
                <>
                  <span>عرض الحسابات الجاهزة</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>

          {showDemoSection && (
            <div className="space-y-2 mt-2">
              <div className="text-[10px] text-slate-500 font-medium">حسابات الأطباء الشخصية (تفتح عيادة الطبيب ومرضاه فقط):</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleFastDemoLogin('doctor', 'doc-01')}
                  className="p-2.5 rounded-lg border border-blue-200 bg-white hover:bg-blue-50 text-xs font-bold text-blue-900 flex flex-col items-center gap-1 transition-colors cursor-pointer text-center"
                >
                  <Stethoscope className="w-4 h-4 text-blue-600" />
                  <span>د. محمد عبد الرحمن</span>
                  <span className="text-[9px] text-blue-700 font-semibold bg-blue-50 px-1.5 py-0.5 rounded-sm">عيادة الباطنة</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleFastDemoLogin('doctor', 'doc-04')}
                  className="p-2.5 rounded-lg border border-blue-200 bg-white hover:bg-blue-50 text-xs font-bold text-blue-900 flex flex-col items-center gap-1 transition-colors cursor-pointer text-center"
                >
                  <Stethoscope className="w-4 h-4 text-blue-600" />
                  <span>د. هبة إسماعيل الجمل</span>
                  <span className="text-[9px] text-blue-700 font-semibold bg-blue-50 px-1.5 py-0.5 rounded-sm">عيادة الأطفال</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleFastDemoLogin('doctor', 'doc-03')}
                  className="p-2.5 rounded-lg border border-blue-200 bg-white hover:bg-blue-50 text-xs font-bold text-blue-900 flex flex-col items-center gap-1 transition-colors cursor-pointer text-center"
                >
                  <Stethoscope className="w-4 h-4 text-blue-600" />
                  <span>د. طارق الشناوي</span>
                  <span className="text-[9px] text-blue-700 font-semibold bg-blue-50 px-1.5 py-0.5 rounded-sm">عيادة العظام</span>
                </button>
              </div>

              <div className="text-[10px] text-slate-500 font-medium pt-1">طاقم الفحوصات الطبية (المعمل والأشعة):</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleFastDemoLogin('lab_tech')}
                  className="p-2.5 rounded-lg border border-amber-200 bg-white hover:bg-amber-50 text-xs font-bold text-amber-950 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <FlaskConical className="w-4 h-4 text-amber-600" />
                  <div className="text-right">
                    <div>معمل التحاليل</div>
                    <div className="text-[9px] text-slate-500 font-normal">كيميائي / إبراهيم عبد السلام</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleFastDemoLogin('radiology_tech')}
                  className="p-2.5 rounded-lg border border-indigo-200 bg-white hover:bg-indigo-50 text-xs font-bold text-indigo-950 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Scan className="w-4 h-4 text-indigo-600" />
                  <div className="text-right">
                    <div>قسم الأشعة والتصوير</div>
                    <div className="text-[9px] text-slate-500 font-normal">أخصائي / مصطفى سالم</div>
                  </div>
                </button>
              </div>

              <div className="text-[10px] text-slate-500 font-medium pt-1">حسابات الاستقبال والإدارة:</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleFastDemoLogin('receptionist')}
                  className="p-2.5 rounded-lg border border-teal-200 bg-white hover:bg-teal-50 text-xs font-bold text-teal-900 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <UserCheck className="w-4 h-4 text-teal-600" />
                  <div className="text-right">
                    <div>استقبال المستشفى</div>
                    <div className="text-[9px] text-slate-500 font-normal">تسجيل المرضى وحضور كل الأطباء</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleFastDemoLogin('admin')}
                  className="p-2.5 rounded-lg border border-purple-200 bg-white hover:bg-purple-50 text-xs font-bold text-purple-900 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4 text-purple-600" />
                  <div className="text-right">
                    <div>مدير عام (Admin)</div>
                    <div className="text-[9px] text-slate-500 font-normal">صلاحيات كاملة وتحكم بالنظام</div>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Regular Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              الدور الوظيفي
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setSelectedRole('receptionist');
                  if (!email || email.includes('@mitali-hosp.org')) setEmail('reception@mitali-hosp.org');
                }}
                className={`py-2 text-xs font-semibold rounded-lg border cursor-pointer transition-colors text-center ${
                  selectedRole === 'receptionist'
                    ? 'border-teal-600 bg-teal-50 text-teal-900 shadow-xs'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                استقبال
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedRole('doctor');
                  const doc = doctorsList.find(d => d.id === selectedDoctorId) || doctorsList[0];
                  if (doc) {
                    setSelectedDoctorId(doc.id);
                    setEmail(doc.email || `${doc.id}@mitali-hosp.org`);
                  }
                }}
                className={`py-2 text-xs font-semibold rounded-lg border cursor-pointer transition-colors text-center ${
                  selectedRole === 'doctor'
                    ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-xs'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                طبيب
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedRole('lab_tech');
                  if (!email || email.includes('@mitali-hosp.org')) setEmail('lab@mitali-hosp.org');
                }}
                className={`py-2 text-xs font-semibold rounded-lg border cursor-pointer transition-colors text-center ${
                  selectedRole === 'lab_tech'
                    ? 'border-amber-600 bg-amber-50 text-amber-900 shadow-xs'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                فني معمل
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedRole('radiology_tech');
                  if (!email || email.includes('@mitali-hosp.org')) setEmail('rad@mitali-hosp.org');
                }}
                className={`py-2 text-xs font-semibold rounded-lg border cursor-pointer transition-colors text-center ${
                  selectedRole === 'radiology_tech'
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-900 shadow-xs'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                فني أشعة
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedRole('admin');
                  if (!email || email.includes('@mitali-hosp.org')) setEmail('admin@mitali-hosp.org');
                }}
                className={`py-2 text-xs font-semibold rounded-lg border cursor-pointer transition-colors text-center col-span-2 sm:col-span-1 ${
                  selectedRole === 'admin'
                    ? 'border-purple-600 bg-purple-50 text-purple-900 shadow-xs'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                مدير
              </button>
            </div>
          </div>

          {/* If Doctor is selected, show Doctor Selector */}
          {selectedRole === 'doctor' && (
            <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3">
              <label className="block text-xs font-bold text-blue-900 mb-1">
                تحديد الطبيب / العيادة الخاصة:
              </label>
              <select
                value={selectedDoctorId}
                onChange={e => {
                  const docId = e.target.value;
                  setSelectedDoctorId(docId);
                  const doc = doctorsList.find(d => d.id === docId);
                  if (doc) {
                    setEmail(doc.email || `${doc.id}@mitali-hosp.org`);
                  }
                }}
                className="w-full px-3 py-2 text-xs bg-white border border-blue-300 rounded-lg text-slate-800 focus:outline-hidden focus:border-blue-600 font-medium cursor-pointer"
              >
                {doctorsList.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.full_name} — {d.specialty_name} ({d.title})
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-blue-700 mt-1">
                سيتم فتح كشف وعيادة هذا الطبيب الشخصية وطابور مرضاه حصرياً.
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              البريد الإلكتروني المهني
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={selectedRole === 'doctor' ? 'dr.doctor@mitali-hosp.org' : 'staff@hospital.gov.eg'}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:border-teal-600 text-slate-900 bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              كلمة المرور
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:border-teal-600 text-slate-900 bg-white"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-2.5 text-xs font-bold text-white rounded-lg transition-colors cursor-pointer disabled:opacity-50 shadow-sm ${
              selectedRole === 'doctor'
                ? 'bg-blue-700 hover:bg-blue-800'
                : selectedRole === 'admin'
                ? 'bg-purple-700 hover:bg-purple-800'
                : 'bg-teal-700 hover:bg-teal-800'
            }`}
          >
            {isLoading
              ? 'جاري التحقق...'
              : selectedRole === 'doctor'
              ? 'دخول عيادتي الخاصة'
              : 'دخول البوابة الداخلية'}
          </button>
        </form>
      </div>
    </div>
  );
};
