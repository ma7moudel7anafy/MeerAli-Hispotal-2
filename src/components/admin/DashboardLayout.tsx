import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Patient } from '../../types';
import { DailyAttendanceManager } from './DailyAttendanceManager';
import { PatientManager } from './PatientManager';
import { VisitsManager } from './VisitsManager';
import { ReceptionTasksManager, ReceptionSubTab } from './ReceptionTasksManager';
import { DailyRevenueManager } from './DailyRevenueManager';
import { AdminClinicManager } from './AdminClinicManager';
import { AuditLogViewer } from './AuditLogViewer';
import { DevToolsManager } from './DevToolsManager';
import { DoctorClinicPortal } from './DoctorClinicPortal';
import { DoctorPersonalSchedule } from '../doctor/DoctorPersonalSchedule';
import { DoctorPatientsList } from '../doctor/DoctorPatientsList';
import { StaffManager } from './StaffManager';
import { DiagnosticServicesManager } from './DiagnosticServicesManager';
import { LabTechnicianPortal } from '../technician/LabTechnicianPortal';
import { RadiologyTechnicianPortal } from '../technician/RadiologyTechnicianPortal';
import { VisitRegistrationModal } from './VisitRegistrationModal';
import { DiagnosticsList } from '../public/DiagnosticsList';
import { DiagnosticBookingModal } from './DiagnosticBookingModal';
import { getAllDiagnosticServices } from '../../lib/databaseService';
import {
  CalendarCheck,
  Users,
  ClipboardList,
  Stethoscope,
  ShieldAlert,
  Database,
  ArrowRight,
  Shield,
  UserCheck,
  CheckCircle,
  MoreHorizontal,
  ChevronDown,
  LogOut,
  X,
  Settings,
  Terminal,
  UserPlus,
  Building2,
  Coins,
  FlaskConical,
  Scan,
} from 'lucide-react';

