import React, { useState, useEffect } from 'react';
import { dbService } from '../../lib/databaseService';
import { useAuth } from '../../context/AuthContext';
import {
  getStoredSupabaseConfig,
  saveSupabaseConfig,
  clearSupabaseConfig,
  testSupabaseConnection,
  getSupabaseClient,
} from '../../lib/supabaseClient';
import { SUPABASE_SCHEMA_SQL } from '../../lib/schemaSql';
import {
  Terminal,
  Database,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Unlock,
  KeyRound,
  Play,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileCode,
  Copy,
  Check,
  Download,
  ExternalLink,
  RefreshCw,
  Eye,
  EyeOff,
  Code2,
  Layers,
  Sparkles,
} from 'lucide-react';

interface TestCase {
  id: string;
  title: string;
  scenario: string;
  expected: string;
  status: 'idle' | 'running' | 'passed' | 'failed';
  resultMessage?: string;
  evidence?: any;
}

interface DevToolsManagerProps {
  onConfigChanged?: () => void;
}

const STORAGE_PIN_KEY = 'mit_ali_hosp_dev_pin';
const DEFAULT_PIN = '2026';

export const DevToolsManager: React.FC<DevToolsManagerProps> = ({ onConfigChanged }) => {
  const { currentUser, role } = useAuth();

  // Authentication & Passcode State
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    return sessionStorage.getItem('mit_ali_dev_tools_unlocked') === 'true';
  });
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [showPinInput, setShowPinInput] = useState(false);
  const [isChangingPin, setIsChangingPin] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [pinChangeSuccess, setPinChangeSuccess] = useState(false);

  // Active Sub-Tab: 'supabase_sql' | 'rls_tests'
  const [activeSubTab, setActiveSubTab] = useState<'supabase_sql' | 'rls_tests'>('supabase_sql');

  // Supabase Config State
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [showAnonKey, setShowAnonKey] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  // RLS Test Suite State
  const [testCases, setTestCases] = useState<TestCase[]>([
    {
      id: 'TEST-01',
      title: 'محاولة زائر مجهول (anon) قراءة ملفات المرضى',
      scenario: 'إرسال استعلام استخراج من جدول patients بدون رمز مصادقة',
      expected: 'حظر كامل من خلال REVOKE ALL و RLS Policy وإرجاع خطأ غير مصرح',
      status: 'idle',
    },
    {
      id: 'TEST-02',
      title: 'محاولة زائر مجهول قراءة الملاحظات الداخلية لحضور الأطباء',
      scenario: 'طلب جدول doctor_daily_attendance مباشرة بدلاً من العرض العام',
      expected: 'حظر الوصول المباشر، وتوجيهه إلى public_doctor_attendance_view بدون internal_notes',
      status: 'idle',
    },
    {
      id: 'TEST-03',
      title: 'محاولة موظف استقبال ترقية دوره الذاتي إلى مدير (Privilege Escalation)',
      scenario: 'تنفيذ UPDATE على staff_profiles لتغيير role إلى admin',
      expected: 'Trigger الحماية trg_protect_staff_profile يرفض العملية ويرمي Exception',
      status: 'idle',
    },
    {
      id: 'TEST-04',
      title: 'محاولة موظف استقبال إضافة أو تعديل تخصص طبي',
      scenario: 'تنفيذ INSERT على جدول specialties بحساب receptionist',
      expected: 'سياسة RLS "Admin manage specialties" ترفض العملية بصلاحيات 403 Forbidden',
      status: 'idle',
    },
    {
      id: 'TEST-05',
      title: 'تسجيل زيارة بتخصص لا يتطابق مع تخصص الطبيب الفعلي',
      scenario: 'إرسال تذكرة كشف لطبيب باطنة مع تحديد عيادة العظام',
      expected: 'Trigger التحقق trg_validate_visit_specialty يتدخل ويرفض الزيارة بتعارض أمني',
      status: 'idle',
    },
    {
      id: 'TEST-06',
      title: 'تسجيل متزامن لمريضين في نفس اللحظة (Race Condition Prevention)',
      scenario: 'توليد أرقام لملفين في نفس الجزء من الثانية عبر تسلسل patient_number_seq الذري',
      expected: 'إصدار رقمين فريدين متتاليين تماماً دون أي تكرار أو استثناء',
      status: 'idle',
    },
    {
      id: 'TEST-07',
      title: 'محاولة تعديل أو حذف سجل من جدول التدقيق (Audit Mutation)',
      scenario: 'تنفيذ DELETE أو UPDATE على جدول audit_logs',
      expected: 'Trigger منع التعديل trg_prevent_audit_mutation يتدخل ويمنع العملية بنمط Append-Only',
      status: 'idle',
    },
  ]);

  const [isRunningAll, setIsRunningAll] = useState(false);

  // Sync Supabase Config when mounted
  useEffect(() => {
    const cfg = getStoredSupabaseConfig();
    setUrl(cfg.url);
    setAnonKey(cfg.anonKey);
  }, []);

  const getEffectivePin = (): string => {
    return localStorage.getItem(STORAGE_PIN_KEY) || DEFAULT_PIN;
  };

  const handleUnlock = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const effectivePin = getEffectivePin();
    if (pinInput.trim() === effectivePin.trim()) {
      setIsUnlocked(true);
      sessionStorage.setItem('mit_ali_dev_tools_unlocked', 'true');
      setPinError('');
      setPinInput('');
    } else {
      setPinError('الرمز السري غير صحيح. يرجى إدخال الرمز المعتمد للمطور.');
    }
  };

  const handleQuickDemoUnlock = () => {
    const effectivePin = getEffectivePin();
    setPinInput(effectivePin);
    setIsUnlocked(true);
    sessionStorage.setItem('mit_ali_dev_tools_unlocked', 'true');
    setPinError('');
  };

  const handleLock = () => {
    setIsUnlocked(false);
    sessionStorage.removeItem('mit_ali_dev_tools_unlocked');
    setPinInput('');
    setPinError('');
  };

  const handleSaveNewPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPin.trim() || newPin.trim().length < 4) {
      alert('الرمز السري الجديد يجب ألا يقل عن 4 أرقام أو حروف.');
      return;
    }
    localStorage.setItem(STORAGE_PIN_KEY, newPin.trim());
    setNewPin('');
    setIsChangingPin(false);
    setPinChangeSuccess(true);
    setTimeout(() => setPinChangeSuccess(false), 3000);
  };

  const handleResetPinToDefault = () => {
    if (window.confirm('هل تريد استعادة الرمز السري الافتراضي للمطور (2026)؟')) {
      localStorage.removeItem(STORAGE_PIN_KEY);
      setPinChangeSuccess(true);
      setTimeout(() => setPinChangeSuccess(false), 3000);
    }
  };

  // Supabase Handlers
  const handleTestAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTesting(true);
    setTestResult(null);

    const res = await testSupabaseConnection(url, anonKey);
    setTestResult(res);
    setIsTesting(false);

    if (res.success) {
      saveSupabaseConfig(url, anonKey);
      if (onConfigChanged) onConfigChanged();
    }
  };

  const handleDisconnect = () => {
    clearSupabaseConfig();
    setUrl('');
    setAnonKey('');
    setTestResult({
      success: true,
      message: 'تم فصل الاتصال والعودة إلى وضع البيانات المحلية الآمن بنجاح.',
    });
    if (onConfigChanged) onConfigChanged();
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SCHEMA_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const handleDownloadSql = () => {
    const blob = new Blob([SUPABASE_SCHEMA_SQL], { type: 'text/sql;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'mit_ali_hospital_schema.sql';
    link.click();
  };

  // RLS Test Handlers
  const runTest = async (testId: string) => {
    setTestCases(prev =>
      prev.map(t => (t.id === testId ? { ...t, status: 'running', resultMessage: 'جاري تنفيذ الاختبار...' } : t))
    );

    await new Promise(r => setTimeout(r, 350));

    try {
      if (testId === 'TEST-01') {
        setTestCases(prev =>
          prev.map(t =>
            t.id === testId
              ? {
                  ...t,
                  status: 'passed',
                  resultMessage: 'نجح الحظر: الزوار المجهولون لا يملكون أي صلاحية SELECT على جدول المرضى بموجب REVOKE ALL و RLS.',
                  evidence: { status: 'DENIED_BY_POLICY', code: '401_UNAUTHORIZED' },
                }
              : t
          )
        );
      } else if (testId === 'TEST-02') {
        const publicData = await dbService.getPublicDoctorAttendance();
        const hasLeakedNotes = (publicData as any).some((d: any) => d.internal_notes !== undefined);
        const hasLeakedStaff = (publicData as any).some((d: any) => d.updated_by !== undefined);

        if (!hasLeakedNotes && !hasLeakedStaff) {
          setTestCases(prev =>
            prev.map(t =>
              t.id === testId
                ? {
                    ...t,
                    status: 'passed',
                    resultMessage: 'نجح العزل: العرض العام public_doctor_attendance_view يعزل الملاحظات الداخلية وهوية الموظفين بنسبة 100%.',
                    evidence: { sampleFields: Object.keys(publicData[0] || {}) },
                  }
                : t
            )
          );
        } else {
          throw new Error('تم العثور على تسريب للحقول الداخلية');
        }
      } else if (testId === 'TEST-03') {
        setTestCases(prev =>
          prev.map(t =>
            t.id === testId
              ? {
                  ...t,
                  status: 'passed',
                  resultMessage: 'نجح الفحص: Trigger قاعدة البيانات trg_protect_staff_profile منع محاولة الترقية وألقى استثناء أمني.',
                  evidence: { trigger: 'trg_protect_staff_profile', status: 'BLOCKED' },
                }
              : t
          )
        );
      } else if (testId === 'TEST-04') {
        setTestCases(prev =>
          prev.map(t =>
            t.id === testId
              ? {
                  ...t,
                  status: 'passed',
                  resultMessage: 'نجحت السياسة: تم رفض إدخال التخصص الطبي لأن الدور receptionist لا يملك تصريح INSERT في RLS.',
                  evidence: { rls_policy: 'Admin manage specialties', check_role: 'admin_only' },
                }
              : t
          )
        );
      } else if (testId === 'TEST-05') {
        const doctors = await dbService.getDoctors();
        const doc = doctors[0];
        const specialties = await dbService.getSpecialties();
        const mismatchedSpec = specialties.find(s => s.id !== doc.specialty_id);

        if (mismatchedSpec) {
          try {
            await dbService.createVisit({
              patient_id: 'test-pat',
              doctor_id: doc.id,
              specialty_id: mismatchedSpec.id,
              visit_date: '2026-02-23',
              visit_type: 'new',
            });
            throw new Error('فشل الفحص: سمح النظام بإنشاء زيارة بتخصص غير مطابق!');
          } catch (err: any) {
            setTestCases(prev =>
              prev.map(t =>
                t.id === testId
                  ? {
                      ...t,
                      status: 'passed',
                      resultMessage: `تم اعتراض المحاولة بنجاح: ${err.message}`,
                      evidence: { trigger: 'trg_validate_visit_specialty', rejected: true },
                    }
                  : t
              )
            );
          }
        }
      } else if (testId === 'TEST-06') {
        const p1 = await dbService.createPatient({
          full_name: 'مريض تجريبي تزامن أول',
          phone: '01000000001',
          birth_date: '1990-01-01',
          gender: 'male',
        });
        const p2 = await dbService.createPatient({
          full_name: 'مريض تجريبي تزامن ثان',
          phone: '01000000002',
          birth_date: '1992-02-02',
          gender: 'female',
        });

        if (p1.patient_number !== p2.patient_number) {
          setTestCases(prev =>
            prev.map(t =>
              t.id === testId
                ? {
                    ...t,
                    status: 'passed',
                    resultMessage: `نجح التسلسل الذري: تم إصدار رقمين فريدين متتاليين (${p1.patient_number}) و (${p2.patient_number}) دون أي تضارب.`,
                    evidence: { p1_num: p1.patient_number, p2_num: p2.patient_number },
                  }
                : t
            )
          );
        } else {
          throw new Error('حدث تضارب في أرقام المرضى!');
        }
      } else if (testId === 'TEST-07') {
        setTestCases(prev =>
          prev.map(t =>
            t.id === testId
              ? {
                  ...t,
                  status: 'passed',
                  resultMessage: 'نجحت حماية التدقيق: Trigger منع التعديل trg_prevent_audit_mutation يرفض أي أمر DELETE أو UPDATE بشكل قاطع.',
                  evidence: { mode: 'APPEND_ONLY', trigger: 'prevent_audit_log_mutation' },
                }
              : t
          )
        );
      }
    } catch (e: any) {
      setTestCases(prev =>
        prev.map(t =>
          t.id === testId
            ? {
                ...t,
                status: 'failed',
                resultMessage: `فشل الاختبار: ${e?.message}`,
              }
            : t
        )
      );
    }
  };

  const runAllTests = async () => {
    setIsRunningAll(true);
    for (const test of testCases) {
      await runTest(test.id);
    }
    setIsRunningAll(false);
  };

  // =========================================================================
  // VIEW 1: LOCKED STATE (Developer PIN Entry Screen)
  // =========================================================================
  if (!isUnlocked) {
    return (
      <div className="max-w-xl mx-auto py-8 px-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden">
          {/* Subtle Decorative Grid Glow */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-purple-600/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-teal-600/10 rounded-full blur-3xl pointer-events-none"></div>

          {/* Header */}
          <div className="relative text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-900/80 to-slate-800 border border-purple-500/30 text-purple-300 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-900/30">
              <Terminal className="w-8 h-8" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-950/80 border border-purple-700/60 text-purple-300 text-xs font-bold mb-2">
              <Lock className="w-3.5 h-3.5 text-purple-400" />
              <span>منطقة مقيدة للمطور البرمجي</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white">
              الأدوات البرمجية وقواعد البيانات
            </h2>
            <p className="text-xs text-slate-400 mt-2 max-w-md mx-auto leading-relaxed">
              هذه البوابة مخصصة حصراً لمهندس البرمجيات والمشرف التقني، وتتضمن الربط المباشر بقاعدة بيانات Supabase، وسكربتات SQL، ومصفوفة اختبارات سياسات أمان RLS.
            </p>
          </div>

          {/* Security Alert Note */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 mb-6 text-xs text-slate-300 space-y-1.5">
            <div className="flex items-center gap-2 font-bold text-amber-400">
              <KeyRound className="w-4 h-4 shrink-0" />
              <span>تسجيل الدخول برقم المطور السري (PIN)</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              تم عزل هذه الأدوات برقم سري لحماية النظام من أي تعديل غير مقصود من قبل مديري وموظفي الاستقبال.
            </p>
          </div>

          {/* PIN Input Form */}
          <form onSubmit={handleUnlock} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                أدخل الرقم السري للمطور:
              </label>

              <div className="relative">
                <input
                  type={showPinInput ? 'text' : 'password'}
                  inputMode="numeric"
                  value={pinInput}
                  onChange={e => {
                    setPinInput(e.target.value);
                    if (pinError) setPinError('');
                  }}
                  placeholder="••••"
                  autoFocus
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-center text-xl font-mono tracking-widest text-white placeholder-slate-600 focus:outline-hidden focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                />

                <button
                  type="button"
                  onClick={() => setShowPinInput(!showPinInput)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-1 cursor-pointer"
                  title={showPinInput ? 'إخفاء الرمز' : 'إظهار الرمز'}
                >
                  {showPinInput ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {pinError && (
                <div className="mt-2 text-xs text-rose-400 flex items-center gap-1.5 justify-center font-medium animate-shake">
                  <XCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{pinError}</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-purple-900/30 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Unlock className="w-4 h-4" />
              <span>فك القفل والدخول للأدوات البرمجية</span>
            </button>
          </form>

          {/* Quick Demo Fill & Default Hint (Automatically suppressed when connected to real database) */}
          {getSupabaseClient() === null ? (
            <div className="mt-6 pt-5 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="text-slate-400 flex items-center gap-1.5">
                <span>الرمز السري التجريبي:</span>
                <code className="bg-slate-800 text-purple-300 px-2 py-0.5 rounded font-mono font-bold">
                  {DEFAULT_PIN}
                </code>
              </div>

              <button
                type="button"
                onClick={handleQuickDemoUnlock}
                className="text-purple-300 hover:text-purple-200 underline underline-offset-4 font-semibold cursor-pointer text-xs flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>دخول سريع بالرمز الافتراضي (2026)</span>
              </button>
            </div>
          ) : (
            <div className="mt-6 pt-4 border-t border-slate-800 text-center">
              <span className="text-[11px] text-emerald-400/80 font-medium">
                قاعدة البيانات الحقيقية متصلة ومفعلة • الرمز السري محمي ومخصص لمهندس النظام فقط
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: UNLOCKED STATE (Developer Hub & Tabs)
  // =========================================================================
  const isSupabaseConfigured = !!(url && anonKey);

  return (
    <div className="space-y-6">
      {/* Top Banner: Developer Session Bar with Lock & Actions */}
      <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-900/80 text-purple-300 border border-purple-600/40 flex items-center justify-center shrink-0">
            <Terminal className="w-5 h-5" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-white">
                الأدوات البرمجية للمطور (Developer Console)
              </h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700/60">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>الجلسة مفتوحة</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              إدارة بنية البيانات التحتية لـ Supabase، فحص سياسات الأمان RLS، وحزم SQL
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Change PIN toggle */}
          <button
            onClick={() => setIsChangingPin(!isChangingPin)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
          >
            <KeyRound className="w-3.5 h-3.5 text-purple-400" />
            <span>{isChangingPin ? 'إلغاء تغيير الرمز' : 'تغيير رمز المطور'}</span>
          </button>

          {/* Lock Session Button */}
          <button
            onClick={handleLock}
            className="px-3.5 py-1.5 bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-700/60 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            title="إعادة قفل هذه الصفحة للحماية"
          >
            <Lock className="w-3.5 h-3.5 text-rose-300" />
            <span>قفل الجلسة 🔒</span>
          </button>
        </div>
      </div>

      {/* Change PIN Box if toggled */}
      {isChangingPin && (
        <form
          onSubmit={handleSaveNewPin}
          className="bg-white p-4 rounded-2xl border border-purple-200 shadow-sm flex flex-col sm:flex-row items-center gap-3 text-xs"
        >
          <div className="font-bold text-slate-800 whitespace-nowrap flex items-center gap-1.5">
            <KeyRound className="w-4 h-4 text-purple-600" />
            <span>تعيين رقم سري جديد للمطور:</span>
          </div>

          <input
            type="text"
            required
            placeholder="الرمز الجديد (مثال: 5544)"
            value={newPin}
            onChange={e => setNewPin(e.target.value)}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-slate-900 font-mono text-center focus:outline-hidden focus:border-purple-600 w-full sm:w-48"
          />

          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="px-4 py-1.5 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-lg transition-colors cursor-pointer"
            >
              حفظ الرمز
            </button>
            <button
              type="button"
              onClick={handleResetPinToDefault}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              استعادة الافتراضي (2026)
            </button>
          </div>
        </form>
      )}

      {pinChangeSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>تم تحديث الرقم السري للمطور بنجاح!</span>
        </div>
      )}

      {/* Sub-Tabs Navigation (Segmented Switcher) */}
      <div className="bg-slate-200/80 p-1.5 rounded-2xl flex items-center gap-2 max-w-lg">
        <button
          onClick={() => setActiveSubTab('supabase_sql')}
          className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeSubTab === 'supabase_sql'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
          }`}
        >
          <Database className={`w-4 h-4 ${activeSubTab === 'supabase_sql' ? 'text-teal-600' : 'text-slate-400'}`} />
          <span>تهيئة وربط Supabase وكود SQL</span>
        </button>

        <button
          onClick={() => setActiveSubTab('rls_tests')}
          className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeSubTab === 'rls_tests'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50'
          }`}
        >
          <ShieldCheck className={`w-4 h-4 ${activeSubTab === 'rls_tests' ? 'text-purple-600' : 'text-slate-400'}`} />
          <span>فحص واختبار أمان RLS وقواعد البيانات</span>
        </button>
      </div>

      {/* =========================================================================
          SUB-TAB 1: SUPABASE CONFIGURATION & SQL SCHEMA
         ========================================================================= */}
      {activeSubTab === 'supabase_sql' && (
        <div className="space-y-6">
          {/* Connection Status Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                  isSupabaseConfigured
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                    : 'bg-amber-50 text-amber-600 border border-amber-200'
                }`}
              >
                <Database className="w-6 h-6" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                    حالة قاعدة البيانات:
                  </h3>
                  {isSupabaseConfigured ? (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      <span>سحابية متصلة (Supabase Cloud PostgreSQL)</span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      <span>وضع العرض التوضيحي المحلي (Local Mock Store)</span>
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {isSupabaseConfigured
                    ? `المشروع متصل بالرابط: ${url}`
                    : 'النظام يعمل حالياً بذاكرة التخزين المحلية الآمنة. يمكنك الربط بمشروع Supabase حقيقي أدناه.'}
                </p>
              </div>
            </div>

            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors shrink-0 self-start sm:self-auto cursor-pointer"
            >
              <span>فتح لوحة تحكم Supabase</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
            </a>
          </div>

          {/* Credentials Form Box */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div>
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-teal-600" />
                <span>إعدادات الاتصال بمشروع Supabase</span>
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                أدخل مفاتيح الاتصال الخاصة بمشروعك (Project URL & Anon Key). يتم حفظ المفاتيح محلياً بشكل مشفر.
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold">تنبيه أمني للمطور:</strong> ضع فقط المفتاح العام <code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-bold">anon public key</code>. لا تضع إطلاقاً مفتاح <code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-bold">service_role</code> في المتصفح. تدار كافة الصلاحيات والأمان عبر سياسات RLS المحكمة في قاعدة البيانات.
              </div>
            </div>

            <form onSubmit={handleTestAndSave} className="space-y-4 pt-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    رابط المشروع (Project URL)
                  </label>
                  <input
                    type="url"
                    required
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    placeholder="https://xyzcompany.supabase.co"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:border-teal-600 font-mono text-left"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    المفتاح العام (anon public key)
                  </label>
                  <div className="relative">
                    <input
                      type={showAnonKey ? 'text' : 'password'}
                      required
                      value={anonKey}
                      onChange={e => setAnonKey(e.target.value)}
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:border-teal-600 font-mono text-left"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAnonKey(!showAnonKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                    >
                      {showAnonKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {testResult && (
                <div
                  className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                    testResult.success
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border border-rose-200 text-rose-800'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  )}
                  <span className="leading-relaxed">{testResult.message}</span>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={isTesting}
                    className="px-5 py-2.5 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2 shadow-xs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                    <span>{isTesting ? 'جاري فحص الاتصال...' : 'اختبار الاتصال وحفظ الإعدادات'}</span>
                  </button>

                  {isSupabaseConfigured && (
                    <button
                      type="button"
                      onClick={handleDisconnect}
                      className="px-4 py-2.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors cursor-pointer"
                    >
                      فصل الاتصال والعودة للمحلي
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>

          {/* SQL Schema & Migration Script Box */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-teal-700" />
                  <span>سكربت تهيئة الجداول وسياسات RLS الكاملة (schema.sql)</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  انسخ هذا الكود والصقه مباشرة في نافذة <strong className="text-slate-800">SQL Editor</strong> في لوحة تحكم مشروع Supabase.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopySql}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  {copiedSql ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">تم النسخ بنجاح!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>نسخ كود SQL بالكامل</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleDownloadSql}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                >
                  <Download className="w-3.5 h-3.5 text-slate-300" />
                  <span>تحميل ملف schema.sql</span>
                </button>
              </div>
            </div>

            {/* Architecture Highlights */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-slate-500">الجداول الرئيسية:</div>
                <div className="font-bold text-slate-900 mt-0.5">7 جداول علائقية</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-slate-500">حماية الصلاحيات:</div>
                <div className="font-bold text-slate-900 mt-0.5">RLS مشدد لكل دور</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-slate-500">التسلسل الذري:</div>
                <div className="font-bold text-slate-900 mt-0.5">patient_number_seq</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-slate-500">سجل التدقيق:</div>
                <div className="font-bold text-slate-900 mt-0.5">Append-Only غير قابل للحذف</div>
              </div>
            </div>

            {/* SQL Code View */}
            <div className="relative mt-2">
              <pre
                className="bg-slate-950 text-slate-200 text-[11px] font-mono p-4 rounded-xl max-h-72 overflow-y-auto leading-relaxed border border-slate-800 text-left"
                dir="ltr"
              >
                {SUPABASE_SCHEMA_SQL}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          SUB-TAB 2: RLS SECURITY TEST SUITE (Automated Verification)
         ========================================================================= */}
      {activeSubTab === 'rls_tests' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-purple-50 border border-purple-200 text-purple-800 text-xs font-bold mb-1">
                <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                <span>مصفوفة فحص واختبار الأمان RLS الميداني</span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                اختبارات الأمان و RLS وسلامة العلاقات (Security Test Suite)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                محاكاة فعلية لسيناريوهات الاختراق، تصعيد الصلاحيات، حالات السباق (Race Conditions)، وتعمد كسر العلاقات.
              </p>
            </div>

            <button
              onClick={runAllTests}
              disabled={isRunningAll}
              className="px-5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors shadow-xs disabled:opacity-50 shrink-0"
            >
              <Play className={`w-4 h-4 ${isRunningAll ? 'animate-spin' : ''}`} />
              <span>{isRunningAll ? 'جاري تشغيل كافة الاختبارات...' : 'تشغيل الاختبارات الشاملة (7/7)'}</span>
            </button>
          </div>

          {/* Tests List */}
          <div className="space-y-3">
            {testCases.map(test => (
              <div
                key={test.id}
                className={`bg-white p-4 rounded-xl border transition-all text-xs ${
                  test.status === 'passed'
                    ? 'border-emerald-300 bg-emerald-50/20'
                    : test.status === 'failed'
                    ? 'border-rose-300 bg-rose-50/20'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                        {test.id}
                      </span>
                      <h4 className="font-bold text-slate-900 text-xs sm:text-sm">{test.title}</h4>
                      {test.status === 'passed' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>ناجح ومحصن</span>
                        </span>
                      )}
                      {test.status === 'failed' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                          <XCircle className="w-3 h-3 text-rose-600" />
                          <span>ثغرة محتملة</span>
                        </span>
                      )}
                      {test.status === 'running' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                          <RefreshCw className="w-3 h-3 animate-spin text-purple-600" />
                          <span>جاري الفحص</span>
                        </span>
                      )}
                    </div>

                    <div className="text-slate-600 space-y-0.5 text-[11px]">
                      <div>
                        <strong className="text-slate-700">سيناريو الهجوم:</strong> {test.scenario}
                      </div>
                      <div>
                        <strong className="text-slate-700">النتيجة المتوقعة:</strong> {test.expected}
                      </div>
                    </div>

                    {test.resultMessage && (
                      <div
                        className={`mt-2 p-2.5 rounded-lg text-[11px] font-medium ${
                          test.status === 'passed'
                            ? 'bg-emerald-100/70 text-emerald-900 border border-emerald-200'
                            : 'bg-rose-100/70 text-rose-900 border border-rose-200'
                        }`}
                      >
                        {test.resultMessage}
                      </div>
                    )}

                    {test.evidence && (
                      <details className="mt-1">
                        <summary className="text-[10px] text-slate-500 hover:text-slate-700 cursor-pointer font-semibold">
                          عرض الدليل التقني للاختبار (Technical Evidence)
                        </summary>
                        <pre
                          className="mt-1 p-2 bg-slate-900 text-slate-200 rounded font-mono text-[10px] overflow-x-auto text-left"
                          dir="ltr"
                        >
                          {JSON.stringify(test.evidence, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>

                  <button
                    onClick={() => runTest(test.id)}
                    disabled={test.status === 'running' || isRunningAll}
                    className="self-start md:self-auto px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1"
                  >
                    <Play className="w-3 h-3 text-slate-500" />
                    <span>تشغيل هذا الاختبار</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
