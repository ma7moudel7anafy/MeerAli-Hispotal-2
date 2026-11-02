import React, { useState, useEffect } from 'react';
import { Specialty, ClinicalProtocol, QuickCommonDrug, SpecialtyClinicalPreset } from '../../types';
import { dbService } from '../../lib/databaseService';
import { useAuth } from '../../context/AuthContext';
import {
  Stethoscope,
  Sparkles,
  Pill,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  FileText,
  AlertCircle,
  X,
  Building2,
  Activity,
  Layers,
} from 'lucide-react';

interface Props {
  specialties: Specialty[];
}

export const SpecialtyClinicalPresetsManager: React.FC<Props> = ({ specialties }) => {
  const { currentUser } = useAuth();
  const [selectedSpecId, setSelectedSpecId] = useState<string>(() => specialties[0]?.id || 'spec-01');
  const [allPresets, setAllPresets] = useState<Record<string, SpecialtyClinicalPreset>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // New Diagnosis Input
  const [newDiagnosisText, setNewDiagnosisText] = useState('');

  // New Quick Drug Inputs
  const [newDrugName, setNewDrugName] = useState('');
  const [newDrugDosage, setNewDrugDosage] = useState('قرص واحد');
  const [newDrugFreq, setNewDrugFreq] = useState('3 مرات يومياً بعد الأكل');
  const [newDrugDuration, setNewDrugDuration] = useState('لمدة 5 أيام');

  // New Protocol Modal
  const [isAddProtocolModalOpen, setIsAddProtocolModalOpen] = useState(false);
  const [newProtoName, setNewProtoName] = useState('');
  const [newProtoLatin, setNewProtoLatin] = useState('');
  const [newProtoDiagnosis, setNewProtoDiagnosis] = useState('');
  const [newProtoNotes, setNewProtoNotes] = useState('');
  const [newProtoMedicines, setNewProtoMedicines] = useState<Array<{ name: string; dosage: string }>>([
    { name: '', dosage: 'قرص 3 مرات بعد الأكل لمدة 5 أيام' },
  ]);

  const loadPresets = async () => {
    setIsLoading(true);
    try {
      const presets = await dbService.getAllSpecialtiesClinicalPresets();
      setAllPresets(presets);
    } catch (e) {
      console.error('Failed to load clinical presets:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPresets();
  }, []);

  const currentSpecialty = specialties.find(s => s.id === selectedSpecId);
  const currentPreset: SpecialtyClinicalPreset = allPresets[selectedSpecId] || {
    specialty_id: selectedSpecId,
    specialty_name: currentSpecialty?.name || '',
    diagnoses: [],
    protocols: [],
    quick_drugs: [],
  };

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  // Add Diagnosis
  const handleAddDiagnosis = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newDiagnosisText.trim();
    if (!trimmed) return;
    if (currentPreset.diagnoses.includes(trimmed)) {
      alert('هذا التشخيص موجود بالفعل في قائمة القسم');
      return;
    }
    const updatedDiagnoses = [...currentPreset.diagnoses, trimmed];
    await dbService.saveSpecialtyClinicalPresets(
      selectedSpecId,
      { diagnoses: updatedDiagnoses },
      currentUser?.full_name || undefined
    );
    setNewDiagnosisText('');
    await loadPresets();
    showToast(`تمت إضافة تشخيص جديد لقسم «${currentSpecialty?.name}»`);
  };

  // Delete Diagnosis
  const handleDeleteDiagnosis = async (diagToRemove: string) => {
    if (!confirm(`هل أنت متأكد من حذف تشخيص «${diagToRemove}» من قائمة القسم؟`)) return;
    const updated = currentPreset.diagnoses.filter(d => d !== diagToRemove);
    await dbService.saveSpecialtyClinicalPresets(
      selectedSpecId,
      { diagnoses: updated },
      currentUser?.full_name || undefined
    );
    await loadPresets();
    showToast('تم حذف التشخيص من القسم');
  };

  // Add Quick Drug
  const handleAddQuickDrug = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDrugName.trim()) return;
    const newDrug: QuickCommonDrug = {
      id: `drug-${Date.now()}`,
      specialty_id: selectedSpecId,
      name: newDrugName.trim(),
      dosage: newDrugDosage.trim(),
      frequency: newDrugFreq.trim(),
      duration: newDrugDuration.trim(),
    };
    const updatedDrugs = [...currentPreset.quick_drugs, newDrug];
    await dbService.saveSpecialtyClinicalPresets(
      selectedSpecId,
      { quick_drugs: updatedDrugs },
      currentUser?.full_name || undefined
    );
    setNewDrugName('');
    await loadPresets();
    showToast(`تمت إضافة دواء «${newDrug.name}» إلى قائمة أدوية القسم`);
  };

  // Delete Quick Drug
  const handleDeleteQuickDrug = async (drugIndex: number) => {
    const drugToDelete = currentPreset.quick_drugs[drugIndex];
    if (!confirm(`هل أنت متأكد من حذف «${drugToDelete.name}» من أدوية القسم؟`)) return;
    const updated = currentPreset.quick_drugs.filter((_, idx) => idx !== drugIndex);
    await dbService.saveSpecialtyClinicalPresets(
      selectedSpecId,
      { quick_drugs: updated },
      currentUser?.full_name || undefined
    );
    await loadPresets();
    showToast('تم حذف الدواء من القسم');
  };

  // Add Protocol Handlers
  const handleAddMedicineRowToProto = () => {
    setNewProtoMedicines(prev => [...prev, { name: '', dosage: 'قرص 3 مرات بعد الأكل لمدة 5 أيام' }]);
  };

  const handleRemoveMedicineRowFromProto = (idx: number) => {
    setNewProtoMedicines(prev => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateMedicineRow = (idx: number, field: 'name' | 'dosage', val: string) => {
    setNewProtoMedicines(prev =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: val } : item))
    );
  };

  const handleSaveNewProtocol = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProtoName.trim()) {
      alert('يرجى إدخال اسم البروتوكول');
      return;
    }
    const validMeds = newProtoMedicines.filter(m => m.name.trim());
    if (validMeds.length === 0) {
      alert('يرجى إدخال دواء واحد على الأقل في البروتوكول');
      return;
    }

    const newProtocol: ClinicalProtocol = {
      id: `proto-${Date.now()}`,
      specialty_id: selectedSpecId,
      specialty_name: currentSpecialty?.name,
      name: newProtoName.trim(),
      latinName: newProtoLatin.trim() || undefined,
      diagnosis: newProtoDiagnosis.trim() || newProtoName.trim(),
      notes: newProtoNotes.trim() || undefined,
      medicines: validMeds,
    };

    const updatedProtocols = [...currentPreset.protocols, newProtocol];
    await dbService.saveSpecialtyClinicalPresets(
      selectedSpecId,
      { protocols: updatedProtocols },
      currentUser?.full_name || undefined
    );

    setIsAddProtocolModalOpen(false);
    setNewProtoName('');
    setNewProtoLatin('');
    setNewProtoDiagnosis('');
    setNewProtoNotes('');
    setNewProtoMedicines([{ name: '', dosage: 'قرص 3 مرات بعد الأكل لمدة 5 أيام' }]);

    await loadPresets();
    showToast(`تم حفظ بروتوكول «${newProtocol.name}» في قسم «${currentSpecialty?.name}» بنجاح`);
  };

  const handleDeleteProtocol = async (protoId: string, protoName: string) => {
    if (!confirm(`هل أنت متأكد من حذف بروتوكول «${protoName}»؟`)) return;
    const updated = currentPreset.protocols.filter(p => p.id !== protoId);
    await dbService.saveSpecialtyClinicalPresets(
      selectedSpecId,
      { protocols: updated },
      currentUser?.full_name || undefined
    );
    await loadPresets();
    showToast('تم حذف البروتوكول من القسم');
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {successToast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-teal-800 text-white px-5 py-2.5 rounded-xl shadow-lg font-bold text-xs flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-300" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Header Info */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-teal-700" />
            <span>إدارة البروتوكولات والتشخيصات الطبية للأقسام والعيادات</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            هنا تُحدد الإدارة الطبية ورؤساء الأقسام القوائم الافتراضية لكل عيادة (التشخيصات، البروتوكولات العلاجية الشاملة، والأدوية الشائعة) لتظهر لأطباء القسم تلقائياً.
          </p>
        </div>

        {/* Specialty Selector Dropdown */}
        <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200">
          <label className="text-xs font-bold text-slate-700 shrink-0">اختر القسم / التخصص:</label>
          <select
            value={selectedSpecId}
            onChange={e => setSelectedSpecId(e.target.value)}
            className="text-xs font-bold py-1.5 px-3 bg-white border border-slate-300 rounded-lg text-teal-900 focus:outline-hidden focus:border-teal-600 cursor-pointer shadow-2xs"
          >
            {specialties.map(spec => (
              <option key={spec.id} value={spec.id}>
                {spec.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 3 Columns/Cards Layout for the Active Department */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1: Approved Diagnoses */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 flex flex-col">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900">التشخيصات الطبية المعتمدة للقسم</h3>
                <span className="text-[10px] text-slate-500">{currentPreset.diagnoses.length} تشخيصات مسجلة</span>
              </div>
            </div>
          </div>

          {/* Add Diagnosis Form */}
          <form onSubmit={handleAddDiagnosis} className="flex items-center gap-1.5 mb-3">
            <input
              type="text"
              value={newDiagnosisText}
              onChange={e => setNewDiagnosisText(e.target.value)}
              placeholder="اكتب تشخيصاً طبياً جديداً للقسم..."
              className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-teal-600 bg-slate-50/50"
            />
            <button
              type="submit"
              disabled={!newDiagnosisText.trim()}
              className="px-3 py-1.5 text-xs font-bold bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white rounded-xl cursor-pointer transition-colors shrink-0 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة</span>
            </button>
          </form>

          {/* Diagnoses List */}
          <div className="flex-1 overflow-y-auto max-h-[380px] space-y-1.5 pr-1">
            {currentPreset.diagnoses.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">لا توجد تشخيصات مسجلة لهذا القسم بعد</p>
            ) : (
              currentPreset.diagnoses.map((diag, idx) => (
                <div
                  key={idx}
                  className="p-2 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200/70 flex items-center justify-between gap-2 text-xs transition-colors"
                >
                  <span className="font-semibold text-slate-800 flex-1">{diag}</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteDiagnosis(diag)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer transition-colors"
                    title="حذف هذا التشخيص"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Card 2: Clinical Treatment Protocols */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 flex flex-col">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900">بروتوكولات العلاج القياسية</h3>
                <span className="text-[10px] text-slate-500">{currentPreset.protocols.length} بروتوكولات معتمدة</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsAddProtocolModalOpen(true)}
              className="px-2.5 py-1 text-xs font-bold bg-teal-50 border border-teal-200 text-teal-800 hover:bg-teal-100 rounded-lg cursor-pointer transition-colors flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>بروتوكول جديد</span>
            </button>
          </div>

          {/* Protocols List */}
          <div className="flex-1 overflow-y-auto max-h-[430px] space-y-2.5 pr-1">
            {currentPreset.protocols.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">لا توجد بروتوكولات مسجلة لهذا القسم</p>
            ) : (
              currentPreset.protocols.map((proto) => (
                <div
                  key={proto.id}
                  className="p-3 bg-slate-50/80 hover:bg-white rounded-xl border border-slate-200 shadow-2xs space-y-1.5 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3 text-teal-600" />
                      {proto.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteProtocol(proto.id, proto.name)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded-md cursor-pointer transition-colors"
                      title="حذف البروتوكول"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {proto.latinName && (
                    <span className="text-[10px] text-slate-500 block font-mono">{proto.latinName}</span>
                  )}

                  <div className="text-[11px] text-teal-900 bg-teal-50/70 px-2 py-1 rounded-md border border-teal-100">
                    <span className="font-bold">التشخيص:</span> {proto.diagnosis}
                  </div>

                  <div className="text-[11px] text-slate-600">
                    <span className="font-bold">الأدوية ({proto.medicines.length}):</span>
                    <ul className="list-disc list-inside mt-0.5 space-y-0.5 text-[10px] text-slate-700">
                      {proto.medicines.map((m, mIdx) => (
                        <li key={mIdx}>
                          <span className="font-semibold">{m.name}</span>
                          {m.dosage && <span className="text-slate-500"> ({m.dosage})</span>}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {proto.notes && (
                    <p className="text-[10px] text-slate-500 bg-amber-50/50 p-1.5 rounded-md border border-amber-100/70">
                      <b>نصائح:</b> {proto.notes}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Card 3: Common Specialty Drugs */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 flex flex-col">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center">
                <Pill className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900">الأدوية الشائعة للقسم (Formulary)</h3>
                <span className="text-[10px] text-slate-500">{currentPreset.quick_drugs.length} أدوية قياسية</span>
              </div>
            </div>
          </div>

          {/* Add Drug Mini-Form */}
          <form onSubmit={handleAddQuickDrug} className="space-y-1.5 mb-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <input
              type="text"
              value={newDrugName}
              onChange={e => setNewDrugName(e.target.value)}
              placeholder="اسم الدواء والتركيز (مثال: بنادول 500 مجم)..."
              className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:border-teal-600 bg-white"
            />
            <div className="grid grid-cols-2 gap-1.5">
              <input
                type="text"
                value={newDrugDosage}
                onChange={e => setNewDrugDosage(e.target.value)}
                placeholder="الجرعة القياسية (قرص واحد)..."
                className="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white"
              />
              <input
                type="text"
                value={newDrugFreq}
                onChange={e => setNewDrugFreq(e.target.value)}
                placeholder="التكرار (3 مرات بعد الأكل)..."
                className="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg bg-white"
              />
            </div>
            <button
              type="submit"
              disabled={!newDrugName.trim()}
              className="w-full py-1.5 text-xs font-bold bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white rounded-lg cursor-pointer transition-colors flex items-center justify-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>إضافة دواء لقائمة القسم</span>
            </button>
          </form>

          {/* Drugs List */}
          <div className="flex-1 overflow-y-auto max-h-[330px] space-y-1.5 pr-1">
            {currentPreset.quick_drugs.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">لا توجد أدوية شائعة مسجلة لهذا القسم</p>
            ) : (
              currentPreset.quick_drugs.map((drug, idx) => (
                <div
                  key={idx}
                  className="p-2 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200/70 flex items-center justify-between gap-2 text-xs transition-colors"
                >
                  <div className="flex-1">
                    <span className="font-bold text-slate-900 block">{drug.name}</span>
                    <span className="text-[10px] text-slate-500">
                      {[drug.dosage, drug.frequency, drug.duration].filter(Boolean).join(' • ')}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteQuickDrug(idx)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer transition-colors"
                    title="حذف هذا الدواء"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Add Protocol Modal */}
      {isAddProtocolModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 bg-teal-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-teal-300" />
                <h3 className="font-bold text-sm">
                  إضافة بروتوكول علاجي قياسي جديد لقسم «{currentSpecialty?.name}»
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddProtocolModalOpen(false)}
                className="p-1 text-teal-200 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewProtocol} className="p-5 overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    اسم البروتوكول (بالعربية) <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newProtoName}
                    onChange={e => setNewProtoName(e.target.value)}
                    placeholder="مثال: بروتوكول نزلة معوية حادة..."
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:border-teal-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">الاسم الطبي بالإنجليزية</label>
                  <input
                    type="text"
                    value={newProtoLatin}
                    onChange={e => setNewProtoLatin(e.target.value)}
                    placeholder="مثال: Acute GE Protocol..."
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:border-teal-600 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">التشخيص الطبي المرتبط بهذا البروتوكول</label>
                <input
                  type="text"
                  value={newProtoDiagnosis}
                  onChange={e => setNewProtoDiagnosis(e.target.value)}
                  placeholder="التشخيص الذي سيتم تعبئته آلياً عند اختيار البروتوكول..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:border-teal-600"
                />
              </div>

              {/* Medicines in Protocol */}
              <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/70">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Pill className="w-3.5 h-3.5 text-teal-700" />
                    الأدوية المشمولة بالبروتوكول
                  </span>
                  <button
                    type="button"
                    onClick={handleAddMedicineRowToProto}
                    className="px-2 py-0.5 text-[11px] font-bold bg-white border border-teal-300 text-teal-800 rounded-md cursor-pointer hover:bg-teal-50"
                  >
                    + إضافة دواء
                  </button>
                </div>

                <div className="space-y-2">
                  {newProtoMedicines.map((med, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200">
                      <span className="font-mono text-xs font-bold text-slate-400">#{idx + 1}</span>
                      <input
                        type="text"
                        value={med.name}
                        onChange={e => handleUpdateMedicineRow(idx, 'name', e.target.value)}
                        placeholder="اسم الدواء..."
                        className="w-1/2 px-2.5 py-1 text-xs border border-slate-200 rounded-md font-bold"
                      />
                      <input
                        type="text"
                        value={med.dosage}
                        onChange={e => handleUpdateMedicineRow(idx, 'dosage', e.target.value)}
                        placeholder="الجرعة والتعليمات..."
                        className="w-1/2 px-2.5 py-1 text-xs border border-slate-200 rounded-md"
                      />
                      {newProtoMedicines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMedicineRowFromProto(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-md cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">تعليمات وتوصيات للمريض</label>
                <textarea
                  rows={2}
                  value={newProtoNotes}
                  onChange={e => setNewProtoNotes(e.target.value)}
                  placeholder="الممنوعات، الراحة، الإكثار من السوائل، إلخ..."
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:border-teal-600"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddProtocolModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-teal-700 hover:bg-teal-800 text-white rounded-xl cursor-pointer transition-colors flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>حفظ البروتوكول للقسم</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
