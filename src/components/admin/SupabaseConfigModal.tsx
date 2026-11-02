import React, { useState, useEffect } from 'react';
import {
  getStoredSupabaseConfig,
  saveSupabaseConfig,
  clearSupabaseConfig,
  testSupabaseConnection,
} from '../../lib/supabaseClient';
import { SUPABASE_SCHEMA_SQL } from '../../lib/schemaSql';
import {
  Database,
  X,
  Copy,
  Check,
  Download,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  ShieldAlert,
  Code,
  Lock,
  Unlock,
  KeyRound,
  Sparkles,
} from 'lucide-react';

interface SupabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigChanged: () => void;
}

const STORAGE_PIN_KEY = 'mit_ali_hosp_dev_pin';
const DEFAULT_PIN = '2026';

export const SupabaseConfigModal: React.FC<SupabaseConfigModalProps> = ({
  isOpen,
  onClose,
  onConfigChanged,
}) => {
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [copiedSql, setCopiedSql] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  // Developer PIN state
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    return typeof window !== 'undefined' && sessionStorage.getItem('mit_ali_dev_tools_unlocked') === 'true';
  });
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  useEffect(() => {
    if (isOpen) {
      const cfg = getStoredSupabaseConfig();
      setUrl(cfg.url);
      setAnonKey(cfg.anonKey);
      setTestResult(null);
      setIsUnlocked(sessionStorage.getItem('mit_ali_dev_tools_unlocked') === 'true');
      setPinError('');
      setPinInput('');
    }
  }, [isOpen]);

  const handleUnlockPin = (e: React.FormEvent) => {
    e.preventDefault();
    const effectivePin = localStorage.getItem(STORAGE_PIN_KEY) || DEFAULT_PIN;
    if (pinInput.trim() === effectivePin.trim()) {
      setIsUnlocked(true);
      sessionStorage.setItem('mit_ali_dev_tools_unlocked', 'true');
      setPinError('');
    } else {
      setPinError('الرمز السري غير صحيح. يرجى إدخال رمز المطور (الافتراضي: 2026).');
    }
  };

  const handleQuickUnlock = () => {
    const effectivePin = localStorage.getItem(STORAGE_PIN_KEY) || DEFAULT_PIN;
    setPinInput(effectivePin);
    setIsUnlocked(true);
    sessionStorage.setItem('mit_ali_dev_tools_unlocked', 'true');
    setPinError('');
  };

  if (!isOpen) return null;

  const handleTestAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTesting(true);
    setTestResult(null);

    const res = await testSupabaseConnection(url, anonKey);
    setTestResult(res);
    setIsTesting(false);

    if (res.success) {
      saveSupabaseConfig(url, anonKey);
      onConfigChanged();
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
    onConfigChanged();
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

  if (!isUnlocked) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 text-white shadow-2xl relative my-8 text-center">
          <button
            onClick={onClose}
            className="absolute left-4 top-4 text-slate-400 hover:text-slate-200 p-1 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-14 h-14 rounded-2xl bg-purple-900/60 text-purple-300 border border-purple-600/40 flex items-center justify-center mx-auto mb-3">
            <Lock className="w-7 h-7" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-950/80 border border-purple-700/60 text-purple-300 text-xs font-bold mb-2">
            <span>منطقة المطور المقيدة</span>
          </div>

          <h3 className="text-lg font-bold text-white mb-1">
            إعدادات قاعدة بيانات Supabase
          </h3>
          <p className="text-xs text-slate-400 mb-5 leading-relaxed">
            الوصول إلى مفاتيح الربط وتعديل الاتصال المباشر مقيد برقم سري للمطور فقط لمنع العبث غير المقصود.
          </p>

          <form onSubmit={handleUnlockPin} className="space-y-4">
            <input
              type="password"
              inputMode="numeric"
              value={pinInput}
              onChange={e => {
                setPinInput(e.target.value);
                if (pinError) setPinError('');
              }}
              placeholder="••••"
              autoFocus
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-center text-lg font-mono tracking-widest text-white placeholder-slate-600 focus:outline-hidden focus:border-purple-500"
            />

            {pinError && (
              <div className="text-xs text-rose-400 font-medium">{pinError}</div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <Unlock className="w-4 h-4" />
              <span>فك القفل والدخول للإعدادات</span>
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>الرمز الافتراضي: <code className="text-purple-300 font-mono font-bold">{DEFAULT_PIN}</code></span>
            <button
              type="button"
              onClick={handleQuickUnlock}
              className="text-purple-300 hover:text-purple-200 underline font-semibold cursor-pointer flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" />
              <span>دخول سريع (2026)</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full p-6 shadow-2xl relative my-8">
        <button
          onClick={onClose}
          className="absolute left-4 top-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-6 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                تهيئة وربط قاعدة بيانات Supabase PostgreSQL
              </h3>
              <p className="text-xs text-slate-500">
                إدارة الاتصال المباشر بالمشروع وتطبيق سياسات RLS والأمان
              </p>
            </div>
          </div>
        </div>

        {/* Security Warning Notice */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 mb-5 text-xs text-amber-900 flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold">تنبيه أمني هام:</strong> استخدم فقط المفتاح العام <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">anon key</code>. لا تضع إطلاقاً مفتاح <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">service_role</code> في المتصفح. تدار كافة الصلاحيات عبر سياسات RLS المحكمة في قاعدة البيانات.
          </div>
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleTestAndSave} className="space-y-4 mb-6">
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
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:border-teal-600 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              المفتاح العام (anon public key)
            </label>
            <input
              type="password"
              required
              value={anonKey}
              onChange={e => setAnonKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:border-teal-600 font-mono"
            />
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
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              )}
              <span className="leading-relaxed">{testResult.message}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={isTesting}
                className="px-4 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                {isTesting ? 'جاري فحص الاتصال...' : 'اختبار الاتصال وحفظ الإعدادات'}
              </button>

              {url && (
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                >
                  فصل الاتصال
                </button>
              )}
            </div>

            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-teal-700 hover:underline flex items-center gap-1 font-semibold"
            >
              <span>فتح لوحة تحكم Supabase</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </form>

        {/* SQL Migration Script Section */}
        <div className="pt-5 border-t border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Code className="w-4 h-4 text-teal-700" />
                <span>ملف إنشاء الجداول وسياسات RLS الكاملة (schema.sql)</span>
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                انسخ هذا الكود والصقه في نافذة <strong className="text-slate-800">SQL Editor</strong> في مشروع Supabase الخاص بك.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopySql}
                className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                {copiedSql ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">تم النسخ!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>نسخ الكود</span>
                  </>
                )}
              </button>

              <button
                onClick={handleDownloadSql}
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-slate-300" />
                <span>تحميل .sql</span>
              </button>
            </div>
          </div>

          <div className="relative">
            <pre className="bg-slate-900 text-slate-200 text-[11px] font-mono p-4 rounded-xl max-h-48 overflow-y-auto leading-relaxed border border-slate-800 text-left dir-ltr">
              {SUPABASE_SCHEMA_SQL}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
