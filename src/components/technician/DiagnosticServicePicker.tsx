import React, { useState, useMemo } from 'react';
import { DiagnosticService } from '../../types';
import { getAllDiagnosticServices } from '../../lib/databaseService';
import {
  Search,
  Check,
  Plus,
  X,
  Tag,
  FlaskConical,
  Scan,
  Clock,
  Sparkles,
  Layers,
} from 'lucide-react';

interface DiagnosticServicePickerProps {
  department: 'lab' | 'radiology';
  selectedServiceIds: string[];
  onToggleService: (service: DiagnosticService) => void;
  customTests: string;
  onChangeCustomTests: (val: string) => void;
  onClearSelected?: () => void;
}

export const DiagnosticServicePicker: React.FC<DiagnosticServicePickerProps> = ({
  department,
  selectedServiceIds,
  onToggleService,
  customTests,
  onChangeCustomTests,
  onClearSelected,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  // Load services for this department
  const allServices = useMemo(() => {
    try {
      const list = getAllDiagnosticServices();
      return list.filter(
        s => (s.type === department || s.service_type === department) && (s.is_active !== false && s.is_available !== false)
      );
    } catch {
      return [];
    }
  }, [department]);

  // Derive available categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    allServices.forEach(s => {
      if (s.category) set.add(s.category);
    });
    return Array.from(set);
  }, [allServices]);

  // Filtered services based on search and category
  const filteredServices = useMemo(() => {
    return allServices.filter(s => {
      const q = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        (s.latin_name && s.latin_name.toLowerCase().includes(q)) ||
        (s.prescription_terms && s.prescription_terms.some(t => t.toLowerCase().includes(q))) ||
        (s.category && s.category.toLowerCase().includes(q));

      const matchesCat = activeCategory === 'all' || s.category === activeCategory;

      return matchesSearch && matchesCat;
    });
  }, [allServices, searchTerm, activeCategory]);

  // Selected services list
  const selectedServices = useMemo(() => {
    return allServices.filter(s => selectedServiceIds.includes(s.id));
  }, [allServices, selectedServiceIds]);

  const totalCalculatedPrice = selectedServices.reduce((sum, s) => sum + (s.price || 0), 0);

  const isLab = department === 'lab';
  const theme = isLab
    ? {
        border: 'border-amber-400',
        bgLight: 'bg-amber-50',
        bgSelected: 'bg-amber-600',
        textSelected: 'text-amber-800',
        badge: 'bg-amber-100 text-amber-900 border-amber-300',
        btnBg: 'bg-amber-600 hover:bg-amber-700',
        ring: 'focus:border-amber-500',
      }
    : {
        border: 'border-indigo-400',
        bgLight: 'bg-indigo-50',
        bgSelected: 'bg-indigo-600',
        textSelected: 'text-indigo-800',
        badge: 'bg-indigo-100 text-indigo-900 border-indigo-300',
        btnBg: 'bg-indigo-600 hover:bg-indigo-700',
        ring: 'focus:border-indigo-500',
      };

  return (
    <div className="space-y-3 text-xs">
      {/* Selected Items Summary Bar */}
      <div className={`p-3 rounded-xl border ${theme.border} ${theme.bgLight} space-y-2`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isLab ? <FlaskConical className="w-4 h-4 text-amber-700" /> : <Scan className="w-4 h-4 text-indigo-700" />}
            <span className="font-extrabold text-slate-900">
              {isLab ? 'التحاليل المختارة من القائمة' : 'الفحوصات الإشعاعية المختارة'}
              <span className="mx-1 px-1.5 py-0.5 rounded-full bg-white text-[11px] font-bold border border-slate-200">
                {selectedServices.length}
              </span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-bold text-slate-700">
              إجمالي الرسوم التقديرية:{' '}
              <strong className="text-sm font-mono text-emerald-800">{totalCalculatedPrice} ج.م</strong>
            </span>
            {selectedServices.length > 0 && onClearSelected && (
              <button
                type="button"
                onClick={onClearSelected}
                className="text-rose-600 hover:text-rose-800 text-[10px] font-bold cursor-pointer"
              >
                مسح التحديد
              </button>
            )}
          </div>
        </div>

        {/* Selected Badges */}
        {selectedServices.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pt-1">
            {selectedServices.map(svc => (
              <span
                key={svc.id}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold shadow-xs border ${theme.badge}`}
              >
                <span>{svc.name}</span>
                <span className="font-mono text-[10px] text-slate-500">({svc.price} ج)</span>
                <button
                  type="button"
                  onClick={() => onToggleService(svc)}
                  className="hover:text-rose-600 p-0.5 rounded-full cursor-pointer"
                  title="إلغاء الفحص"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-slate-500 italic">
            لم يتم اختيار أي فحص بعد. انقر على أي فحص أدناه لإضافته فوراً إلى القائمة وحساب الرسوم.
          </p>
        )}
      </div>

      {/* Search & Category Filter */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder={
              isLab
                ? 'ابحث باسم التحليل (مثل: CBC، سكر صائم، وظائف كبد، سرعة ترسيب، غدة...)'
                : 'ابحث باسم الفحص (مثل: أشعة صدر X-Ray، سونار بطن، إيكو قلب، سونار حمل...)'
            }
            className={`w-full pr-9 pl-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-hidden ${theme.ring} text-slate-800 placeholder:text-slate-400`}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute left-2.5 top-2 text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {categories.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
            <button
              type="button"
              onClick={() => setActiveCategory('all')}
              className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer whitespace-nowrap transition-colors ${
                activeCategory === 'all'
                  ? `${theme.btnBg} text-white`
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              كافة الفئات ({allServices.length})
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`px-2.5 py-1 rounded-lg font-bold cursor-pointer whitespace-nowrap transition-colors ${
                  activeCategory === cat
                    ? `${theme.btnBg} text-white`
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Catalog Grid */}
      <div className="border border-slate-200 rounded-xl max-h-52 overflow-y-auto p-2 bg-slate-50/50 space-y-1.5">
        {filteredServices.length === 0 ? (
          <div className="py-6 text-center text-slate-400">
            <p>لا توجد نتائج مطابقة لبحثك "{searchTerm}"</p>
            <p className="text-[10px] mt-1 text-slate-500">يمكنك كتابة اسم التحليل في خانة الفحوصات الإضافية أدناه</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {filteredServices.map(svc => {
              const isSelected = selectedServiceIds.includes(svc.id);
              return (
                <button
                  type="button"
                  key={svc.id}
                  onClick={() => onToggleService(svc)}
                  className={`p-2 rounded-xl text-right transition-all flex items-start justify-between gap-2 border cursor-pointer ${
                    isSelected
                      ? `bg-white border-2 ${isLab ? 'border-amber-500 shadow-xs' : 'border-indigo-500 shadow-xs'}`
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <div
                        className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 border transition-colors ${
                          isSelected
                            ? `${isLab ? 'bg-amber-600 border-amber-600 text-white' : 'bg-indigo-600 border-indigo-600 text-white'}`
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span className="font-bold text-slate-900 text-xs truncate block">{svc.name}</span>
                    </div>

                    {svc.latin_name && (
                      <span className="text-[10px] text-slate-500 font-mono block truncate pr-5 mt-0.5">
                        {svc.latin_name}
                      </span>
                    )}

                    <div className="flex items-center gap-2 pr-5 mt-1 text-[10px] text-slate-500">
                      {svc.estimated_duration && (
                        <span className="flex items-center gap-0.5 text-slate-500">
                          <Clock className="w-3 h-3" />
                          <span>{svc.estimated_duration}</span>
                        </span>
                      )}
                      {svc.preparation_instructions && (
                        <span className="text-amber-700 truncate max-w-[120px]">
                          • {svc.preparation_instructions}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 text-left font-mono">
                    <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 font-extrabold text-[11px] border border-emerald-200 inline-block">
                      {svc.price} ج
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Custom Test Name or Additional Notes */}
      <div className="pt-1">
        <label className="block text-[11px] font-bold text-slate-700 mb-1">
          فحوصات مخصصة أخرى أو ملاحظات إضافية (اختياري)
        </label>
        <input
          type="text"
          value={customTests}
          onChange={e => onChangeCustomTests(e.target.value)}
          placeholder="إذا كان هناك تحليل غير مدرج في القائمة أعلاه، اكتب اسمه هنا..."
          className={`w-full px-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-white focus:outline-hidden ${theme.ring}`}
        />
      </div>
    </div>
  );
};
