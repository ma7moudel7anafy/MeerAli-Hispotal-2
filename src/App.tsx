import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import {
  Specialty,
  Doctor,
  DoctorSchedule,
  PublicDoctorAttendance,
  DoctorDailyAttendance,
  DiagnosticService,
  AttendanceStatus,
} from './types';
import { dbService } from './lib/databaseService';
import { getStoredSupabaseConfig } from './lib/supabaseClient';
import { getTodayDateString } from './lib/mockData';

// Layout
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { FloatingContactActions } from './components/layout/FloatingContactActions';

// Public Portal
import { HeroSection } from './components/public/HeroSection';
import { AttendanceBoard } from './components/public/AttendanceBoard';
import { SpecialtiesList } from './components/public/SpecialtiesList';
import { DiagnosticsList } from './components/public/DiagnosticsList';
import { ContactSection } from './components/public/ContactSection';

// Admin / Dashboard
import { DashboardLayout } from './components/admin/DashboardLayout';
import { LabTechnicianPortal } from './components/technician/LabTechnicianPortal';
import { RadiologyTechnicianPortal } from './components/technician/RadiologyTechnicianPortal';
import { StaffLoginModal } from './components/admin/StaffLoginModal';
import { SupabaseConfigModal } from './components/admin/SupabaseConfigModal';

