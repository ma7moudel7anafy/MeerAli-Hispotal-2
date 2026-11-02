import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  DiagnosticOrder,
  DiagnosticService,
  DiagnosticTestStatus,
  VisitPriority,
} from '../../types';
import {
  getDiagnosticOrders,
  createDiagnosticOrder,
  updateDiagnosticOrderStatus,
  getAllDiagnosticServices,
  updateDiagnosticService,
} from '../../lib/databaseService';
import { announcePatientCall } from '../../lib/audioCallUtils';
import {
  FlaskConical,
  Volume2,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Printer,
  Search,
  Plus,
  RefreshCw,
  LogOut,
  ArrowRight,
  UserCheck,
  Zap,
  Check,
  X,
  SlidersHorizontal,
  FileCheck,
  Stethoscope,
  Droplet,
  Tag,
  Banknote,
  Calendar,
  MessageSquare,
  Edit3,
  Share2,
} from 'lucide-react';
import { printElement } from '../../lib/printUtils';
import { DiagnosticServicePicker } from './DiagnosticServicePicker';
import { DiagnosticReportShareModal } from './DiagnosticReportShareModal';

interface LabTechnicianPortalProps {
  onBackToPublic?: () => void;
}

export const LabTechnicianPortal: React.FC<LabTechnicianPortalProps> = ({ onBackToPublic }) => {
  const { currentUser, logout } = useAuth();

  // Navigation tab inside lab portal
  const [activeTab, setActiveTab] = useState<'queue' | 'reagents' | 'history'>('queue');

  // Queue state
  const [orders, setOrders] = useState<DiagnosticOrder[]>([]);
  const [services, setServices] = useState<DiagnosticService[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'waiting' | 'in_progress' | 'result_ready' | 'delivered'>('all');

  // Active modal state for results entry
  const [activeOrderForResults, setActiveOrderForResults] = useState<DiagnosticOrder | null>(null);
  const [sampleTypeInput, setSampleTypeInput] = useState('عينة دم وريدي');
  const [resultsSummaryInput, setResultsSummaryInput] = useState('');
  const [isSavingResult, setIsSavingResult] = useState(false);

  // New direct walk-in test modal
  const [isAddWalkinOpen, setIsAddWalkinOpen] = useState(false);
  const [walkinPatientName, setWalkinPatientName] = useState('');
  const [walkinPhone, setWalkinPhone] = useState('');
  const [walkinSelectedServiceIds, setWalkinSelectedServiceIds] = useState<string[]>([]);
  const [walkinCustomTests, setWalkinCustomTests] = useState('');
  const [walkinPriority, setWalkinPriority] = useState<VisitPriority>('normal');
  const [walkinFee, setWalkinFee] = useState<number>(50);

  // Modal for editing/adding tests for an existing order in queue
  const [orderForEditTests, setOrderForEditTests] = useState<DiagnosticOrder | null>(null);
  const [editSelectedServiceIds, setEditSelectedServiceIds] = useState<string[]>([]);
  const [editCustomTests, setEditCustomTests] = useState('');
  const [editFee, setEditFee] = useState<number>(50);

  // Print & WhatsApp report modal
  const [printOrder, setPrintOrder] = useState<DiagnosticOrder | null>(null);

  // Calling toast notification
  const [callingToast, setCallingToast] = useState<{ name: string; number: string } | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  useEffect(() => {
    loadLabData();

    const handleUpdate = () => loadLabData();
    window.addEventListener('hospital-diagnostic-order-updated', handleUpdate);
    window.addEventListener('hospital-visit-updated', handleUpdate);

    const interval = setInterval(loadLabData, 4000);
    return () => {
      clearInterval(interval);
      window.removeEventListener('hospital-diagnostic-order-updated', handleUpdate);
      window.removeEventListener('hospital-visit-updated', handleUpdate);
    };
  }, []);

  const loadLabData = () => {
    try {
      const labOrders = getDiagnosticOrders('lab');
      setOrders(labOrders);
      const allServices = getAllDiagnosticServices();
      setServices(allServices.filter(s => s.type === 'lab' || s.service_type === 'lab'));
    } catch (e) {
      console.error('Error loading lab data:', e);
    }
  };

  const showSuccess = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  // Call Patient with Audio + Speech
  const handleCallPatient = (order: DiagnosticOrder) => {
    announcePatientCall({
      patientName: order.patient_name,
      ticketNumber: order.order_number,
      departmentName: 'معمل التحاليل الطبية',
      roomName: 'غرفة سحب العينات بالمعمل',
    });

    updateDiagnosticOrderStatus(order.id, 'called');
    loadLabData();

    setCallingToast({ name: order.patient_name, number: order.order_number });
    setTimeout(() => setCallingToast(null), 4500);
  };

  // Start Taking Sample
  const handleStartSampling = (order: DiagnosticOrder) => {
    updateDiagnosticOrderStatus(order.id, 'in_progress', {
      started_at: new Date().toISOString(),
      technician_name: currentUser?.full_name || 'كيميائي المعمل',
    });
    loadLabData();
    showSuccess(`تم بدء إجراءات سحب العينة للمريض (${order.patient_name})`);
  };

  // Open Results Entry Modal
  const handleOpenResultsModal = (order: DiagnosticOrder) => {
    setActiveOrderForResults(order);
    setSampleTypeInput(order.sample_type || 'عينة دم وريدي');
    setResultsSummaryInput(order.results_summary || '');
  };

  // Save Results & Mark Ready
  const handleSaveResults = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrderForResults) return;

    setIsSavingResult(true);
    try {
      updateDiagnosticOrderStatus(activeOrderForResults.id, 'result_ready', {
        sample_type: sampleTypeInput.trim(),
        results_summary: resultsSummaryInput.trim(),
        technician_name: currentUser?.full_name || 'كيميائي المعمل',
        completed_at: new Date().toISOString(),
      });
      loadLabData();
      setActiveOrderForResults(null);
      showSuccess(`تم اعتماد وحفظ نتيجة التحليل بنجاح وتجهيز التقرير للمريض (${activeOrderForResults.patient_name})`);
    } catch {
      alert('حدث خطأ أثناء حفظ النتيجة');
    } finally {
      setIsSavingResult(false);
    }
  };

  // Mark Delivered
  const handleMarkDelivered = (order: DiagnosticOrder) => {
    updateDiagnosticOrderStatus(order.id, 'delivered');
    loadLabData();
    showSuccess(`تم تسجيل تسليم تقرير التحليل للمريض (${order.patient_name})`);
  };

  // Toggle Walkin Service Selection
  const handleToggleWalkinService = (service: DiagnosticService) => {
    const exists = walkinSelectedServiceIds.includes(service.id);
    const nextIds = exists
      ? walkinSelectedServiceIds.filter(id => id !== service.id)
      : [...walkinSelectedServiceIds, service.id];
    setWalkinSelectedServiceIds(nextIds);

    const sum = nextIds.reduce((total, id) => {
      const match = services.find(s => s.id === id);
      return total + (match?.price || 0);
    }, 0);
    setWalkinFee(sum > 0 ? sum : 50);
  };

  // Handle Direct Walk-in Creation
  const handleCreateWalkin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!walkinPatientName.trim()) {
      alert('يرجى إدخال اسم المريض');
      return;
    }

    const chosen = walkinSelectedServiceIds
      .map(id => services.find(s => s.id === id)?.name)
      .filter(Boolean) as string[];

    if (walkinCustomTests.trim()) {
      chosen.push(walkinCustomTests.trim());
    }

    if (chosen.length === 0) {
      alert('يرجى اختيار تحليل واحد على الأقل من القائمة أو كتابة اسم التحليل');
      return;
    }

    createDiagnosticOrder({
      department: 'lab',
      patient_name: walkinPatientName.trim(),
      patient_phone: walkinPhone.trim(),
      test_names: chosen.join(' + '),
      priority: walkinPriority,
      fee_amount: Number(walkinFee) || 50,
      payment_status: 'paid',
      doctor_name: 'حجز مباشر بشباك المعمل',
      specialty_name: 'معمل التحاليل',
    });

    loadLabData();
    setIsAddWalkinOpen(false);
    setWalkinPatientName('');
    setWalkinPhone('');
    setWalkinSelectedServiceIds([]);
    setWalkinCustomTests('');
    showSuccess('تم تسجيل طلب التحليل وإدراجه في طابور المعمل بنجاح');
  };

  // Open Edit Tests for existing order
  const handleOpenEditTests = (order: DiagnosticOrder) => {
    setOrderForEditTests(order);
    const matchedIds: string[] = [];
    services.forEach(s => {
      if (order.test_names.toLowerCase().includes(s.name.toLowerCase())) {
        matchedIds.push(s.id);
      }
    });
    setEditSelectedServiceIds(matchedIds);
    setEditCustomTests('');
    setEditFee(order.fee_amount || 50);
  };

  // Toggle Edit Service Selection
  const handleToggleEditService = (service: DiagnosticService) => {
    const exists = editSelectedServiceIds.includes(service.id);
    const nextIds = exists
      ? editSelectedServiceIds.filter(id => id !== service.id)
      : [...editSelectedServiceIds, service.id];
    setEditSelectedServiceIds(nextIds);

    const sum = nextIds.reduce((total, id) => {
      const match = services.find(s => s.id === id);
      return total + (match?.price || 0);
    }, 0);
    setEditFee(sum > 0 ? sum : (orderForEditTests?.fee_amount || 50));
  };

  // Save edited tests for existing order
  const handleSaveEditedTests = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderForEditTests) return;

    const chosen = editSelectedServiceIds
      .map(id => services.find(s => s.id === id)?.name)
      .filter(Boolean) as string[];

    if (editCustomTests.trim()) {
      chosen.push(editCustomTests.trim());
    }

    const finalNames = chosen.length > 0 ? chosen.join(' + ') : orderForEditTests.test_names;

    updateDiagnosticOrderStatus(orderForEditTests.id, orderForEditTests.status, {
      test_names: finalNames,
      fee_amount: editFee,
    });
    loadLabData();
    setOrderForEditTests(null);
    showSuccess(`تم تحديث قائمة فحوصات المريض (${orderForEditTests.patient_name}) بنجاح`);
  };

  // Toggle Reagent Status
  const handleToggleReagent = (svc: DiagnosticService) => {
    try {
      updateDiagnosticService(svc.id, { is_active: !svc.is_active });
      loadLabData();
      showSuccess(
        !svc.is_active
          ? `تم تفعيل فحص "${svc.name}" وتوفر الكواشف بالمعمل`
          : `تم إيقاف فحص "${svc.name}" مؤقتاً لنفاد الكواشف المخبرية`
      );
    } catch {
      alert('فشل تعديل حالة الكواشف');
    }
  };

  // Filtered orders
  const filteredOrders = orders.filter(o => {
    const matchesSearch =
      !searchQuery ||
      o.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.patient_phone && o.patient_phone.includes(searchQuery)) ||
      o.test_names.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'waiting' && (o.status === 'waiting' || o.status === 'called')) ||
      (statusFilter === 'in_progress' && o.status === 'in_progress') ||
      (statusFilter === 'result_ready' && o.status === 'result_ready') ||
      (statusFilter === 'delivered' && o.status === 'delivered');

    return matchesSearch && matchesStatus;
  });

  // Next waiting patient in queue
  const nextWaitingOrder = orders.find(o => o.status === 'waiting' || o.status === 'called');

  // Stats
  const waitingCount = orders.filter(o => o.status === 'waiting' || o.status === 'called').length;
  const inProgressCount = orders.filter(o => o.status === 'in_progress').length;
  const readyCount = orders.filter(o => o.status === 'result_ready').length;
  const deliveredCount = orders.filter(o => o.status === 'delivered').length;

  return (
    <div className="min-h-screen bg-slate-100/90 text-slate-800 pb-16 font-sans">
      {/* Visual Live Calling Banner */}
      {callingToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-bounce">
          <div className="px-5 py-3 bg-amber-600 text-white rounded-2xl shadow-2xl border-2 border-amber-300 flex items-center gap-3">
            <Volume2 className="w-6 h-6 animate-pulse" />
            <div>
              <div className="text-[11px] font-semibold text-amber-100">جاري النداء الصوتي عبر المكبر الآن:</div>
              <div className="text-sm font-extrabold">
                {callingToast.number} — {callingToast.name} (التوجه لغرفة سحب العينات)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Notification */}
      {successToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="px-4 py-2.5 bg-emerald-700 text-white rounded-xl shadow-lg border border-emerald-500 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{successToast}</span>
          </div>
        </div>
      )}

      {/* Top Professional Header */}
      <header className="bg-slate-900 text-white sticky top-0 z-30 shadow-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
              <FlaskConical className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-sm sm:text-base text-white">
                  معمل التحاليل الطبية والباثولوجيا الإكلينيكية
                </h1>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                  إدارة الأدوار وسحب العينات
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                مستوصف لجنة زكاة ميت علي الخيري
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-xl text-xs font-semibold text-slate-200 border border-slate-700">
              <UserCheck className="w-4 h-4 text-amber-400" />
              <span>{currentUser?.full_name || 'كيميائي المعمل'}</span>
              <span className="text-[10px] text-amber-300/80 font-normal">
                (فني معمل التحاليل)
              </span>
            </div>

            {onBackToPublic && (
              <button
                onClick={onBackToPublic}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-teal-300 hover:text-white bg-teal-950/70 hover:bg-teal-900 rounded-xl transition-colors cursor-pointer border border-teal-700/60"
                title="العودة لواجهة الموقع العام"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">الموقع</span>
              </button>
            )}

            <button
              onClick={() => {
                logout();
                if (onBackToPublic) onBackToPublic();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-300 hover:text-white bg-rose-950/70 hover:bg-rose-900 rounded-xl transition-colors cursor-pointer border border-rose-800/60"
              title="تسجيل الخروج"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">خروج</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-5 space-y-5">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold">بانتظار سحب العينة</span>
              <Users className="w-4 h-4 text-amber-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-amber-700">{waitingCount}</span>
              <span className="text-xs text-slate-400">مريض</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold">جاري الفحص بالأجهزة</span>
              <Clock className="w-4 h-4 text-blue-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-blue-700">{inProgressCount}</span>
              <span className="text-xs text-slate-400">عينة</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold">النتائج الجاهزة</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-emerald-700">{readyCount}</span>
              <span className="text-xs text-slate-400">تقرير</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold">تم تسليمه للمرضى</span>
              <FileCheck className="w-4 h-4 text-slate-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-slate-800">{deliveredCount}</span>
              <span className="text-xs text-slate-400">حالة</span>
            </div>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 rounded-2xl shadow-xs">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('queue')}
              className={`py-3.5 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
                activeTab === 'queue'
                  ? 'border-amber-600 text-amber-900 bg-amber-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Users className="w-4 h-4 text-amber-600" />
              <span>طابور أدوار المعمل اليوم ({orders.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('reagents')}
              className={`py-3.5 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
                activeTab === 'reagents'
                  ? 'border-amber-600 text-amber-900 bg-amber-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FlaskConical className="w-4 h-4 text-teal-600" />
              <span>جاهزية الكواشف وتحاليل المعمل ({services.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAddWalkinOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>تسجيل تحليل شباك مباشر</span>
            </button>
          </div>
        </div>

        {/* TAB 1: Patients Queue */}
        {activeTab === 'queue' && (
          <div className="space-y-4">
            {/* Quick Call Header Bar */}
            <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-slate-900 rounded-2xl p-4 sm:p-5 text-white shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-bold text-amber-400 bg-amber-950/80 px-2.5 py-0.5 rounded-full border border-amber-800">
                  نظام نداء المرضى الآلي
                </span>
                <h3 className="text-base sm:text-lg font-black mt-1">
                  استدعاء الحالات لغرفة سحب العينات
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  يتم تشغيل رنين المستشفى الصوتي مع نداء اسم المريض ورقم دوره باللغة العربية
                </p>
              </div>

              <button
                type="button"
                onClick={() => nextWaitingOrder && handleCallPatient(nextWaitingOrder)}
                disabled={!nextWaitingOrder}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl font-black text-xs sm:text-sm shadow-lg transition-all cursor-pointer ${
                  nextWaitingOrder
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/30 active:scale-95'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-60'
                }`}
              >
                <Volume2 className="w-5 h-5 animate-pulse" />
                <span>
                  {nextWaitingOrder
                    ? `نداء الدور التالي: (${nextWaitingOrder.order_number} - ${nextWaitingOrder.patient_name})`
                    : 'لا توجد حالات بانتظار السحب'}
                </span>
              </button>
            </div>

            {/* Filters & Search Toolbar */}
            <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="ابحث باسم المريض، رقم التذكرة، أو اسم التحليل..."
                  className="w-full pr-9 pl-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-hidden focus:border-amber-600 focus:bg-white transition-colors"
                />
              </div>

              <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 text-xs">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer shrink-0 ${
                    statusFilter === 'all'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  الكل ({orders.length})
                </button>
                <button
                  onClick={() => setStatusFilter('waiting')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer shrink-0 ${
                    statusFilter === 'waiting'
                      ? 'bg-amber-600 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  بالانتظار ({waitingCount})
                </button>
                <button
                  onClick={() => setStatusFilter('in_progress')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer shrink-0 ${
                    statusFilter === 'in_progress'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  جاري الفحص ({inProgressCount})
                </button>
                <button
                  onClick={() => setStatusFilter('result_ready')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer shrink-0 ${
                    statusFilter === 'result_ready'
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  جاهزة للتسليم ({readyCount})
                </button>
                <button
                  onClick={loadLabData}
                  className="p-2 text-slate-500 hover:text-amber-800 hover:bg-slate-100 rounded-lg cursor-pointer"
                  title="تحديث"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Queue Cards List */}
            {filteredOrders.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 space-y-2">
                <FlaskConical className="w-10 h-10 text-slate-300 mx-auto" />
                <h4 className="font-bold text-sm text-slate-700">لا توجد حالات في طابور المعمل حالياً</h4>
                <p className="text-xs text-slate-400">ستظهر هنا أي تحاليل يطلبها الأطباء بالعيادات أو تسجل عبر الشباك</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredOrders.map(order => {
                  const isWaiting = order.status === 'waiting' || order.status === 'called';
                  const isInProgress = order.status === 'in_progress';
                  const isReady = order.status === 'result_ready';
                  const isDelivered = order.status === 'delivered';

                  return (
                    <div
                      key={order.id}
                      className={`bg-white rounded-2xl border p-4 sm:p-5 shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                        order.priority === 'urgent' && isWaiting
                          ? 'border-rose-400 bg-rose-50/30 ring-2 ring-rose-200'
                          : order.status === 'called'
                          ? 'border-amber-400 bg-amber-50/40 ring-2 ring-amber-200'
                          : isReady
                          ? 'border-emerald-300 bg-emerald-50/15'
                          : 'border-slate-200 hover:border-amber-300'
                      }`}
                    >
                      {/* Patient & Tests Details */}
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-1 bg-slate-900 text-white font-mono font-black text-xs rounded-lg">
                            {order.order_number}
                          </span>
                          <h4 className="font-black text-slate-900 text-sm sm:text-base">
                            {order.patient_name}
                          </h4>
                          {order.patient_number && (
                            <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                              #{order.patient_number}
                            </span>
                          )}

                          {/* Priority badge */}
                          {order.priority === 'urgent' ? (
                            <span className="px-2 py-0.5 bg-rose-100 text-rose-800 border border-rose-300 text-[10px] font-bold rounded-md flex items-center gap-1 animate-pulse">
                              <Zap className="w-3 h-3 text-rose-600 fill-rose-600" />
                              <span>حالة عاجلة طارئة</span>
                            </span>
                          ) : order.priority === 'elderly' ? (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-md">
                              كبار السن
                            </span>
                          ) : order.priority === 'special_needs' ? (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-bold rounded-md">
                              أصحاب همم
                            </span>
                          ) : null}

                          {/* Status Badge */}
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              order.status === 'called'
                                ? 'bg-amber-100 text-amber-900 border border-amber-300 animate-pulse'
                                : isWaiting
                                ? 'bg-slate-100 text-slate-700'
                                : isInProgress
                                ? 'bg-blue-100 text-blue-900 border border-blue-300'
                                : isReady
                                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {order.status === 'called'
                              ? 'جاري النداء بالمكبر'
                              : isWaiting
                              ? 'بالانتظار'
                              : isInProgress
                              ? 'جاري سحب وفحص العينة'
                              : isReady
                              ? 'النتيجة جاهزة للتسليم'
                              : 'تم تسليم المريض'}
                          </span>
                        </div>

                        {/* Required Tests Description */}
                        <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-2.5 text-xs text-amber-950">
                          <strong className="font-bold text-amber-900 block mb-0.5">
                            التحاليل والفحوصات المطلوبة:
                          </strong>
                          <span>{order.test_names}</span>
                        </div>

                        <div className="flex items-center gap-4 text-[11px] text-slate-500 pt-0.5">
                          {order.doctor_name && (
                            <span className="flex items-center gap-1 text-blue-700 font-medium">
                              <Stethoscope className="w-3.5 h-3.5" />
                              <span>المحول: {order.doctor_name}</span>
                            </span>
                          )}
                          {order.sample_type && (
                            <span className="flex items-center gap-1 text-slate-600">
                              <Droplet className="w-3.5 h-3.5 text-rose-500" />
                              <span>نوع العينة: {order.sample_type}</span>
                            </span>
                          )}
                          {order.fee_amount && (
                            <span className="font-bold text-emerald-700">
                              الرسوم: {order.fee_amount} ج.م (مسدد)
                            </span>
                          )}
                        </div>

                        {/* Results Summary if ready */}
                        {order.results_summary && (
                          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-2.5 text-xs text-emerald-950 mt-1">
                            <strong className="font-bold text-emerald-900 block mb-0.5">
                              النتيجة المسجلة:
                            </strong>
                            <p className="whitespace-pre-wrap font-mono text-[11px]">{order.results_summary}</p>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 flex-wrap shrink-0 border-t md:border-t-0 pt-3 md:pt-0">
                        {/* Audio Call Button */}
                        <button
                          type="button"
                          onClick={() => handleCallPatient(order)}
                          className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
                          title="تشغيل رنين المستشفى ونداء المريض باللغة العربية"
                        >
                          <Volume2 className="w-4 h-4 text-amber-700" />
                          <span>نداء بالصوت</span>
                        </button>

                        {/* Edit Tests button (for waiting or in_progress) */}
                        {(isWaiting || isInProgress) && (
                          <button
                            type="button"
                            onClick={() => handleOpenEditTests(order)}
                            className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                            title="إضافة أو تعديل التحاليل المطلوبة للمريض"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                            <span>تعديل الفحوصات</span>
                          </button>
                        )}

                        {/* Start sampling button */}
                        {isWaiting && (
                          <button
                            type="button"
                            onClick={() => handleStartSampling(order)}
                            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                          >
                            بدء سحب العينة
                          </button>
                        )}

                        {/* Enter results button */}
                        {(isInProgress || isWaiting) && (
                          <button
                            type="button"
                            onClick={() => handleOpenResultsModal(order)}
                            className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                          >
                            تسجيل نتيجة التحليل
                          </button>
                        )}

                        {/* Edit results if already ready */}
                        {isReady && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenResultsModal(order)}
                              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                            >
                              تعديل النتيجة
                            </button>

                            <button
                              type="button"
                              onClick={() => setPrintOrder(order)}
                              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                              title="إرسال التقرير واتساب ومشاركة النتيجة مع المريض"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>مشاركة واتساب والتقرير</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setPrintOrder(order)}
                              className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>طباعة</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleMarkDelivered(order)}
                              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                            >
                              تسليم للمريض
                            </button>
                          </>
                        )}

                        {isDelivered && (
                          <button
                            type="button"
                            onClick={() => setPrintOrder(order)}
                            className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                            <span>واتساب / إعادة طباعة</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Reagents & Tests Control */}
        {activeTab === 'reagents' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">
                  جاهزية الكواشف وأجهزة معمل التحاليل
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  عند نفاد أي كاشف مخبري، يمكنك إيقاف الفحص بضغطة زر لمنع حجز التحليل من الاستقبال أو الموقع العام لحين توفره
                </p>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 text-xs font-bold">
                إجمالي تحاليل المعمل: {services.length}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {services.map(svc => (
                <div
                  key={svc.id}
                  className={`bg-white rounded-2xl border p-4 shadow-xs transition-all flex flex-col justify-between ${
                    svc.is_active ? 'border-slate-200' : 'border-rose-200 bg-rose-50/20'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{svc.name}</h4>
                        {svc.latin_name && (
                          <span className="text-[11px] font-mono text-slate-400 block" dir="ltr">
                            {svc.latin_name}
                          </span>
                        )}
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                        {svc.category || 'تحاليل مخبرية'}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-600 mt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">السعر الخيري:</span>
                        <span className="font-extrabold text-emerald-700">{svc.price} ج.م</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">مدة استخراج النتيجة:</span>
                        <span>{svc.estimated_duration || 'نفس اليوم'}</span>
                      </div>
                      {svc.preparation && (
                        <div className="bg-slate-50 p-2 rounded-lg text-[11px] text-slate-600 mt-1">
                          <strong>تعليمات العينة:</strong> {svc.preparation}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500">حالة الكاشف:</span>
                    <button
                      type="button"
                      onClick={() => handleToggleReagent(svc)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        svc.is_active
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : 'bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-300'
                      }`}
                    >
                      {svc.is_active ? 'الكواشف متوفرة' : 'نفاد الكاشف (موقوف)'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Modal 1: Results Entry & Approval */}
      {activeOrderForResults && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-teal-50 text-teal-600 rounded-xl">
                  <FlaskConical className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">
                    تسجيل واعتماد نتيجة التحليل الطبي
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    المريض: {activeOrderForResults.patient_name} ({activeOrderForResults.order_number})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveOrderForResults(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveResults} className="space-y-3.5">
              <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200 text-xs">
                <span className="font-bold text-amber-900 block mb-0.5">التحاليل المطلوبة:</span>
                <span className="text-amber-950 font-semibold">{activeOrderForResults.test_names}</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  نوع العينة المسحوبة
                </label>
                <select
                  value={sampleTypeInput}
                  onChange={e => setSampleTypeInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-amber-600 bg-white"
                >
                  <option value="عينة دم وريدي كامل (EDTA Tube)">عينة دم وريدي كامل (EDTA Tube)</option>
                  <option value="سيرم دم صائم (Serum Separator)">سيرم دم صائم (Serum Separator)</option>
                  <option value="عينة بول عشوائية (Clean Catch Urine)">عينة بول عشوائية (Clean Catch Urine)</option>
                  <option value="عينة براز طازجة (Fresh Stool Sample)">عينة براز طازجة (Fresh Stool Sample)</option>
                  <option value="مسحة حلق / أنف (Throat/Nasal Swab)">مسحة حلق / أنف (Throat/Nasal Swab)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  نتائج وقراءات التحليل المعملي <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={5}
                  value={resultsSummaryInput}
                  onChange={e => setResultsSummaryInput(e.target.value)}
                  placeholder="مثال:
- Hemoglobin (Hb): 13.8 g/dL (Normal: 12.0 - 16.0)
- Fasting Blood Sugar: 95 mg/dL (Normal: 70 - 100)
- H. Pylori Stool Antigen: Negative
ملاحظات: العينة نقية وبحالة جيدة."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-amber-600 font-mono text-slate-900"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveOrderForResults(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSavingResult}
                  className="px-5 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  {isSavingResult ? 'جاري الحفظ...' : 'اعتماد وتجهيز التقرير'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Direct Walk-in Lab Ticket */}
      {isAddWalkinOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">تسجيل تحليل مباشر (شباك المعمل)</h3>
                  <p className="text-[11px] text-slate-500">حجز وإدراج مباشر في طابور السحب من دليل التحاليل الشامل</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddWalkinOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateWalkin} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    اسم المريض <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={walkinPatientName}
                    onChange={e => setWalkinPatientName(e.target.value)}
                    placeholder="مثال: يوسف عادل الشربيني"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-amber-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    رقم الهاتف (للتواصل وإرسال التقرير واتساب)
                  </label>
                  <input
                    type="tel"
                    value={walkinPhone}
                    onChange={e => setWalkinPhone(e.target.value)}
                    placeholder="01012345678"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-amber-600 font-mono"
                  />
                </div>
              </div>

              {/* Full Test Catalog Selector */}
              <div>
                <label className="block text-xs font-extrabold text-slate-800 mb-1">
                  اختر التحاليل المطلوبة من قائمة المعمل الشاملة <span className="text-rose-500">*</span>
                </label>
                <DiagnosticServicePicker
                  department="lab"
                  selectedServiceIds={walkinSelectedServiceIds}
                  onToggleService={handleToggleWalkinService}
                  customTests={walkinCustomTests}
                  onChangeCustomTests={setWalkinCustomTests}
                  onClearSelected={() => setWalkinSelectedServiceIds([])}
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    أولوية الدور
                  </label>
                  <select
                    value={walkinPriority}
                    onChange={e => setWalkinPriority(e.target.value as any)}
                    className="w-full px-2.5 py-2 text-xs border border-slate-200 rounded-xl bg-white"
                  >
                    <option value="normal">عادي</option>
                    <option value="urgent">طوارئ وعاجل</option>
                    <option value="elderly">كبار السن</option>
                    <option value="special_needs">أصحاب همم</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    الرسوم الخيرية المحصلة (ج.م)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="5"
                    value={walkinFee}
                    onChange={e => setWalkinFee(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-amber-600 font-mono font-bold text-emerald-800"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddWalkinOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  إدراج في طابور المعمل
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2.5: Edit Tests for an Existing Order in Queue */}
      {orderForEditTests && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    تعديل وإضافة تحاليل للمريض ({orderForEditTests.patient_name})
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    رقم الطلب: {orderForEditTests.order_number} • إضافة تحاليل إضافية بطلب الطبيب أو المريض
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOrderForEditTests(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedTests} className="space-y-3.5">
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs">
                <span className="text-slate-600 block mb-1">التحاليل الحالية المسجلة بالطلب:</span>
                <strong className="text-amber-950 text-xs">{orderForEditTests.test_names}</strong>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-800 mb-1">
                  اختر تحاليل إضافية أو حدّث القائمة من الدليل الشامل
                </label>
                <DiagnosticServicePicker
                  department="lab"
                  selectedServiceIds={editSelectedServiceIds}
                  onToggleService={handleToggleEditService}
                  customTests={editCustomTests}
                  onChangeCustomTests={setEditCustomTests}
                  onClearSelected={() => setEditSelectedServiceIds([])}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الرسوم الخيرية الإجمالية (ج.م)
                </label>
                <input
                  type="number"
                  min="0"
                  step="5"
                  value={editFee}
                  onChange={e => setEditFee(Number(e.target.value))}
                  className="w-48 px-3 py-2 text-xs border border-slate-200 rounded-xl font-mono font-bold text-emerald-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setOrderForEditTests(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  حفظ التعديلات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Official Report Sharing & Print Modal */}
      <DiagnosticReportShareModal
        isOpen={!!printOrder}
        onClose={() => setPrintOrder(null)}
        order={printOrder}
        currentStaffName={currentUser?.full_name}
      />
    </div>
  );
};