interface DashboardLayoutProps {
  onBackToPublic: () => void;
  onOpenSupabaseConfig: () => void;
  attendanceList: any[];
  selectedDate: string;
  onDateChange: (d: string) => void;
  onUpdateAttendance: any;
  isLoadingAttendance: boolean;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  onBackToPublic,
  onOpenSupabaseConfig,
  attendanceList,
  selectedDate,
  onDateChange,
  onUpdateAttendance,
  isLoadingAttendance,
}) => {
  const { currentUser, role, isAdmin, isReceptionist, isDoctor, isLabTech, isRadiologyTech, isTechnician, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<
    | 'visits'
    | 'patients'
    | 'attendance'
    | 'diagnostics_reception'
    | 'reception_tasks'
    | 'daily_revenue'
    | 'doctor_clinic'
    | 'doctor_my_attendance'
    | 'doctor_patients'
    | 'clinics'
    | 'diagnostics'
    | 'staff_accounts'
    | 'audit'
    | 'dev_tools'
  >(() => (isDoctor ? 'doctor_clinic' : isAdmin ? 'daily_revenue' : 'visits'));

  // Guard: Restrict role-specific tabs strictly
  useEffect(() => {
    if (isDoctor) {
      if (!['doctor_clinic', 'doctor_my_attendance', 'doctor_patients'].includes(activeTab)) {
        setActiveTab('doctor_clinic');
      }
    } else if (isReceptionist && !isAdmin) {
      if (!['visits', 'patients', 'attendance', 'diagnostics_reception', 'daily_revenue', 'reception_tasks'].includes(activeTab)) {
        setActiveTab('visits');
      }
    } else if (isAdmin) {
      if (['doctor_clinic', 'doctor_my_attendance', 'doctor_patients'].includes(activeTab)) {
        setActiveTab('daily_revenue');
      }
    }
  }, [isAdmin, isDoctor, isReceptionist, activeTab]);

  // Visit Registration Modal state triggered from PatientManager
  const [registerVisitPatient, setRegisterVisitPatient] = useState<Patient | null>(null);
  const [isVisitModalOpen, setIsVisitModalOpen] = useState(false);
  const [mobileAdminMenuOpen, setMobileAdminMenuOpen] = useState(false);

  // Diagnostic booking modal state for reception
  const [isDiagBookingOpen, setIsDiagBookingOpen] = useState(false);
  const [diagBookingDept, setDiagBookingDept] = useState<'lab' | 'radiology'>('lab');

  const handleOpenVisitModal = (patient: Patient) => {
    setRegisterVisitPatient(patient);
    setIsVisitModalOpen(true);
  };

  // Dedicated Doctor Tabs - STRICTLY personal to this doctor
  const doctorTabs = [
    {
      id: 'doctor_clinic',
      label: 'طابور كشف عيادتي (المرضى الحاليين)',
      shortLabel: 'طابور الكشف',
      icon: Stethoscope,
    },
    {
      id: 'doctor_my_attendance',
      label: 'تسجيل حضوري ومواعيد عيادتي',
      shortLabel: 'حضوري بالعيادة',
      icon: UserCheck,
    },
    {
      id: 'doctor_patients',
      label: 'سجل مرضى وكشوفات عيادتي',
      shortLabel: 'سجل مرضاي',
      icon: Users,
    },
  ];

  // Primary Executive Admin Tabs (أقسام الإدارة العليا والرقابة)
  const executiveAdminTabs = [
    {
      id: 'daily_revenue',
      label: 'إيرادات الخزينة وتقفيل الوردية',
      shortLabel: 'إيرادات الخزينة',
      icon: Coins,
    },
    {
      id: 'clinics',
      label: 'إدارة العيادات والأطباء',
      shortLabel: 'العيادات والأطباء',
      icon: Building2,
    },
    {
      id: 'diagnostics',
      label: 'إدارة التحاليل والأشعة',
      shortLabel: 'التحاليل والأشعة',
      icon: FlaskConical,
    },
    {
      id: 'staff_accounts',
      label: 'إدارة الحسابات وطاقم العمل',
      shortLabel: 'حسابات الموظفين',
      icon: UserPlus,
    },
    {
      id: 'audit',
      label: 'سجل التدقيق الأمني والرقابة',
      shortLabel: 'سجل التدقيق',
      icon: Shield,
    },
    {
      id: 'dev_tools',
      label: 'الأدوات البرمجية (للمطور)',
      shortLabel: 'أدوات المطور',
      icon: Terminal,
      adminOnly: true,
    },
  ];

  // Standalone Reception Pages - صفحات مهام شباك الاستقبال المستقلة بالكامل
  const receptionStaffTabs = [
    {
      id: 'visits',
      label: 'كشوفات وزيارات اليوم وحجز الأدوار',
      shortLabel: 'زيارات اليوم',
      icon: ClipboardList,
    },
    {
      id: 'patients',
      label: 'سجل وملفات المرضى وفتح ملف جديد',
      shortLabel: 'ملفات المرضى',
      icon: Users,
    },
    {
      id: 'attendance',
      label: 'حضور عيادات الأطباء اليوم',
      shortLabel: 'حضور الأطباء',
      icon: CalendarCheck,
    },
    {
      id: 'diagnostics_reception',
      label: 'دليل وحجز التحاليل والأشعة',
      shortLabel: 'التحاليل والأشعة',
      icon: FlaskConical,
    },
    {
      id: 'daily_revenue',
      label: 'إيرادات الخزينة وتقفيل الوردية',
      shortLabel: 'إيرادات الخزينة',
      icon: Coins,
    },
  ];

  // Reception sub-section for Admin (Includes individual pages + optional combined hub)
  const adminReceptionSectionTabs = [
    ...receptionStaffTabs,
    {
      id: 'reception_tasks',
      label: 'مهام الاستقبال المجمعة (اللوحة الموحدة)',
      shortLabel: 'لوحة موحدة',
      icon: ClipboardList,
    },
  ];

  // All tabs visible for mobile horizontal scroll
  const allVisibleTabs = isDoctor
    ? doctorTabs
    : isAdmin
    ? [...executiveAdminTabs, ...adminReceptionSectionTabs]
    : receptionStaffTabs;

  // If logged in as Lab or Radiology Technician, render their dedicated portal
  if (isLabTech) {
    return <LabTechnicianPortal onBackToPublic={onBackToPublic} />;
  }
  if (isRadiologyTech) {
    return <RadiologyTechnicianPortal onBackToPublic={onBackToPublic} />;
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row pb-16 md:pb-0">
      {/* =========================================================================
          1. Mobile Header & Segmented Navigation (Visible ONLY on Mobile & Tablet)
         ========================================================================= */}
      <div className="md:hidden bg-slate-900 text-white sticky top-0 z-30 shadow-md">
        {/* Top Mini Bar */}
        <div className="px-3.5 py-2.5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${isAdmin ? 'bg-purple-400 ring-2 ring-purple-400/30' : isDoctor ? 'bg-blue-400 ring-2 ring-blue-400/30' : 'bg-teal-400'}`}></span>
            <div>
              <span className="text-xs font-bold text-white block">
                {isAdmin ? 'لوحة إدارة المستشفى' : isDoctor ? `عيادة ${currentUser?.doctor_name || currentUser?.full_name}` : 'لوحة الاستقبال'}
              </span>
              <span className={`text-[10px] font-medium ${isDoctor ? 'text-blue-300' : 'text-teal-300'}`}>
                {currentUser?.full_name?.split(' ')[0] || 'المستخدم'} ({isAdmin ? 'مدير عام' : isDoctor ? 'طبيب عيادة' : 'موظف استقبال'})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {isAdmin && (
              <button
                onClick={() => setMobileAdminMenuOpen(true)}
                className="px-2 py-1 bg-purple-900/60 hover:bg-purple-800 text-[11px] text-purple-200 font-semibold rounded-lg border border-purple-700/60 flex items-center gap-1 transition-colors cursor-pointer"
                title="أدوات الإدارة والأمان"
              >
                <Settings className="w-3.5 h-3.5 text-purple-300" />
                <span>أدوات المدير</span>
              </button>
            )}

            <button
              onClick={() => {
                logout();
                onBackToPublic();
              }}
              className="p-1.5 bg-slate-800 hover:bg-rose-950/60 text-slate-300 hover:text-rose-300 rounded-lg border border-slate-700 transition-colors cursor-pointer"
              title="تسجيل الخروج والعودة للموقع"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onBackToPublic}
              className="px-2.5 py-1 bg-teal-700 hover:bg-teal-600 text-white text-xs font-bold rounded-lg flex items-center gap-1 cursor-pointer"
            >
              <ArrowRight className="w-3 h-3" />
              <span>الموقع</span>
            </button>
          </div>
        </div>

        {/* Mobile Horizontal Tabs Strip (Swipeable, Direct Tap, No Hidden Dropdown) */}
        <div className="flex items-center gap-1 p-1.5 bg-slate-950/90 overflow-x-auto text-xs no-scrollbar">
          {allVisibleTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const isTabAdminOnly = (tab as any).adminOnly;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-2.5 font-bold rounded-xl transition-all flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer text-xs ${
                  isActive
                    ? isTabAdminOnly
                      ? 'bg-purple-700 text-white shadow-sm'
                      : 'bg-teal-700 text-white shadow-sm'
                    : isTabAdminOnly
                    ? 'text-purple-300/80 hover:text-purple-200 hover:bg-slate-800'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : isTabAdminOnly ? 'text-purple-400' : 'text-slate-400'}`} />
                <span className="text-[11px]">{tab.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile Admin Bottom Sheet Drawer (Cannot be clipped, rendered in fixed overlay) */}
      {mobileAdminMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150">
          {/* Backdrop Click */}
          <div
            className="flex-1"
            onClick={() => setMobileAdminMenuOpen(false)}
          />

          {/* Bottom Sheet Menu */}
          <div
            className="bg-slate-900 border-t border-slate-700 rounded-t-3xl p-5 space-y-4 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-900/60 text-purple-300 flex items-center justify-center border border-purple-700/60">
                  <Settings className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">لوحة تحكم المدير والأمان</h3>
                  <p className="text-[11px] text-slate-400">صلاحيات الإدارة والرقابة الشاملة</p>
                </div>
              </div>

              <button
                onClick={() => setMobileAdminMenuOpen(false)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Admin Navigation Buttons */}
            <div className="space-y-3">
              <div>
                <div className="text-[11px] font-bold text-purple-300 px-1 mb-1.5 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-purple-400" />
                  <span>الإدارة العليا والرقابة:</span>
                </div>
                <div className="space-y-1.5">
                  {executiveAdminTabs.filter(t => t.id !== 'dev_tools').map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setActiveTab(tab.id as any);
                          setMobileAdminMenuOpen(false);
                        }}
                        className={`w-full text-right p-2.5 rounded-xl font-semibold flex items-center justify-between text-xs transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-purple-800 text-white border border-purple-600'
                            : 'bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700/60'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-slate-900 text-purple-300 flex items-center justify-center">
                            <Icon className="w-4 h-4" />
                          </div>
                          <span className="font-bold">{tab.label}</span>
                        </div>
                        {isActive && (
                          <span className="text-[10px] bg-purple-900 px-2 py-0.5 rounded text-purple-200">
                            النشط
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="text-[11px] font-bold text-teal-300 px-1 mb-1.5 flex items-center gap-1.5">
                  <ClipboardList className="w-3.5 h-3.5 text-teal-400" />
                  <span>مهام الاستقبال وشباك التذاكر:</span>
                </div>
                <div className="space-y-1.5">
                  {adminReceptionSectionTabs.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setActiveTab(tab.id as any);
                          setMobileAdminMenuOpen(false);
                        }}
                        className={`w-full text-right p-2.5 rounded-xl font-semibold flex items-center justify-between text-xs transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-teal-700 text-white border border-teal-500'
                            : 'bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700/60'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-slate-900 text-teal-300 flex items-center justify-center">
                            <Icon className="w-4 h-4" />
                          </div>
                          <span className="font-bold">{tab.label}</span>
                        </div>
                        {isActive && (
                          <span className="text-[10px] bg-teal-900 px-2 py-0.5 rounded text-teal-200">
                            النشط
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Technical Configuration */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <div className="text-[11px] font-bold text-purple-400 px-1">بوابة المطور البرمجية:</div>

              <button
                onClick={() => {
                  setActiveTab('dev_tools');
                  setMobileAdminMenuOpen(false);
                }}
                className="w-full text-right p-3 rounded-2xl bg-purple-950/40 hover:bg-purple-900/60 text-purple-200 border border-purple-800/60 font-semibold flex items-center gap-2.5 text-xs transition-colors cursor-pointer"
              >
                <div className="w-7 h-7 rounded-lg bg-purple-900 text-purple-300 flex items-center justify-center">
                  <Terminal className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold">الأدوات البرمجية (للمطور فقط)</div>
                  <div className="text-[10px] text-purple-300/70">تهيئة Supabase و كود SQL وفحص RLS (محمية برقم سري)</div>
                </div>
              </button>
            </div>

            {/* Close Sheet button */}
            <button
              onClick={() => setMobileAdminMenuOpen(false)}
              className="w-full py-2.5 text-center bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              إغلاق القائمة
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          2. Desktop Sidebar (Hidden on Mobile, Visible on md:screens)
         ========================================================================= */}
      <aside className="hidden md:flex w-64 bg-slate-900 text-slate-200 shrink-0 flex-col justify-between border-l border-slate-800">
        <div>
          {/* Brand & User Header */}
          <div className="p-5 border-b border-slate-800">
            <button
              onClick={onBackToPublic}
              className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1 mb-3 cursor-pointer"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>العودة للموقع العام للمرضى</span>
            </button>
            <h1 className="text-sm font-bold text-white">
              {isDoctor ? `عيادة ${currentUser?.doctor_name || currentUser?.full_name}` : 'لوحة إدارة مستشفى ميت علي'}
            </h1>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {isDoctor ? `${currentUser?.specialty_name || 'العيادة التخصصية'} • كشوفات وتشخيصات المرضى` : 'نظام الاستقبال والعيادات المتكامل'}
            </p>
          </div>

          {/* Current Staff Profile */}
          <div className="p-4 bg-slate-950/60 border-b border-slate-800 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">المستخدم الحالي:</span>
              <span className={`px-2 py-0.5 rounded-sm font-bold text-[10px] ${
                isAdmin
                  ? 'bg-purple-900/60 text-purple-300 border border-purple-700/60'
                  : isDoctor
                  ? 'bg-blue-900/60 text-blue-300 border border-blue-700/60'
                  : 'bg-teal-900/60 text-teal-300 border border-teal-700/60'
              }`}>
                {isDoctor ? 'طبيب عيادة' : isAdmin ? 'مدير نظام (Admin)' : 'موظف استقبال'}
              </span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <div className="font-semibold text-white truncate max-w-[130px]">
                {currentUser?.full_name || 'طاقم العمل'}
              </div>
              <button
                onClick={() => {
                  logout();
                  onBackToPublic();
                }}
                className="text-[11px] text-slate-400 hover:text-rose-400 flex items-center gap-1 transition-colors cursor-pointer"
                title="تسجيل الخروج والعودة"
              >
                <LogOut className="w-3 h-3" />
                <span>تسجيل خروج</span>
              </button>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            {/* If Doctor, display doctor navigation tabs */}
            {isDoctor && (
              <>
                <div className="text-[10px] font-bold text-blue-400 px-3 py-1 uppercase tracking-wider">
                  بوابة الطبيب
                </div>
                {doctorTabs.map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer text-right ${
                        isActive
                          ? 'bg-blue-700 text-white shadow-xs'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-blue-200' : 'text-slate-400'}`} />
                        <span>{tab.label}</span>
                      </div>
                    </button>
                  );
                })}
              </>
            )}

            {/* Admin Navigation: Executive Management followed by Reception Tasks Sub-section */}
            {isAdmin && (
              <>
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-purple-400 px-3 py-1 uppercase tracking-wider">
                  <Shield className="w-3.5 h-3.5 text-purple-400" />
                  <span>الإدارة العليا والرقابة</span>
                </div>
                {executiveAdminTabs.map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;

                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer text-right ${
                        isActive
                          ? 'bg-purple-800 text-white shadow-xs'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-purple-300' : 'text-slate-400'}`} />
                        <span>{tab.label}</span>
                      </div>
                    </button>
                  );
                })}

                {/* Sub-section: Reception Tasks as requested by user */}
                <div className="pt-3 mt-3 border-t border-slate-800/80">
                  <div className="flex items-center justify-between px-3 py-1 text-[10px] font-bold text-teal-400 uppercase tracking-wider">
                    <span className="flex items-center gap-1.5">
                      <ClipboardList className="w-3.5 h-3.5 text-teal-400" />
                      <span>شباك ومهام الاستقبال</span>
                    </span>
                    <span className="text-[9px] bg-slate-800 text-teal-300 px-1.5 py-0.5 rounded-sm border border-slate-700">
                      تشغيل الشباك
                    </span>
                  </div>
                  <div className="space-y-1 mt-1">
                    {adminReceptionSectionTabs.map(tab => {
                      const Icon = tab.icon;
                      const isActive = activeTab === tab.id;

                      return (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id as any)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer text-right ${
                            isActive
                              ? 'bg-teal-700 text-white shadow-xs'
                              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <Icon className={`w-4 h-4 ${isActive ? 'text-teal-200' : 'text-slate-400'}`} />
                            <span>{tab.label}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* Receptionist-Only Navigation - صفحات مستقلة وواضحة للموظف */}
            {isReceptionist && !isAdmin && (
              <>
                <div className="text-[10px] font-bold text-slate-400 px-3 py-1 uppercase tracking-wider">
                  القائمة الرئيسية للاستقبال
                </div>
                {receptionStaffTabs.map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;

                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer text-right ${
                        isActive
                          ? 'bg-teal-700 text-white shadow-xs'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-teal-200' : 'text-slate-400'}`} />
                        <span>{tab.label}</span>
                      </div>
                    </button>
                  );
                })}
              </>
            )}
          </nav>
        </div>

        {/* System security status in sidebar footer */}
        {isAdmin && (
          <div className="p-3.5 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <button
              onClick={() => setActiveTab('dev_tools')}
              className="flex items-center gap-1.5 text-purple-300 hover:text-purple-200 cursor-pointer"
            >
              <Terminal className="w-3.5 h-3.5 text-purple-400" />
              <span className="font-semibold">بوابة المطور</span>
            </button>
            <span className="text-[10px] bg-purple-950/80 text-purple-300 px-2 py-0.5 rounded border border-purple-800/50">
              رمز المرور: 2026
            </span>
          </div>
        )}
      </aside>

      {/* =========================================================================
          3. Main Content Viewport (Fluid & Responsive on Mobile & Desktop)
         ========================================================================= */}
      <main className="flex-1 p-3 sm:p-5 lg:p-8 overflow-y-auto">
        {/* Contextual Breadcrumb Header for Desktop */}
        <div className="hidden md:flex mb-6 items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5 font-medium">
            <span>{isDoctor ? 'بوابة الطبيب' : isAdmin ? 'لوحة الإدارة' : 'لوحة الاستقبال'}</span>
            <span>/</span>
            <span className="text-slate-900 font-bold">
              {[...doctorTabs, ...executiveAdminTabs, ...adminReceptionSectionTabs, ...receptionStaffTabs].find(t => t.id === activeTab)?.label}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && <span className="hidden sm:inline">نظام مشفر ومؤمن بـ RLS</span>}
          </div>
        </div>

        {/* Active Tab View */}
        {activeTab === 'doctor_clinic' && isDoctor && <DoctorClinicPortal />}
        {activeTab === 'doctor_my_attendance' && isDoctor && <DoctorPersonalSchedule />}
        {activeTab === 'doctor_patients' && isDoctor && <DoctorPatientsList />}

        {/* Standalone Reception Viewports */}
        {activeTab === 'visits' && !isDoctor && <VisitsManager />}

        {activeTab === 'patients' && !isDoctor && (
          <PatientManager onRegisterVisitForPatient={handleOpenVisitModal} />
        )}

        {activeTab === 'attendance' && !isDoctor && (
          <DailyAttendanceManager
            attendanceList={attendanceList}
            selectedDate={selectedDate}
            onDateChange={onDateChange}
            onUpdateAttendance={onUpdateAttendance}
            isLoadingAttendance={isLoadingAttendance}
          />
        )}

        {activeTab === 'diagnostics_reception' && !isDoctor && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-teal-800 to-cyan-800 text-white p-5 rounded-2xl shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <FlaskConical className="w-5 h-5 text-teal-300" />
                  <span>دليل وحجز التحاليل الطبية وفحوصات الأشعة</span>
                </h2>
                <p className="text-xs text-teal-100 mt-1">
                  شباك حجز خدمات المعمل والأشعة مع إصدار تذاكر وأرقام أدوار مباشرة وإضافتها لطوابير الفنيين والخزينة.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    setDiagBookingDept('lab');
                    setIsDiagBookingOpen(true);
                  }}
                  className="px-3.5 py-2 bg-white text-teal-900 rounded-xl font-bold text-xs hover:bg-teal-50 flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                >
                  <FlaskConical className="w-4 h-4 text-teal-700" />
                  <span>+ حجز دور معمل</span>
                </button>
                <button
                  onClick={() => {
                    setDiagBookingDept('radiology');
                    setIsDiagBookingOpen(true);
                  }}
                  className="px-3.5 py-2 bg-cyan-700 text-white border border-cyan-400/40 rounded-xl font-bold text-xs hover:bg-cyan-600 flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                >
                  <Scan className="w-4 h-4 text-cyan-200" />
                  <span>+ حجز دور أشعة</span>
                </button>
              </div>
            </div>

            <DiagnosticsList
              onBookService={(service) => {
                setDiagBookingDept(service.type === 'radiology' || service.service_type === 'radiology' ? 'radiology' : 'lab');
                setIsDiagBookingOpen(true);
              }}
            />
          </div>
        )}

        {activeTab === 'reception_tasks' && !isDoctor && (
          <ReceptionTasksManager
            attendanceList={attendanceList}
            selectedDate={selectedDate}
            onDateChange={onDateChange}
            onUpdateAttendance={onUpdateAttendance}
            isLoadingAttendance={isLoadingAttendance}
            onRegisterVisitForPatient={handleOpenVisitModal}
          />
        )}

        {activeTab === 'daily_revenue' && !isDoctor && <DailyRevenueManager />}

        {activeTab === 'clinics' && isAdmin && <AdminClinicManager />}

        {activeTab === 'diagnostics' && isAdmin && <DiagnosticServicesManager />}

        {activeTab === 'staff_accounts' && isAdmin && <StaffManager />}

        {activeTab === 'audit' && isAdmin && <AuditLogViewer />}

        {activeTab === 'dev_tools' && isAdmin && (
          <DevToolsManager onConfigChanged={onUpdateAttendance} />
        )}
      </main>

      {/* Visit Registration Modal */}
      <VisitRegistrationModal
        isOpen={isVisitModalOpen}
        onClose={() => setIsVisitModalOpen(false)}
        patient={registerVisitPatient}
        onVisitCreated={() => {
          setActiveTab('visits');
        }}
      />

      {/* Diagnostic Direct Booking Modal for Reception */}
      <DiagnosticBookingModal
        isOpen={isDiagBookingOpen}
        onClose={() => setIsDiagBookingOpen(false)}
        defaultDepartment={diagBookingDept}
      />
    </div>
  );
};