function AppContent() {
  const { isAuthenticated, currentUser, isLabTech, isRadiologyTech } = useAuth();

  // Navigation state
  const [currentView, setCurrentView] = useState<'public' | 'admin'>('public');
  const [publicSection, setPublicSection] = useState<string>('home');

  // Modals state
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isSupabaseConfigOpen, setIsSupabaseConfigOpen] = useState(false);
  const [isDbConnected, setIsDbConnected] = useState(false);

  // Data states
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [schedules, setSchedules] = useState<DoctorSchedule[]>([]);
  const [publicAttendance, setPublicAttendance] = useState<PublicDoctorAttendance[]>([]);
  const [internalAttendance, setInternalAttendance] = useState<DoctorDailyAttendance[]>([]);
  const [diagnosticServices, setDiagnosticServices] = useState<DiagnosticService[]>([]);
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(false);

  const checkConnectionStatus = () => {
    const cfg = getStoredSupabaseConfig();
    setIsDbConnected(!!cfg.url && !!cfg.anonKey);
  };

  const loadAllData = async (silent: boolean = false) => {
    if (!silent) setIsLoadingAttendance(true);
    try {
      const [specs, docs, schs, diags, pubAtt, intAtt] = await Promise.all([
        dbService.getSpecialties(),
        dbService.getDoctors(),
        dbService.getDoctorSchedules(),
        dbService.getDiagnosticServices(),
        dbService.getPublicDoctorAttendance(selectedDate),
        dbService.getInternalDoctorAttendance(selectedDate),
      ]);

      setSpecialties(specs);
      setDoctors(docs);
      setSchedules(schs);
      setDiagnosticServices(diags);
      setPublicAttendance(pubAtt);
      setInternalAttendance(intAtt);
    } catch (e) {
      console.error('Failed to load initial data:', e);
    } finally {
      if (!silent) setIsLoadingAttendance(false);
    }
  };

  useEffect(() => {
    checkConnectionStatus();
    loadAllData();

    // 1. Central Multi-Device SSE Real-time Listener
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource('/api/events');
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'hospital-attendance-updated') {
            loadAllData(true);
            window.dispatchEvent(
              new CustomEvent('hospital-attendance-updated', { detail: data.payload })
            );
          } else if (data.type === 'hospital-visit-updated') {
            loadAllData(true);
            window.dispatchEvent(
              new CustomEvent('hospital-visit-updated', { detail: data.payload })
            );
          } else if (data.type === 'hospital-patient-updated' || data.type === 'hospital-refresh-all') {
            loadAllData(true);
          }
        } catch {
          // heartbeat or non-json message
        }
      };
      eventSource.onerror = () => {
        // SSE reconnects automatically
      };
    } catch (e) {
      console.debug('SSE initialization note:', e);
    }

    // 2. High-reliability Polling Heartbeat (every 3.5s) across all devices
    const pollInterval = setInterval(() => {
      loadAllData(true);
    }, 3500);

    // 3. Local In-Tab / In-Window Custom Event Listener
    const handleAttendanceUpdated = () => {
      loadAllData(true);
    };

    // 4. Cross-tab storage sync
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'mit_ali_db_attendance' || e.key === 'mit_ali_db_visits') {
        loadAllData(true);
      }
    };

    window.addEventListener('hospital-attendance-updated', handleAttendanceUpdated);
    window.addEventListener('storage', handleStorage);

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      clearInterval(pollInterval);
      window.removeEventListener('hospital-attendance-updated', handleAttendanceUpdated);
      window.removeEventListener('storage', handleStorage);
    };
  }, [selectedDate]);

  const handleUpdateAttendance = async (
    doctorId: string,
    status: AttendanceStatus,
    delayTime?: string | null,
    internalNotes?: string | null
  ) => {
    await dbService.updateDoctorAttendance(
      doctorId,
      selectedDate,
      status,
      delayTime,
      internalNotes,
      currentUser || undefined
    );

    // Refresh attendance lists immediately
    const [pubAtt, intAtt] = await Promise.all([
      dbService.getPublicDoctorAttendance(selectedDate),
      dbService.getInternalDoctorAttendance(selectedDate),
    ]);
    setPublicAttendance(pubAtt);
    setInternalAttendance(intAtt);
  };

  const todayPresentCount = publicAttendance.filter(a => a.status === 'present').length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans" dir="rtl">
      {/* Top Navbar */}
      <Navbar
        currentView={currentView}
        setCurrentView={setCurrentView}
        publicSection={publicSection}
        setPublicSection={setPublicSection}
        onOpenLogin={() => setIsLoginModalOpen(true)}
        onOpenSupabaseConfig={() => setIsSupabaseConfigOpen(true)}
        isDbConnected={isDbConnected}
      />

      {/* Main View: Either Public Portal or Internal Dashboard */}
      {currentView === 'public' ? (
        <main className="flex-1">
          <HeroSection
            onNavigate={(sec) => {
              setPublicSection(sec);
              const el = document.getElementById(sec);
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            todayAttendanceCount={{
              present: todayPresentCount,
              total: publicAttendance.length,
            }}
          />

          <AttendanceBoard
            attendanceList={publicAttendance}
            specialties={specialties}
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            onRefresh={loadAllData}
            isLoading={isLoadingAttendance}
          />

          <SpecialtiesList
            specialties={specialties}
            doctors={doctors}
            schedules={schedules}
          />

          <DiagnosticsList services={diagnosticServices} />

          <ContactSection />

          <Footer />

          {/* Floating Call & WhatsApp Bar */}
          <FloatingContactActions />
        </main>
      ) : isLabTech ? (
        <LabTechnicianPortal onBackToPublic={() => setCurrentView('public')} />
      ) : isRadiologyTech ? (
        <RadiologyTechnicianPortal onBackToPublic={() => setCurrentView('public')} />
      ) : (
        <DashboardLayout
          onBackToPublic={() => setCurrentView('public')}
          onOpenSupabaseConfig={() => setIsSupabaseConfigOpen(true)}
          attendanceList={internalAttendance}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          onUpdateAttendance={handleUpdateAttendance}
          isLoadingAttendance={isLoadingAttendance}
        />
      )}

      {/* Modals */}
      <StaffLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSuccess={() => {
          setCurrentView('admin');
        }}
      />

      <SupabaseConfigModal
        isOpen={isSupabaseConfigOpen}
        onClose={() => setIsSupabaseConfigOpen(false)}
        onConfigChanged={() => {
          checkConnectionStatus();
          loadAllData();
        }}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
