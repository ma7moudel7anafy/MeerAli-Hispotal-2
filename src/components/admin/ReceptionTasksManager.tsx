import React, { useState } from 'react';
import { DailyAttendanceManager } from './DailyAttendanceManager';
import { PatientManager } from './PatientManager';
import { VisitsManager } from './VisitsManager';
import { Patient, DiagnosticService } from '../../types';
import { getAllDiagnosticServices } from '../../lib/databaseService';
import { DiagnosticsList } from '../public/DiagnosticsList';
import { DiagnosticBookingModal } from './DiagnosticBookingModal';
import {
  ClipboardList,
  CalendarCheck,
  Users,
  Stethoscope,
  Ticket,
  Clock,
  UserPlus,
  Layers,
  ArrowRight,
  Search,
  FlaskConical,
  Scan,
  Plus,
} from 'lucide-react';

export type ReceptionSubTab = 'attendance' | 'patients' | 'visits' | 'diagnostics';

interface ReceptionTasksManagerProps {
  attendanceList: any[];
  selectedDate: string;
  onDateChange: (d: string) => void;
  onUpdateAttendance: any;
  isLoadingAttendance: boolean;
  onRegisterVisitForPatient: (patient: Patient) => void;
  initialSubTab?: ReceptionSubTab;
}

export const ReceptionTasksManager: React.FC<ReceptionTasksManagerProps> = ({
  attendanceList,
  selectedDate,
  onDateChange,
  onUpdateAttendance,
  isLoadingAttendance,
  onRegisterVisitForPatient,
  initialSubTab = 'attendance',
}) => {
  const [activeSubTab, setActiveSubTab] = useState<ReceptionSubTab>(initialSubTab);
  const [diagnosticServices, setDiagnosticServices] = useState<DiagnosticService[]>(() => {
    try {
      return getAllDiagnosticServices();
    } catch {
      return [];
    }
  });

  // Diagnostic booking modal state
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookingDept, setBookingDept] = useState<'lab' | 'radiology'>('lab');

  // Sub-tabs navigation configuration
  const subTabs = [
    {
      id: 'attendance' as const,
      label: 'حضور عيادات الأطباء اليوم',
      shortLabel: 'حضور الأطباء',
      icon: CalendarCheck,
      description: 'تسجيل وتأكيد حضور واعتذار وتأخير الأطباء',
    },
    {
      id: 'patients' as const,
      label: 'سجل وملفات المرضى',
      shortLabel: 'ملفات المرضى',
      icon: Users,
      description: 'فتح ملف جديد، البحث وتعديل بيانات المرضى',
    },
    {
      id: 'visits' as const,
      label: 'كشوفات وزيارات اليوم',
      shortLabel: 'زيارات اليوم',
      icon: ClipboardList,
      description: 'حجز التذاكر، طابور العيادة، وتحصيل الرسوم',
    },
    {
      id: 'diagnostics' as const,
      label: 'دليل وأسعار التحاليل والأشعة',
      shortLabel: 'التحاليل والأشعة',
      icon: FlaskConical,
      description: 'الاستعلام الفوري عن الأسعار، شروط الصيام والتحضير، ووقت استلام النتائج للمرضى',
    },
  ];

  return (
    <div className="space-y-5">
      {/* Unified Hub Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-teal-50 text-teal-700 rounded-2xl flex items-center justify-center shrink-0 border border-teal-100">
              <ClipboardList className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">مهام شباك الاستقبال الموحدة</h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                  لوحة موحدة
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                إدارة متكاملة لحضور الأطباء، ملفات المرضى، وكشوفات العيادات اليومية في مكان واحد
              </p>
            </div>
          </div>

          {/* Quick Sub-Tab Selector Buttons */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs overflow-x-auto">
            {subTabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveSubTab(tab.id)}
                  className={`px-3.5 py-2 font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-teal-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Informative Sub-header description */}
        <div className="pt-3 text-[11px] text-slate-500 flex items-center justify-between">
          <span>
            القسم النشط حالياً:{' '}
            <strong className="text-slate-800">
              {subTabs.find(t => t.id === activeSubTab)?.label}
            </strong>{' '}
            — {subTabs.find(t => t.id === activeSubTab)?.description}
          </span>
          <div className="hidden sm:flex items-center gap-2 text-teal-700 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>بث مباشر متزامن مع كافة الأجهزة</span>
          </div>
        </div>
      </div>

      {/* Render the Active Unified Task Component */}
      <div className="animate-in fade-in duration-150">
        {activeSubTab === 'attendance' && (
          <DailyAttendanceManager
            attendanceList={attendanceList}
            selectedDate={selectedDate}
            onDateChange={onDateChange}
            onUpdateAttendance={onUpdateAttendance}
            isLoading={isLoadingAttendance}
          />
        )}

        {activeSubTab === 'patients' && (
          <PatientManager onRegisterVisitForPatient={onRegisterVisitForPatient} />
        )}

        {activeSubTab === 'visits' && <VisitsManager />}

        {activeSubTab === 'diagnostics' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  دليل الفحوصات والتحاليل وحجز التذاكر لشباك الاستقبال
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  حجز فوري لتذاكر المعمل والأشعة للمرضى وتحصيل الرسوم وإدراجها بلحظة في شاشة الفني
                </p>
              </div>

              {/* Action Buttons for Reception */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setBookingDept('lab');
                    setIsBookingModalOpen(true);
                  }}
                  className="px-3.5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <FlaskConical className="w-4 h-4" />
                  <span>حجز تذكرة معمل (LAB)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setBookingDept('radiology');
                    setIsBookingModalOpen(true);
                  }}
                  className="px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Scan className="w-4 h-4" />
                  <span>حجز تذكرة أشعة (RAD)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDiagnosticServices(getAllDiagnosticServices())}
                  className="px-3 py-2 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-xl transition-colors cursor-pointer"
                >
                  تحديث الأسعار
                </button>
              </div>
            </div>

            {/* Diagnostics List with 1-click booking per card */}
            <DiagnosticsList
              services={diagnosticServices}
              onBookService={(svc) => {
                setBookingDept(svc.service_type === 'radiology' || svc.type === 'radiology' ? 'radiology' : 'lab');
                setIsBookingModalOpen(true);
              }}
            />
          </div>
        )}
      </div>

      {/* Reception Diagnostic Ticket Booking Modal */}
      <DiagnosticBookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        initialDepartment={bookingDept}
        onOrderCreated={() => {
          setDiagnosticServices(getAllDiagnosticServices());
        }}
      />
    </div>
  );
};
