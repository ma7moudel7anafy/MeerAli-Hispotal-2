import React, { useState } from 'react';
import { PatientVisit } from '../../types';
import { printElement } from '../../lib/printUtils';
import {
  shareOrSendPdfViaWhatsApp,
  downloadElementAsPdf,
  formatWhatsAppNumber,
} from '../../lib/pdfGenerator';
import {
  MessageSquare,
  Printer,
  Copy,
  Check,
  X,
  Phone,
  Send,
  Ticket,
  Receipt,
  Pill,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Building2,
  Download,
  FileText,
  Eye,
  Loader2,
  Calendar,
  Clock,
  CheckCircle2,
} from 'lucide-react';

interface PatientNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  visit: PatientVisit | null;
  initialTab?: 'ticket' | 'receipt' | 'prescription';
  defaultTab?: 'ticket' | 'receipt' | 'prescription';
  allowedTabs?: ('ticket' | 'receipt' | 'prescription')[];
  onOpenReceiptModal?: (v: PatientVisit) => void;
  onOpenThermalTicket?: (v: PatientVisit) => void;
  onPrintTicket?: (v: PatientVisit) => void;
  onPrintReceipt?: (v: PatientVisit) => void;
}

export const PatientNotificationModal: React.FC<PatientNotificationModalProps> = ({
  isOpen,
  onClose,
  visit,
  initialTab,
  defaultTab,
  allowedTabs = ['ticket', 'receipt', 'prescription'],
  onOpenReceiptModal,
  onOpenThermalTicket,
  onPrintTicket,
  onPrintReceipt,
}) => {
  const getInitialTab = (): 'ticket' | 'receipt' | 'prescription' => {
    const requested = defaultTab || initialTab;
    if (requested && allowedTabs.includes(requested)) {
      return requested;
    }
    if (allowedTabs.length > 0) {
      return allowedTabs[0];
    }
    return 'ticket';
  };

  const [activeTab, setActiveTab] = useState<'ticket' | 'receipt' | 'prescription'>(getInitialTab());
  const [phoneNumber, setPhoneNumber] = useState<string>(visit?.patient_phone || '');
  const [copied, setCopied] = useState<boolean>(false);
  const [previewMode, setPreviewMode] = useState<'pdf' | 'text'>('pdf');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [shareSuccessNotice, setShareSuccessNotice] = useState<string | null>(null);

  // Sync state when visit, allowedTabs or target tab changes
  React.useEffect(() => {
    if (visit) {
      setPhoneNumber(visit.patient_phone || '');
      const requested = defaultTab || initialTab;
      if (requested && allowedTabs.includes(requested)) {
        setActiveTab(requested);
      } else if (allowedTabs.includes('prescription') && visit.status === 'completed' && visit.prescription && allowedTabs.length === 1) {
        setActiveTab('prescription');
      } else if (allowedTabs.includes('receipt') && visit.payment_status === 'paid' && !allowedTabs.includes('prescription')) {
        setActiveTab('receipt');
      } else if (allowedTabs.length > 0) {
        setActiveTab(allowedTabs[0]);
      }
    }
  }, [visit, defaultTab, initialTab, allowedTabs]);

  if (!isOpen || !visit) return null;

  const displayQueue = visit.id.replace(/\D/g, '').slice(-2) || '1';
  const fee = visit.paid_amount !== undefined ? visit.paid_amount : visit.fee_amount || 40;
  const isWaived = visit.payment_status === 'waived';

  const getAmountInWords = (num: number) => {
    if (num === 0) return 'صفر جنيه (إعفاء خيري معتمد)';
    if (num === 20) return 'فقط عشرون جنيهاً مصرياً لا غير';
    if (num === 30) return 'فقط ثلاثون جنيهاً مصرياً لا غير';
    if (num === 35) return 'فقط خمسة وثلاثون جنيهاً مصرياً لا غير';
    if (num === 40) return 'فقط أربعون جنيهاً مصرياً لا غير';
    if (num === 50) return 'فقط خمسون جنيهاً مصرياً لا غير';
    return `فقط ${num} جنيهاً مصرياً لا غير`;
  };

  // Compile WhatsApp messages according to type
  const getTicketMessage = () => {
    return `🏥 *مستشفى لجنة الزكاة بميت علي*
السلام عليكم أستاذ/ة *${visit.patient_name}*،

تم تأكيد حجز دوركم في العيادات الخارجية بنجاح:
📋 *رقم الدور:* #${displayQueue}
📋 *رقم الملف الطبي:* ${visit.patient_number || 'مسجل'}
🩺 *العيادة:* ${visit.specialty_name}
👨‍⚕️ *الطبيب المعالج:* ${visit.doctor_name}
🎫 *نوع الكشف:* ${visit.visit_type === 'new' ? 'كشف جديد' : 'إعادة / استشارة'}
${visit.priority === 'urgent' ? '⚡ *الأولوية:* حالة طارئة ومستعجلة\n' : visit.priority === 'elderly' ? '👵 *الأولوية:* كبار السن\n' : visit.priority === 'special_needs' ? '♿ *الأولوية:* أصحاب الهمم\n' : ''}
💰 *حالة السداد:* ${visit.payment_status === 'paid' ? `مسدد بالخزينة (${visit.paid_amount || visit.fee_amount || 40} ج)` : visit.payment_status === 'waived' ? 'إعفاء خيري معتمد' : 'معلق لحين السداد عند الحضور'}

يرجى التواجد بصالة الانتظار أمام العيادة عند النداء على دوركم.
نسأل الله لكم دوام الصحة والعافية 🤲`;
  };

  const getReceiptMessage = () => {
    return `🧾 *إيصال سداد مالي إلكتروني معتمد*
*مستشفى لجنة الزكاة بميت علي*

سعادة المريض/ة: *${visit.patient_name}*
ملف رقم: ${visit.patient_number || 'مسجل'}

تم استلام رسوم الكشف بالخزينة بالبيانات التالية:
🔢 *رقم الإيصال الرسمي:* ${visit.payment_receipt_number || 'REC-2026-XXXXX'}
💵 *المبلغ المسدد:* ${visit.paid_amount || visit.fee_amount || 40} جنيهاً مصرياً
💳 *طريقة السداد:* ${visit.payment_method === 'cash' ? 'نقدي (كاش)' : visit.payment_method === 'vodafone_cash' ? 'محفظة فودافون كاش' : visit.payment_method === 'instapay' ? 'إنستاباي InstaPay' : visit.payment_method === 'visa' ? 'بطاقة فيزا' : 'نقدي'}
🩺 *العيادة والطبيب:* ${visit.specialty_name} - د. ${visit.doctor_name}
👤 *اسم المحصل:* ${visit.paid_by_name || 'موظف الخزينة'}
📅 *تاريخ وساعة الإيصال:* ${visit.paid_at ? new Date(visit.paid_at).toLocaleString('ar-EG') : visit.visit_date}

شكراً لتعاملكم مع مستشفى لجنة الزكاة بميت علي.`;
  };

  const getPrescriptionMessage = () => {
    const rxText = visit.prescription || 'لم تُسجل أدوية نصية بالروشتة';
    const diag = visit.diagnosis || 'فحص طبي عام واستشارة';

    return `💊 *روشتة طبية رسمية معتمدة*
*مستشفى لجنة الزكاة بميت علي*

المريض/ة: *${visit.patient_name}*
العيادة: *${visit.specialty_name}*
الطبيب: *${visit.doctor_name}*
التاريخ: *${visit.visit_date}*
────────────────────
🩺 *التشخيص الطبي:*
${diag}

💊 *العلاج والأدوية المقررة:*
${rxText}
${visit.tests_requested ? `\n🔬 *التحاليل والفحوصات المطلوبة:*\n${visit.tests_requested}` : ''}
${visit.doctor_notes ? `\n📝 *نصائح الطبيب:*\n${visit.doctor_notes}` : ''}
${visit.revisit_recommended && visit.follow_up_date ? `\n📅 *موعد الاستشارة / الإعادة المقترح:* ${visit.follow_up_date}` : ''}
────────────────────
تمنياتنا لكم بالشفاء العاجل والشفاء التام 🤲`;
  };

  const getCurrentMessage = () => {
    switch (activeTab) {
      case 'ticket':
        return getTicketMessage();
      case 'receipt':
        return getReceiptMessage();
      case 'prescription':
        return getPrescriptionMessage();
    }
  };

  const getActiveElementId = () => {
    switch (activeTab) {
      case 'ticket':
        return 'official-ticket-card-pdf';
      case 'receipt':
        return 'official-receipt-card-pdf';
      case 'prescription':
        return 'official-prescription-card-pdf';
    }
  };

  const getFileName = () => {
    const safeName = (visit.patient_name || 'مريض').replace(/\s+/g, '_');
    switch (activeTab) {
      case 'ticket':
        return `كارت_دور_عيادة_${visit.specialty_name}_${safeName}`;
      case 'receipt':
        return `إيصال_سداد_${visit.payment_receipt_number || 'REC'}_${safeName}`;
      case 'prescription':
        return `روشتة_طبية_${safeName}_${visit.visit_date}`;
    }
  };

  const getDocumentTitle = () => {
    switch (activeTab) {
      case 'ticket':
        return `كارت تذكرة الدور #${displayQueue}`;
      case 'receipt':
        return `إيصال سداد رقم ${visit.payment_receipt_number || ''}`;
      case 'prescription':
        return `روشتة طبية - عيادة ${visit.specialty_name}`;
    }
  };

  // 1. Send via WhatsApp directly targeted to patient's phone number with official PDF
  const handleSendWhatsAppWithPdf = async () => {
    if (!phoneNumber.trim()) {
      alert('يرجى كتابة رقم هاتف المريض أو رقم الواتساب أولاً.');
      return;
    }

    try {
      setIsGeneratingPdf(true);
      const res = await shareOrSendPdfViaWhatsApp({
        elementId: getActiveElementId(),
        fileName: getFileName(),
        phoneNumber: phoneNumber.trim(),
        messageText: getCurrentMessage(),
        documentTitle: getDocumentTitle(),
      });

      setShareSuccessNotice(`تم فتح محادثة المريض (${res.recipientPhone}) بالواتساب مباشرةً وتنزيل ملف PDF المعتمد.`);
      setTimeout(() => setShareSuccessNotice(null), 6000);
    } catch (err: any) {
      console.error('Error opening direct WhatsApp chat for patient:', err);
      alert(err?.message || 'حدث خطأ أثناء فتح محادثة الواتساب');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // 2. Download Official PDF
  const handleDownloadPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      const ok = await downloadElementAsPdf(getActiveElementId(), getFileName());
      if (ok) {
        setShareSuccessNotice('تم تحميل ملف PDF الرسمي بهوية المستشفى بنجاح.');
        setTimeout(() => setShareSuccessNotice(null), 4000);
      }
    } catch (err) {
      console.error('Error downloading PDF:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // 3. Print document
  const handlePrintCurrent = () => {
    const elementId = getActiveElementId();
    printElement(elementId, getDocumentTitle());
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(getCurrentMessage());
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      alert('تم نسخ النص');
    }
  };

  const hasPrescription = !!(visit.prescription || visit.diagnosis);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 max-w-xl w-full p-4 sm:p-6 shadow-2xl relative my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute left-3.5 top-3.5 text-slate-400 hover:text-slate-600 p-2 rounded-xl cursor-pointer bg-slate-100 hover:bg-slate-200 transition-colors"
          title="إغلاق"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4 border-b border-slate-100 pb-3 pl-8">
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${
            allowedTabs.length === 1 && allowedTabs[0] === 'prescription'
              ? 'bg-purple-50 text-purple-700 border-purple-200'
              : !allowedTabs.includes('prescription')
              ? 'bg-teal-50 text-teal-700 border-teal-200'
              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          }`}>
            {allowedTabs.length === 1 && allowedTabs[0] === 'prescription' ? (
              <Pill className="w-6 h-6 text-purple-600" />
            ) : !allowedTabs.includes('prescription') ? (
              <Receipt className="w-6 h-6 text-teal-600" />
            ) : (
              <FileText className="w-6 h-6 text-emerald-600" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                {allowedTabs.length === 1 && allowedTabs[0] === 'prescription'
                  ? 'إرسال الروشتة الطبية الرسمية (PDF / واتساب)'
                  : !allowedTabs.includes('prescription')
                  ? 'إرسال كارت الدور وإيصال السداد (PDF / واتساب)'
                  : 'تصدير وإرسال المستندات الطبية (PDF)'}
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              مستشفى لجنة الزكاة بميت علي • المريض: <strong className="text-slate-800">{visit.patient_name}</strong> (ملف: {visit.patient_number || 'مسجل'})
            </p>
          </div>
        </div>

        {/* Tabs for Message Types (if more than 1 allowed tab) */}
        {allowedTabs.length > 1 ? (
          <div className={`grid gap-1.5 p-1 bg-slate-100 rounded-xl mb-3 text-xs font-bold ${
            allowedTabs.length === 2 ? 'grid-cols-2' : 'grid-cols-3'
          }`}>
            {allowedTabs.includes('ticket') && (
              <button
                type="button"
                onClick={() => setActiveTab('ticket')}
                className={`py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'ticket'
                    ? 'bg-white text-teal-800 shadow-2xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Ticket className="w-3.5 h-3.5 text-teal-600" />
                <span>كارت الدور الرسمي</span>
              </button>
            )}

            {allowedTabs.includes('receipt') && (
              <button
                type="button"
                onClick={() => setActiveTab('receipt')}
                className={`py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'receipt'
                    ? 'bg-white text-emerald-800 shadow-2xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                <span>إيصال السداد المالي</span>
              </button>
            )}

            {allowedTabs.includes('prescription') && (
              <button
                type="button"
                onClick={() => setActiveTab('prescription')}
                className={`py-2 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer relative ${
                  activeTab === 'prescription'
                    ? 'bg-white text-purple-800 shadow-2xs font-extrabold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Pill className="w-3.5 h-3.5 text-purple-600" />
                <span>الروشتة الطبية</span>
                {!hasPrescription && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 absolute top-1.5 left-1.5"></span>
                )}
              </button>
            )}
          </div>
        ) : (
          <div className="mb-3 p-2.5 bg-purple-50/80 border border-purple-200 rounded-xl flex items-center justify-between text-xs text-purple-950 font-bold">
            <div className="flex items-center gap-2">
              <Pill className="w-4 h-4 text-purple-600 shrink-0" />
              <span>المستند المعتمد: الروشتة والوصفة الطبية الرسمية</span>
            </div>
            <span className="text-[10px] bg-purple-200 text-purple-900 px-2 py-0.5 rounded-md font-bold">
              صلاحية الطبيب المعالج
            </span>
          </div>
        )}

        {/* View Switcher: PDF Document Preview vs WhatsApp Text */}
        <div className="flex items-center justify-between mb-2.5 px-1">
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs font-bold">
            <button
              type="button"
              onClick={() => setPreviewMode('pdf')}
              className={`px-3 py-1 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer ${
                previewMode === 'pdf' ? 'bg-white text-teal-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>معاينة ملف PDF الرسمي</span>
            </button>
            <button
              type="button"
              onClick={() => setPreviewMode('text')}
              className={`px-3 py-1 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer ${
                previewMode === 'text' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>نص رسالة الواتساب</span>
            </button>
          </div>

          <span className="text-[11px] font-bold text-slate-500">
            {previewMode === 'pdf' ? 'ملف جاهز للطباعة والمشاركة' : 'نص مخصص للمحادثة'}
          </span>
        </div>

        {/* Recipient Phone Editor */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-emerald-600" />
              <span>رقم هاتف المريض (الواتساب):</span>
              <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md font-bold">
                مربوط برقم المريض مباشرة 🎯
              </span>
            </label>
            {phoneNumber.trim() ? (
              <span className="text-[10px] font-mono text-emerald-700 font-bold">
                +{formatWhatsAppNumber(phoneNumber)}
              </span>
            ) : (
              <span className="text-[10px] text-rose-600 font-bold">
                ⚠️ يرجى كتابة رقم هاتف المريض
              </span>
            )}
          </div>
          <div className="relative">
            <input
              type="text"
              value={phoneNumber}
              onChange={e => setPhoneNumber(e.target.value)}
              placeholder="مثال: 01012345678"
              className="w-full px-3 py-2 text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded-xl focus:outline-hidden focus:border-emerald-600 focus:bg-white text-slate-900"
            />
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            يتم توجيه المحادثة فوراً إلى هذا الرقم المحدد دون الحاجة للبحث عنه في جهات الاتصال.
          </p>
        </div>

        {/* Success Alert Notice */}
        {shareSuccessNotice && (
          <div className="mb-3 p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{shareSuccessNotice}</span>
          </div>
        )}

        {/* PREVIEW CONTAINER */}
        <div className="max-h-72 overflow-y-auto mb-4 border border-slate-200 rounded-2xl bg-slate-50 p-2 sm:p-3">
          {previewMode === 'pdf' ? (
            /* OFFICIAL HOSPITAL BRANDED DOCUMENT PREVIEW */
            <div className="space-y-4">
              {/* 1. TICKET CARD DOCUMENT */}
              {activeTab === 'ticket' && (
                <div
                  id="official-ticket-card-pdf"
                  className="bg-white border-2 border-slate-900 rounded-2xl p-5 text-right font-sans shadow-xs max-w-md mx-auto"
                >
                  {/* Hospital Official Header */}
                  <div className="text-center border-b-2 border-slate-900 pb-3 mb-3">
                    <div className="flex items-center justify-center gap-2 text-teal-900 font-black text-sm">
                      <Building2 className="w-5 h-5 text-teal-800" />
                      <span>مستشفى لجنة الزكاة بميت علي</span>
                    </div>
                    <p className="text-[11px] text-slate-600 font-semibold mt-0.5">
                      صرح طبي خيري • العيادات التخصصية الشاملة
                    </p>
                    <div className="mt-2 inline-block px-3 py-0.5 bg-teal-800 text-white rounded-md text-[11px] font-bold">
                      كارت وتذكرة دور العيادة الخارجية
                    </div>
                  </div>

                  {/* Huge Queue Number Box */}
                  <div className="bg-teal-900 text-white rounded-xl py-3 px-2 text-center my-2 shadow-xs">
                    <span className="text-[11px] block font-bold text-teal-200">
                      رقم الدور بالعيادة
                    </span>
                    <div className="text-4xl font-black font-mono tracking-tight my-0.5 text-white">
                      #{displayQueue}
                    </div>
                    <span className="text-[10px] text-teal-300 font-medium">
                      يرجى التواجد بصالة الانتظار وتسليم الكارت لتمريض العيادة
                    </span>
                  </div>

                  {/* Priority badge if any */}
                  {visit.priority && visit.priority !== 'normal' && (
                    <div className="mb-2 p-1.5 bg-rose-50 border border-rose-300 rounded-lg text-center text-xs font-bold text-rose-800">
                      {visit.priority === 'urgent' ? '⚡ حالة طارئة ومستعجلة' : visit.priority === 'elderly' ? '👵 كبار السن' : '♿ أصحاب الهمم'}
                    </div>
                  )}

                  {/* Clinic and Patient Details Table */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden text-xs divide-y divide-slate-100 mb-3">
                    <div className="p-2 flex justify-between bg-slate-50/70">
                      <span className="text-slate-500">العيادة التخصصية:</span>
                      <strong className="text-slate-900">عيادة {visit.specialty_name}</strong>
                    </div>
                    <div className="p-2 flex justify-between bg-white">
                      <span className="text-slate-500">الطبيب المعالج:</span>
                      <strong className="text-slate-900">{visit.doctor_name}</strong>
                    </div>
                    <div className="p-2 flex justify-between bg-slate-50/70">
                      <span className="text-slate-500">اسم المريض:</span>
                      <strong className="text-slate-900">{visit.patient_name}</strong>
                    </div>
                    <div className="p-2 flex justify-between bg-white">
                      <span className="text-slate-500">رقم الملف الطبي:</span>
                      <span className="font-mono font-bold text-teal-800">{visit.patient_number}</span>
                    </div>
                    <div className="p-2 flex justify-between bg-slate-50/70">
                      <span className="text-slate-500">نوع الكشف:</span>
                      <span className="font-bold text-slate-800">
                        {visit.visit_type === 'new' ? 'كشف جديد' : 'إعادة / استشارة'}
                      </span>
                    </div>
                    <div className="p-2 flex justify-between bg-white">
                      <span className="text-slate-500">حالة السداد:</span>
                      <span className="font-bold text-emerald-700">
                        {visit.payment_status === 'paid'
                          ? `مسدد بالخزينة (${visit.paid_amount || visit.fee_amount || 40} ج)`
                          : visit.payment_status === 'waived'
                          ? 'إعفاء خيري معتمد'
                          : 'معلق بالخزينة'}
                      </span>
                    </div>
                  </div>

                  {/* Date, Barcode and Hospital Seal */}
                  <div className="pt-2 border-t border-dashed border-slate-300 text-center text-[10px] text-slate-500 space-y-1">
                    <div className="flex justify-between items-center px-1 font-mono text-[10px]">
                      <span>التاريخ: {visit.visit_date}</span>
                      <span>ساعة التسجيل: {new Date(visit.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="font-mono tracking-widest text-slate-400 py-1 text-[11px] select-none font-bold">
                      ||| | ||||| || |||||| |||| | ||||| | |||||
                    </div>
                    <div className="flex items-center justify-center gap-1 text-teal-800 font-bold text-[11px]">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>مستند إلكتروني معتمد - مستشفى لجنة الزكاة بميت علي</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. RECEIPT DOCUMENT */}
              {activeTab === 'receipt' && (
                <div
                  id="official-receipt-card-pdf"
                  className="bg-white border-2 border-slate-900 rounded-2xl p-5 text-right font-sans shadow-xs max-w-md mx-auto"
                >
                  <div className="text-center border-b-2 border-slate-900 pb-3 mb-3">
                    <div className="flex items-center justify-center gap-2 text-slate-900 font-black text-sm">
                      <Building2 className="w-5 h-5 text-teal-800" />
                      <span>مستشفى لجنة الزكاة بميت علي</span>
                    </div>
                    <p className="text-[11px] text-slate-600 font-semibold mt-0.5">
                      قسم الخزينة والحسابات • إيصال سداد رسوم كشف رسمي
                    </p>
                    <div className="mt-2 inline-block px-3 py-0.5 bg-slate-900 text-white rounded-md text-[11px] font-bold">
                      رقم الإيصال: {visit.payment_receipt_number || 'REC-2026-XXXXX'}
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden text-xs divide-y divide-slate-100 mb-3">
                    <div className="p-2 flex justify-between bg-slate-50/70">
                      <span className="text-slate-500">المريض:</span>
                      <strong className="text-slate-900">{visit.patient_name}</strong>
                    </div>
                    <div className="p-2 flex justify-between bg-white">
                      <span className="text-slate-500">رقم الملف:</span>
                      <span className="font-mono font-bold text-teal-800">{visit.patient_number}</span>
                    </div>
                    <div className="p-2 flex justify-between bg-slate-50/70">
                      <span className="text-slate-500">العيادة والطبيب:</span>
                      <span className="font-bold text-slate-900">{visit.specialty_name} - د. {visit.doctor_name}</span>
                    </div>
                    <div className="p-2 flex justify-between bg-white">
                      <span className="text-slate-500">تاريخ وتوقيت التحصيل:</span>
                      <span className="font-mono text-slate-700">
                        {visit.paid_at ? new Date(visit.paid_at).toLocaleString('ar-EG') : visit.visit_date}
                      </span>
                    </div>
                    <div className="p-2 flex justify-between bg-slate-50/70">
                      <span className="text-slate-500">اسم المحصل:</span>
                      <strong className="text-slate-900">{visit.paid_by_name || 'موظف الخزينة'}</strong>
                    </div>
                  </div>

                  {/* Amount Box */}
                  <div className="bg-emerald-50 border-2 border-emerald-400 rounded-xl p-3 text-center my-2">
                    <span className="text-xs font-bold text-emerald-800 block">
                      {isWaived ? 'حالة الرسوم: إعفاء خيري معتمد' : 'المبلغ المحصل والمسدد بالخزينة:'}
                    </span>
                    <div className="text-2xl font-black font-mono text-emerald-950 my-0.5">
                      {isWaived ? '0.00' : Number(fee).toFixed(2)} ج.م
                    </div>
                    <div className="text-[11px] text-emerald-900 font-medium">
                      {getAmountInWords(isWaived ? 0 : Number(fee))}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-dashed border-slate-300 flex items-center justify-between text-[10px] text-slate-500">
                    <div className="flex items-center gap-1 text-emerald-700 font-bold">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>إيصال رسمي معتمد إلكترونياً</span>
                    </div>
                    <span>مستشفى لجنة الزكاة</span>
                  </div>
                </div>
              )}

              {/* 3. PRESCRIPTION DOCUMENT */}
              {activeTab === 'prescription' && (
                <div
                  id="official-prescription-card-pdf"
                  className="bg-white border-2 border-slate-900 rounded-2xl p-5 text-right font-sans shadow-xs max-w-md mx-auto"
                >
                  <div className="text-center border-b-2 border-slate-900 pb-3 mb-3">
                    <div className="flex items-center justify-center gap-2 text-slate-900 font-black text-sm">
                      <Building2 className="w-5 h-5 text-teal-800" />
                      <span>مستشفى لجنة الزكاة بميت علي</span>
                    </div>
                    <p className="text-[11px] text-slate-600 font-medium">العيادات التخصصية الشاملة • الروشتة الطبية الرسمية</p>
                    <p className="text-xs font-bold text-teal-800 mt-1">عيادة {visit.specialty_name} • د. {visit.doctor_name}</p>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs mb-3 grid grid-cols-2 gap-2">
                    <div><span className="text-slate-500">اسم المريض:</span> <b>{visit.patient_name}</b></div>
                    <div><span className="text-slate-500">رقم الملف:</span> <b className="font-mono">{visit.patient_number}</b></div>
                    <div><span className="text-slate-500">التاريخ:</span> <b>{visit.visit_date}</b></div>
                    <div><span className="text-slate-500">رقم الدور:</span> <b>#{displayQueue}</b></div>
                  </div>

                  {visit.diagnosis && (
                    <div className="mb-2 text-xs">
                      <span className="font-bold text-slate-700 block mb-0.5">التشخيص الطبي (Diagnosis):</span>
                      <p className="p-2 bg-blue-50 border border-blue-200 rounded-lg font-bold text-blue-950">{visit.diagnosis}</p>
                    </div>
                  )}

                  <div className="mb-3">
                    <span className="text-sm font-black italic font-serif text-teal-900 block mb-1">℞ الوصفة الطبية والعلاج:</span>
                    <div className="p-3 border border-slate-300 rounded-xl whitespace-pre-line text-xs font-medium leading-relaxed bg-slate-50/50">
                      {visit.prescription || 'لم تسجل أدوية نصية بالروشتة'}
                    </div>
                  </div>

                  {visit.tests_requested && (
                    <div className="mb-2 text-xs">
                      <span className="font-bold text-slate-700 block mb-0.5">التحاليل والفحوصات المطلوبة:</span>
                      <p className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-950">{visit.tests_requested}</p>
                    </div>
                  )}

                  {visit.doctor_notes && (
                    <div className="mb-2 text-xs">
                      <span className="font-bold text-slate-700 block mb-0.5">تعليمات الطبيب:</span>
                      <p className="p-2 bg-slate-100 border border-slate-200 rounded-lg">{visit.doctor_notes}</p>
                    </div>
                  )}

                  {visit.revisit_recommended && visit.follow_up_date && (
                    <div className="p-2 bg-purple-50 border border-purple-200 rounded-lg text-xs font-bold text-purple-900 mb-2">
                      📅 موعد الإعادة والاستشارة المقترح: {visit.follow_up_date}
                    </div>
                  )}

                  <div className="pt-3 border-t border-slate-300 mt-3 flex justify-between items-center text-xs text-slate-500">
                    <span className="font-bold">توقيع واعتماد الطبيب: د. {visit.doctor_name}</span>
                    <span>تمنياتنا لكم بالشفاء 🤲</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* WHATSAPP MESSAGE TEXT PREVIEW */
            <div className="bg-[#e5ddd5] p-3 rounded-2xl border border-slate-300/80">
              <div className="bg-white rounded-xl rounded-tr-none p-3 shadow-xs text-xs text-slate-800 font-sans leading-relaxed whitespace-pre-wrap select-text border border-slate-200">
                {getCurrentMessage()}
              </div>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          {/* Main Action: Send PDF via WhatsApp */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSendWhatsAppWithPdf}
              disabled={isGeneratingPdf}
              className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs disabled:opacity-50"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جارٍ تجهيز ملف PDF والمحادثة...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>إرسال لرقم المريض مباشرة ({phoneNumber.trim() || 'واتساب'})</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                </>
              )}
            </button>

            {/* Direct Download PDF Button */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="py-2.5 px-3.5 rounded-xl border border-teal-300 bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              title="تحميل ملف PDF الرسمي بهوية المستشفى على الجهاز مباشرة"
            >
              <Download className="w-4 h-4 text-teal-700" />
              <span className="hidden sm:inline">تحميل PDF</span>
            </button>

            {/* Copy Text Button */}
            <button
              type="button"
              onClick={handleCopyText}
              className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                copied
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
              title="نسخ نص الرسالة للحافظة"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'تم النسخ!' : 'نسخ'}</span>
            </button>
          </div>

          {/* Quick Print Alternative Buttons (Paperless Charity Backing) */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap text-xs">
            <span className="text-[11px] font-bold text-slate-500">خيارات بديلة عند توفر الطابعة:</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handlePrintCurrent}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-colors active:scale-95"
              >
                <Printer className="w-3.5 h-3.5 text-slate-700" />
                <span>طباعة ورقية مباشرة</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
