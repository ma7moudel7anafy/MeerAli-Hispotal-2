import React, { useState } from 'react';
import { DiagnosticService } from '../../types';
import { normalizeArabic } from '../../lib/databaseService';
import {
  FlaskConical,
  Scan,
  Clock,
  AlertTriangle,
  Search,
  FileSpreadsheet,
  X,
  Tag,
  CheckCircle,
} from 'lucide-react';

interface DiagnosticsListProps {
  services: DiagnosticService[];
  onBookService?: (service: DiagnosticService) => void;
}

export const DiagnosticsList: React.FC<DiagnosticsListProps> = ({ services, onBookService }) => {
  const [filterType, setFilterType] = useState<'all' | 'lab' | 'radiology'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Popular prescription shortcuts
  const prescriptionShortcuts = [
    { label: 'CBC صورة دم', query: 'CBC' },
    { label: 'سكر صائم وفاطر', query: 'FBS' },
    { label: 'تراكمي HbA1c', query: 'HbA1c' },
    { label: 'وظائف كبد LFT', query: 'LFT' },
    { label: 'وظائف كلى KFT', query: 'KFT' },
    { label: 'كوليسترول ودهون', query: 'Lipid' },
    { label: 'غدة TSH', query: 'TSH' },
    { label: 'سونار بطن وحوض', query: 'سونار' },
    { label: 'أشعة عادية CXR', query: 'CXR' },
    { label: 'رسم قلب ECG', query: 'ECG' },
  ];

  const filtered = services.filter(service => {
    // 1. Filter by category
    const matchesCategory = filterType === 'all' || service.service_type === filterType;
    if (!matchesCategory) return false;

    // 2. Search query matching
    const q = searchQuery.trim();
    if (!q) return true;

    const normalizedQuery = normalizeArabic(q);
    const normalizedName = normalizeArabic(service.name);
    const latinName = (service.latin_name || '').toLowerCase();
    const queryLower = q.toLowerCase();

    // Check Arabic name
    if (normalizedName.includes(normalizedQuery)) return true;

    // Check Latin / English prescription name
    if (latinName.includes(queryLower)) return true;

    // Check prescription terms & abbreviations
    if (
      service.prescription_terms &&
      service.prescription_terms.some(term => {
        const normTerm = normalizeArabic(term);
        return normTerm.includes(normalizedQuery) || term.toLowerCase().includes(queryLower);
      })
    ) {
      return true;
    }

    return false;
  });

  return (
    <section
      id="diagnostics"
      className="py-16 bg-gradient-to-b from-cyan-50/50 via-white to-slate-50 border-t-4 border-cyan-600 border-b border-slate-200"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-5 mb-8">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-100 text-cyan-900 border border-cyan-200 text-xs font-bold mb-2.5">
              <span className="w-2 h-2 rounded-full bg-cyan-600"></span>
              <span>القسم الثالث: التحاليل والفحوصات الطبية</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              خدمات المعمل ووحدة الأشعة والسونار
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-2 max-w-2xl">
              ابحث عن أي تحليل أو فحص بالاسم العربي أو الرموز الطبية واللاتينية المكتوبة في روشتة الطبيب لمعرفة السعر الخيري وتعليمات التحضير المسبق.
            </p>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 p-1.5 bg-white rounded-2xl border border-slate-200 shadow-2xs shrink-0">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                filterType === 'all'
                  ? 'bg-cyan-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              كافة الفحوصات ({services.length})
            </button>
            <button
              onClick={() => setFilterType('lab')}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                filterType === 'lab'
                  ? 'bg-cyan-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <FlaskConical className="w-3.5 h-3.5" />
              <span>معمل التحاليل</span>
            </button>
            <button
              onClick={() => setFilterType('radiology')}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                filterType === 'radiology'
                  ? 'bg-cyan-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Scan className="w-3.5 h-3.5" />
              <span>الأشعة والسونار</span>
            </button>
          </div>
        </div>

        {/* Dedicated Prescription & Medical Name Search Box */}
        <div className="bg-white p-5 rounded-2xl border-2 border-cyan-200 shadow-xs mb-8 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <label
              htmlFor="diagnostic-search"
              className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-2"
            >
              <FileSpreadsheet className="w-4 h-4 text-cyan-700" />
              <span>البحث السريع بالاسم العربي أو الرمز الطبي المكتوب بالروشتة:</span>
            </label>

            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-xs text-rose-600 hover:text-rose-800 flex items-center gap-1 self-start sm:self-auto cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>مسح البحث وإظهار الكل</span>
              </button>
            )}
          </div>

          <div className="relative">
            <Search className="w-5 h-5 text-cyan-600 absolute right-3.5 top-3.5 pointer-events-none" />
            <input
              id="diagnostic-search"
              type="text"
              placeholder="اكتب اسم التحليل أو اختصار الروشتة (مثل: CBC, سكر صائم, سونار, X-Ray, وظائف كبد, HbA1c, TSH...)"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-4 pr-11 py-3 text-xs sm:text-sm font-semibold bg-cyan-50/40 border-2 border-cyan-300 focus:border-cyan-600 focus:bg-white rounded-xl focus:outline-hidden focus:ring-2 focus:ring-cyan-200 transition-all text-slate-900"
            />
          </div>

          {/* Quick Prescription Shortcuts / Tags */}
          <div className="pt-1 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1 ml-1">
              <Tag className="w-3 h-3 text-cyan-600" />
              <span>فحوصات شائعة بالروشتات:</span>
            </span>
            {prescriptionShortcuts.map((chip, idx) => {
              const isSelected = searchQuery.toLowerCase() === chip.query.toLowerCase();
              return (
                <button
                  key={idx}
                  onClick={() => setSearchQuery(isSelected ? '' : chip.query)}
                  className={`px-2.5 py-1 text-xs rounded-lg font-mono font-medium transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-700 text-white font-bold shadow-2xs'
                      : 'bg-slate-100 hover:bg-cyan-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Results Counter Banner */}
        {searchQuery.trim() && (
          <div className="mb-6 flex items-center justify-between text-xs bg-cyan-100/70 border border-cyan-200 text-cyan-900 px-4 py-2.5 rounded-xl font-medium">
            <span>
              نتائج البحث عن: <strong className="font-bold text-cyan-950">«{searchQuery}»</strong> — تم العثور على ({filtered.length}) فحص متوفر.
            </span>
            <button
              onClick={() => setSearchQuery('')}
              className="text-cyan-800 hover:underline font-bold"
            >
              عرض كافة الخدمات
            </button>
          </div>
        )}

        {/* Services Grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300 p-6">
            <AlertTriangle className="w-9 h-9 text-amber-500 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-800 mb-1">
              لم يتم العثور على فحص يطابق «{searchQuery}»
            </h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              يمكنك كتابة اختصار الروشتة بالإنجليزي (مثل CBC أو CXR أو US) أو مراجعة معمل المستشفى والاستقبال هاتفياً على الرقم: 050-2580111.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(service => (
              <div
                key={service.id}
                className="bg-white border-2 border-slate-200/90 rounded-2xl p-5 hover:border-cyan-400 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold ${
                        service.service_type === 'lab'
                          ? 'bg-teal-50 text-teal-800 border border-teal-200'
                          : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                      }`}
                    >
                      {service.service_type === 'lab' ? (
                        <>
                          <FlaskConical className="w-3 h-3 text-teal-600" />
                          <span>تحليل معملي</span>
                        </>
                      ) : (
                        <>
                          <Scan className="w-3 h-3 text-indigo-600" />
                          <span>أشعة وسونار</span>
                        </>
                      )}
                    </span>

                    <span className="text-xs text-slate-500 font-mono tabular-nums flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{service.estimated_duration || 'خلال ساعات'}</span>
                    </span>
                  </div>

                  {/* Service Arabic Title */}
                  <h3 className="text-base font-extrabold text-slate-900 mb-1">
                    {service.name}
                  </h3>

                  {/* Prescription / Latin Medical Name */}
                  {service.latin_name && (
                    <div className="font-mono text-xs font-bold text-cyan-800 bg-cyan-50/80 px-2 py-1 rounded-md mb-3 border border-cyan-200/70 inline-block text-left dir-ltr">
                      {service.latin_name}
                    </div>
                  )}

                  {/* Prescription Keyword Tags */}
                  {service.prescription_terms && service.prescription_terms.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-1">
                      {service.prescription_terms.slice(0, 5).map((term, tIdx) => (
                        <span
                          key={tIdx}
                          className="text-[10px] bg-slate-100 text-slate-600 font-mono px-1.5 py-0.5 rounded"
                        >
                          {term}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Preparation Instructions */}
                  {service.preparation_instructions && (
                    <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-3 mb-4 text-xs text-amber-900 flex items-start gap-1.5 leading-relaxed">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block mb-0.5">تعليمات التحضير بالروشتة:</span>
                        <span>{service.preparation_instructions}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Price Banner */}
                <div className="pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-500 font-medium block text-[11px]">سعر الفحص الخيري:</span>
                    <span className="text-base sm:text-lg font-extrabold text-teal-700 font-mono tabular-nums">
                      {service.price} ج.م
                    </span>
                  </div>

                  {onBookService && (
                    <button
                      type="button"
                      onClick={() => onBookService(service)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold text-white transition-all shadow-xs cursor-pointer ${
                        service.service_type === 'lab'
                          ? 'bg-amber-600 hover:bg-amber-700'
                          : 'bg-indigo-600 hover:bg-indigo-700'
                      }`}
                    >
                      حجز تذكرة الفحص
                    </button>
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
