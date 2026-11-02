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
  Scan,
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
  Activity,
  Tag,
  Banknote,
  Calendar,
  Sparkles,
  MessageSquare,
  Edit3,
  Share2,
} from 'lucide-react';
import { printElement } from '../../lib/printUtils';
import { DiagnosticServicePicker } from './DiagnosticServicePicker';
import { DiagnosticReportShareModal } from './DiagnosticReportShareModal';

interface RadiologyTechnicianPortalProps {
  onBackToPublic?: () => void;
}

export const RadiologyTechnicianPortal: React.FC<RadiologyTechnicianPortalProps> = ({
  onBackToPublic,
}) => {
  const { currentUser, logout } = useAuth();

  // Navigation tab inside radiology portal
  const [activeTab, setActiveTab] = useState<'queue' | 'machines' | 'history'>('queue');

  // Queue state
  const [orders, setOrders] = useState<DiagnosticOrder[]>([]);
  const [services, setServices] = useState<DiagnosticService[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'waiting' | 'in_progress' | 'result_ready' | 'delivered'>('all');

  // Active modal state for radiology report
  const [activeOrderForReport, setActiveOrderForReport] = useState<DiagnosticOrder | null>(null);
  const [machineTypeInput, setMachineTypeInput] = useState('جهاز الأشعة السينية الرقمية (Digital X-Ray)');
  const [findingsInput, setFindingsInput] = useState('');
  const [conclusionInput, setConclusionInput] = useState('');
  const [isSavingReport, setIsSavingReport] = useState(false);

  // New direct walk-in scan modal
  const [isAddWalkinOpen, setIsAddWalkinOpen] = useState(false);
  const [walkinPatientName, setWalkinPatientName] = useState('');
  const [walkinPhone, setWalkinPhone] = useState('');
  const [walkinSelectedServiceIds, setWalkinSelectedServiceIds] = useState<string[]>([]);
  const [walkinCustomScans, setWalkinCustomScans] = useState('');
  const [walkinPriority, setWalkinPriority] = useState<VisitPriority>('normal');
  const [walkinFee, setWalkinFee] = useState<number>(70);

  // Modal for editing/adding scans for an existing order in queue
  const [orderForEditScans, setOrderForEditScans] = useState<DiagnosticOrder | null>(null);
  const [editSelectedServiceIds, setEditSelectedServiceIds] = useState<string[]>([]);
  const [editCustomScans, setEditCustomScans] = useState('');
  const [editFee, setEditFee] = useState<number>(70);

  // Print & WhatsApp report modal
  const [printOrder, setPrintOrder] = useState<DiagnosticOrder | null>(null);

  // Calling toast notification
  const [callingToast, setCallingToast] = useState<{ name: string; number: string } | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  useEffect(() => {
    loadRadiologyData();

    const handleUpdate = () => loadRadiologyData();
    window.addEventListener('hospital-diagnostic-order-updated', handleUpdate);
    window.addEventListener('hospital-visit-updated', handleUpdate);

    const interval = setInterval(loadRadiologyData, 4000);
    return () => {
      clearInterval(interval);
      window.removeEventListener('hospital-diagnostic-order-updated', handleUpdate);
      window.removeEventListener('hospital-visit-updated', handleUpdate);
    };
  }, []);

  const loadRadiologyData = () => {
    try {
      const radOrders = getDiagnosticOrders('radiology');
      setOrders(radOrders);
      const allServices = getAllDiagnosticServices();
      setServices(allServices.filter(s => s.type === 'radiology' || s.service_type === 'radiology'));
    } catch (e) {
      console.error('Error loading radiology data:', e);
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
      departmentName: 'قسم الأشعة والتصوير الطبي',
      roomName: 'غرفة فحص الأشعة والتصوير',
    });

    updateDiagnosticOrderStatus(order.id, 'called');
    loadRadiologyData();

    setCallingToast({ name: order.patient_name, number: order.order_number });
    setTimeout(() => setCallingToast(null), 4500);
  };

  // Start Scan Procedure
  const handleStartScan = (order: DiagnosticOrder) => {
    updateDiagnosticOrderStatus(order.id, 'in_progress', {
      started_at: new Date().toISOString(),
      technician_name: currentUser?.full_name || 'أخصائي الأشعة والتصوير',
    });
    loadRadiologyData();
    showSuccess(`تم دخول المريض (${order.patient_name}) وبدء إجراءات التصوير الإشعاعي`);
  };

  // Open Radiology Report Modal
  const handleOpenReportModal = (order: DiagnosticOrder) => {
    setActiveOrderForReport(order);
    setMachineTypeInput(order.sample_type || 'جهاز الأشعة السينية الرقمية (Digital X-Ray)');
    setFindingsInput(order.radiology_findings || '');
    setConclusionInput(order.radiology_conclusion || '');
  };

  // Save Report & Mark Ready
  const handleSaveReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrderForReport) return;

    setIsSavingReport(true);
    try {
      updateDiagnosticOrderStatus(activeOrderForReport.id, 'result_ready', {
        sample_type: machineTypeInput.trim(),
        radiology_findings: findingsInput.trim(),
        radiology_conclusion: conclusionInput.trim(),
        technician_name: currentUser?.full_name || 'أخصائي تكنولوجي / مصطفى سالم',
        completed_at: new Date().toISOString(),
      });
      loadRadiologyData();
      setActiveOrderForReport(null);
      showSuccess(`تم اعتماد وكتابة تقرير الأشعة بنجاح للمريض (${activeOrderForReport.patient_name})`);
    } catch {
      alert('حدث خطأ أثناء حفظ تقرير الأشعة');
    } finally {
      setIsSavingReport(false);
    }
  };

  // Mark Delivered
  const handleMarkDelivered = (order: DiagnosticOrder) => {
    updateDiagnosticOrderStatus(order.id, 'delivered');
    loadRadiologyData();
    showSuccess(`تم تسجيل تسليم أفلام وتقرير الأشعة للمريض (${order.patient_name})`);
  };

  // Toggle Walkin Scan Selection
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
    setWalkinFee(sum > 0 ? sum : 70);
  };

  // Handle Direct Walk-in Scan Creation
  const handleCreateWalkin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!walkinPatientName.trim()) {
      alert('يرجى إدخال اسم المريض');
      return;
    }

    const chosen = walkinSelectedServiceIds
      .map(id => services.find(s => s.id === id)?.name)
      .filter(Boolean) as string[];

    if (walkinCustomScans.trim()) {
      chosen.push(walkinCustomScans.trim());
    }

    if (chosen.length === 0) {
      alert('يرجى اختيار فحص أشعة واحد على الأقل من القائمة أو كتابة اسم الفحص');
      return;
    }

    createDiagnosticOrder({
      department: 'radiology',
      patient_name: walkinPatientName.trim(),
      patient_phone: walkinPhone.trim(),
      test_names: chosen.join(' + '),
      priority: walkinPriority,
      fee_amount: Number(walkinFee) || 70,
      payment_status: 'paid',
      doctor_name: 'حجز مباشر بشباك الأشعة',
      specialty_name: 'قسم الأشعة والتصوير',
    });

    loadRadiologyData();
    setIsAddWalkinOpen(false);
    setWalkinPatientName('');
    setWalkinPhone('');
    setWalkinSelectedServiceIds([]);
    setWalkinCustomScans('');
    showSuccess('تم حجز فحص الأشعة وإدراجه في طابور القسم بنجاح');
  };

  // Open Edit Scans for existing order
  const handleOpenEditScans = (order: DiagnosticOrder) => {
    setOrderForEditScans(order);
    const matchedIds: string[] = [];
    services.forEach(s => {
      if (order.test_names.toLowerCase().includes(s.name.toLowerCase())) {
        matchedIds.push(s.id);
      }
    });
    setEditSelectedServiceIds(matchedIds);
    setEditCustomScans('');
    setEditFee(order.fee_amount || 70);
  };

  // Toggle Edit Scan Selection
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
    setEditFee(sum > 0 ? sum : (orderForEditScans?.fee_amount || 70));
  };

  // Save edited scans for existing order
  const handleSaveEditedScans = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderForEditScans) return;

    const chosen = editSelectedServiceIds
      .map(id => services.find(s => s.id === id)?.name)
      .filter(Boolean) as string[];

    if (editCustomScans.trim()) {
      chosen.push(editCustomScans.trim());
    }

    const finalNames = chosen.length > 0 ? chosen.join(' + ') : orderForEditScans.test_names;

    updateDiagnosticOrderStatus(orderForEditScans.id, orderForEditScans.status, {
      test_names: finalNames,
      fee_amount: editFee,
    });
    loadRadiologyData();
    setOrderForEditScans(null);
    showSuccess(`تم تحديث قائمة فحوصات المريض (${orderForEditScans.patient_name}) بنجاح`);
  };

  // Toggle Machine / Scan Availability
  const handleToggleService = (svc: DiagnosticService) => {
    try {
      updateDiagnosticService(svc.id, { is_active: !svc.is_active });
      loadRadiologyData();
      showSuccess(
        !svc.is_active
          ? `تم تفعيل فحص "${svc.name}" وجاهزية الجهاز للعمل`
          : `تم إيقاف فحص "${svc.name}" مؤقتاً لصيانة الجهاز أو تغيير الأنبوبة`
      );
    } catch {
      alert('فشل تعديل حالة الفحص');
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
          <div className="px-5 py-3 bg-indigo-600 text-white rounded-2xl shadow-2xl border-2 border-indigo-300 flex items-center gap-3">
            <Volume2 className="w-6 h-6 animate-pulse" />
            <div>
              <div className="text-[11px] font-semibold text-indigo-100">جاري النداء الصوتي عبر المكبر الآن:</div>
              <div className="text-sm font-extrabold">
                {callingToast.number} — {callingToast.name} (التوجه لغرفة فحص الأشعة)
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

      {/* Top Header */}
      <header className="bg-slate-900 text-white sticky top-0 z-30 shadow-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
              <Scan className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-sm sm:text-base text-white">
                  قسم الأشعة التشخيصية والتصوير الطبي والموجات الصوتية
                </h1>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold border border-indigo-500/30">
                  إدارة طابور الفحص والتقارير
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                مستوصف لجنة زكاة ميت علي الخيري
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-xl text-xs font-semibold text-slate-200 border border-slate-700">
              <UserCheck className="w-4 h-4 text-indigo-400" />
              <span>{currentUser?.full_name || 'أخصائي الأشعة'}</span>
              <span className="text-[10px] text-indigo-300/80 font-normal">
                (فني الأشعة والتصوير)
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

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-5 space-y-5">
        {/* KPI Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold">بانتظار إجراء الفحص</span>
              <Users className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-indigo-700">{waitingCount}</span>
              <span className="text-xs text-slate-400">مريض</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold">داخل غرفة الأشعة</span>
              <Scan className="w-4 h-4 text-blue-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-blue-700">{inProgressCount}</span>
              <span className="text-xs text-slate-400">حالة</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold">تقارير جاهزة للاستلام</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-emerald-700">{readyCount}</span>
              <span className="text-xs text-slate-400">تقرير معتمد</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold">تم تسليم الأفلام والتقرير</span>
              <FileCheck className="w-4 h-4 text-slate-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-slate-800">{deliveredCount}</span>
              <span className="text-xs text-slate-400">مريض</span>
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
                  ? 'border-indigo-600 text-indigo-900 bg-indigo-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Users className="w-4 h-4 text-indigo-600" />
              <span>طابور فحص الأشعة والسونار اليوم ({orders.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('machines')}
              className={`py-3.5 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
                activeTab === 'machines'
                  ? 'border-indigo-600 text-indigo-900 bg-indigo-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Scan className="w-4 h-4 text-indigo-600" />
              <span>أجهزة وفحوصات الأشعة المتاحة ({services.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAddWalkinOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>حجز فحص أشعة مباشر</span>
            </button>
          </div>
        </div>

        {/* TAB 1: Queue Workspace */}
        {activeTab === 'queue' && (
          <div className="space-y-4">
            {/* Quick Call Hero Strip */}
            <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-900 rounded-2xl p-4 sm:p-5 text-white shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-bold text-indigo-400 bg-indigo-950/80 px-2.5 py-0.5 rounded-full border border-indigo-800">
                  نظام نداء المرضى الصوتي
                </span>
                <h3 className="text-base sm:text-lg font-black mt-1">
                  استدعاء الحالات لغرفة فحص الأشعة والسونار
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  إطلاق نغمة المستشفى وتنبيه المريض بالاسم والدور للتوجه لغرفة التصوير
                </p>
              </div>

              <button
                type="button"
                onClick={() => nextWaitingOrder && handleCallPatient(nextWaitingOrder)}
                disabled={!nextWaitingOrder}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl font-black text-xs sm:text-sm shadow-lg transition-all cursor-pointer ${
                  nextWaitingOrder
                    ? 'bg-indigo-500 hover:bg-indigo-400 text-white shadow-indigo-500/30 active:scale-95'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-60'
                }`}
              >
                <Volume2 className="w-5 h-5 animate-pulse" />
                <span>
                  {nextWaitingOrder
                    ? `نداء الدور التالي: (${nextWaitingOrder.order_number} - ${nextWaitingOrder.patient_name})`
                    : 'لا توجد حالات بانتظار التصوير'}
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
                  placeholder="ابحث باسم المريض، رقم التذكرة، أو نوع الأشعة..."
                  className="w-full pr-9 pl-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-hidden focus:border-indigo-600 focus:bg-white transition-colors"
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
                      ? 'bg-indigo-600 text-white'
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
                  داخل الغرفة ({inProgressCount})
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
                  onClick={loadRadiologyData}
                  className="p-2 text-slate-500 hover:text-indigo-800 hover:bg-slate-100 rounded-lg cursor-pointer"
                  title="تحديث"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Queue Cards List */}
            {filteredOrders.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 space-y-2">
                <Scan className="w-10 h-10 text-slate-300 mx-auto" />
                <h4 className="font-bold text-sm text-slate-700">لا توجد حالات في طابور الأشعة حالياً</h4>
                <p className="text-xs text-slate-400">ستظهر هنا أي فحوصات يطلبها أطباء العيادات أو تسجل عبر الشباك</p>
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
                          ? 'border-indigo-400 bg-indigo-50/40 ring-2 ring-indigo-200'
                          : isReady
                          ? 'border-emerald-300 bg-emerald-50/15'
                          : 'border-slate-200 hover:border-indigo-300'
                      }`}
                    >
                      {/* Patient & Scan Info */}
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
                                ? 'bg-indigo-100 text-indigo-900 border border-indigo-300 animate-pulse'
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
                              ? 'داخل غرفة الأشعة'
                              : isReady
                              ? 'التقرير معتمد وجاهز'
                              : 'تم تسليم المريض'}
                          </span>
                        </div>

                        {/* Required Scan Description */}
                        <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-xl p-2.5 text-xs text-indigo-950">
                          <strong className="font-bold text-indigo-900 block mb-0.5">
                            الفحص الإشعاعي المطلوب:
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
                              <Scan className="w-3.5 h-3.5 text-indigo-600" />
                              <span>الجهاز: {order.sample_type}</span>
                            </span>
                          )}
                          {order.fee_amount && (
                            <span className="font-bold text-emerald-700">
                              الرسوم: {order.fee_amount} ج.م (مسدد)
                            </span>
                          )}
                        </div>

                        {/* Findings & Conclusion if ready */}
                        {order.radiology_findings && (
                          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-2.5 text-xs text-emerald-950 mt-1 space-y-1">
                            <div>
                              <strong className="font-bold text-emerald-900 block mb-0.5">
                                تقرير الفحص الإشعاعي:
                              </strong>
                              <p className="whitespace-pre-wrap text-[11px]">{order.radiology_findings}</p>
                            </div>
                            {order.radiology_conclusion && (
                              <div className="pt-1 border-t border-emerald-200/60 font-semibold text-emerald-900">
                                <strong>الخلاصة: </strong> {order.radiology_conclusion}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 flex-wrap shrink-0 border-t md:border-t-0 pt-3 md:pt-0">
                        {/* Audio Call Button */}
                        <button
                          type="button"
                          onClick={() => handleCallPatient(order)}
                          className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
                          title="تشغيل رنين المستشفى ونداء المريض باللغة العربية"
                        >
                          <Volume2 className="w-4 h-4 text-indigo-700" />
                          <span>نداء بالصوت</span>
                        </button>

                        {/* Edit Scans button (for waiting or in_progress) */}
                        {(isWaiting || isInProgress) && (
                          <button
                            type="button"
                            onClick={() => handleOpenEditScans(order)}
                            className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                            title="إضافة أو تعديل فحوصات الأشعة للمريض"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                            <span>تعديل الفحوصات</span>
                          </button>
                        )}

                        {/* Start Scan Button */}
                        {isWaiting && (
                          <button
                            type="button"
                            onClick={() => handleStartScan(order)}
                            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                          >
                            بدء التصوير
                          </button>
                        )}

                        {/* Write Radiology Report */}
                        {(isInProgress || isWaiting) && (
                          <button
                            type="button"
                            onClick={() => handleOpenReportModal(order)}
                            className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                          >
                            كتابة تقرير الأشعة
                          </button>
                        )}

                        {/* Edit report if ready */}
                        {isReady && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenReportModal(order)}
                              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                            >
                              تعديل التقرير
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

        {/* TAB 2: Machines & Scans Control */}
        {activeTab === 'machines' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">
                  جاهزية أجهزة وفحوصات قسم الأشعة
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  التحكم في توفر فحوصات الأشعة العادية، الموجات الصوتية والسونار، وإيقاف أي فحص يخضع جهازه للصيانة الدورية
                </p>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-900 border border-indigo-200 text-xs font-bold">
                إجمالي فحوصات الأشعة: {services.length}
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
                        {svc.category || 'قسم الأشعة'}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-600 mt-2">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">السعر الخيري:</span>
                        <span className="font-extrabold text-emerald-700">{svc.price} ج.م</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">مدة استلام التقرير:</span>
                        <span>{svc.estimated_duration || 'خلال ساعتين'}</span>
                      </div>
                      {svc.preparation && (
                        <div className="bg-slate-50 p-2 rounded-lg text-[11px] text-slate-600 mt-1">
                          <strong>تعليمات التحضير:</strong> {svc.preparation}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500">جاهزية الفحص:</span>
                    <button
                      type="button"
                      onClick={() => handleToggleService(svc)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        svc.is_active
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : 'bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-300'
                      }`}
                    >
                      {svc.is_active ? 'الجهاز جاهز ومتاح' : 'صيانة الجهاز (موقوف)'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Modal 1: Radiology Report Entry */}
      {activeOrderForReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Scan className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">
                    كتابة واعتماد تقرير الفحص الإشعاعي
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    المريض: {activeOrderForReport.patient_name} ({activeOrderForReport.order_number})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveOrderForReport(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveReport} className="space-y-3.5">
              <div className="bg-indigo-50/70 p-3 rounded-xl border border-indigo-200 text-xs">
                <span className="font-bold text-indigo-900 block mb-0.5">الفحص المطلوب:</span>
                <span className="text-indigo-950 font-semibold">{activeOrderForReport.test_names}</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الجهاز والتقنية المستخدمة في الفحص
                </label>
                <select
                  value={machineTypeInput}
                  onChange={e => setMachineTypeInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-600 bg-white"
                >
                  <option value="جهاز الأشعة السينية الرقمية (Digital X-Ray)">جهاز الأشعة السينية الرقمية (Digital X-Ray)</option>
                  <option value="جهاز السونار والموجات فوق الصوتية (Ultrasound)">جهاز السونار والموجات فوق الصوتية (Ultrasound)</option>
                  <option value="جهاز إيكو دوبلر الملون للقلب (Color Doppler Echo)">جهاز إيكو دوبلر الملون للقلب (Color Doppler Echo)</option>
                  <option value="جهاز الموجات الصوتية 4D رباعي الأبعاد (4D Ultrasound)">جهاز الموجات الصوتية 4D رباعي الأبعاد (4D Ultrasound)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  تفاصيل وملاحظات التقرير الإشعاعي (Radiological Findings) <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={findingsInput}
                  onChange={e => setFindingsInput(e.target.value)}
                  placeholder="مثال:
- Lung fields are clear with no focal consolidation or pleural effusion.
- Cardiothoracic ratio is within normal limits.
- Bony thorax shows intact rib cage without fractures."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-600 font-mono text-slate-900"
                ></textarea>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الخلاصة والتشخيص النهائي (Impression / Conclusion) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={conclusionInput}
                  onChange={e => setConclusionInput(e.target.value)}
                  placeholder="مثال: Normal Chest Radiograph (فحص أشعة الصدر سليم تماماً وضمن المعدل الطبيعي)"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-600 text-slate-900 font-bold"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveOrderForReport(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSavingReport}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  {isSavingReport ? 'جاري الحفظ...' : 'اعتماد وحفظ تقرير الأشعة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Direct Walk-in Scan Ticket */}
      {isAddWalkinOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">حجز فحص أشعة مباشر (شباك الأشعة)</h3>
                  <p className="text-[11px] text-slate-500">حجز وإدراج مباشر في طابور التصوير من دليل الأشعة الشامل</p>
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
                    placeholder="مثال: مروة سامي عبد المنعم"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-600"
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
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-600 font-mono"
                  />
                </div>
              </div>

              {/* Full Scan Catalog Selector */}
              <div>
                <label className="block text-xs font-extrabold text-slate-800 mb-1">
                  اختر فحوصات الأشعة والتصوير المطلوبة من القائمة الشاملة <span className="text-rose-500">*</span>
                </label>
                <DiagnosticServicePicker
                  department="radiology"
                  selectedServiceIds={walkinSelectedServiceIds}
                  onToggleService={handleToggleWalkinService}
                  customTests={walkinCustomScans}
                  onChangeCustomTests={setWalkinCustomScans}
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
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-600 font-mono font-bold text-emerald-800"
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
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  إدراج في طابور الأشعة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2.5: Edit Scans for an Existing Order in Queue */}
      {orderForEditScans && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    تعديل وإضافة فحوصات للمريض ({orderForEditScans.patient_name})
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    رقم الطلب: {orderForEditScans.order_number} • إضافة أشعة أو سونار إضافي بطلب الطبيب أو المريض
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOrderForEditScans(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedScans} className="space-y-3.5">
              <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200 text-xs">
                <span className="text-slate-600 block mb-1">الفحوصات الحالية المسجلة بالطلب:</span>
                <strong className="text-indigo-950 text-xs">{orderForEditScans.test_names}</strong>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-800 mb-1">
                  اختر فحوصات إضافية أو حدّث القائمة من الدليل الشامل
                </label>
                <DiagnosticServicePicker
                  department="radiology"
                  selectedServiceIds={editSelectedServiceIds}
                  onToggleService={handleToggleEditService}
                  customTests={editCustomScans}
                  onChangeCustomTests={setEditCustomScans}
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
                  onClick={() => setOrderForEditScans(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors cursor-pointer"
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
