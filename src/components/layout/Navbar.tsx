import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, LogIn, Database, Stethoscope, LogOut } from 'lucide-react';

interface NavbarProps {
  currentView: 'public' | 'admin';
  setCurrentView: (view: 'public' | 'admin') => void;
  publicSection: string;
  setPublicSection: (sec: string) => void;
  onOpenLogin: () => void;
  onOpenSupabaseConfig: () => void;
  isDbConnected: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  setCurrentView,
  publicSection,
  setPublicSection,
  onOpenLogin,
  onOpenSupabaseConfig,
  isDbConnected,
}) => {
  const { isAuthenticated, currentUser, logout, isDoctor, isAdmin } = useAuth();

  const navItems = [
    { id: 'attendance', label: 'حضور الأطباء' },
    { id: 'specialties', label: 'دليل العيادات' },
    { id: 'diagnostics', label: 'المعمل والأشعة' },
    { id: 'contact', label: 'العنوان والتواصل' },
  ];

  const handleNavClick = (id: string) => {
    setCurrentView('public');
    setPublicSection(id);
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const getPortalButtonLabel = () => {
    if (currentView === 'admin') {
      return { desktop: 'معاينة الموقع العام', mobile: 'الموقع' };
    }
    if (isDoctor) {
      const docName = currentUser?.doctor_name || currentUser?.full_name || 'الطبيب';
      return {
        desktop: `بوابة عيادتي (${docName.split(' ')[0]} ${docName.split(' ')[1] || ''})`,
        mobile: 'عيادتي',
      };
    }
    if (isAdmin) {
      return { desktop: 'لوحة إدارة المستشفى', mobile: 'الإدارة' };
    }
    return { desktop: 'لوحة الاستقبال والعيادات', mobile: 'الاستقبال' };
  };

  const portalLabel = getPortalButtonLabel();

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      {/* Top Banner indicating Charity Project & DB Status */}
      <div className="bg-slate-900 text-slate-300 text-xs py-1.5 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2 truncate">
            <span className="font-bold text-teal-400 shrink-0">مستشفى خيري</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="truncate">لجنة زكاة ميت علي</span>
            <span aria-hidden="true" className="hidden sm:inline text-slate-600">·</span>
            <span className="hidden sm:inline text-slate-400">خدمة صحية غير ربحية</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onOpenSupabaseConfig}
              className="flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="إعدادات وقاعدة بيانات Supabase"
            >
              <Database className="w-3.5 h-3.5 text-teal-400" />
              <span className="hidden sm:inline">
                {isDbConnected ? 'Supabase متصل' : 'قاعدة البيانات (تهيئة/SQL)'}
              </span>
              <span className="sm:hidden font-mono text-[10px]">
                {isDbConnected ? 'DB متصل' : 'تهيئة DB'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Streamlined Top Bar (Zero Hamburger - Direct Action Everywhere) */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 h-16">
          {/* Zone 1: Brand wordmark & Logo */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-teal-700 text-white flex items-center justify-center font-bold text-lg shadow-2xs">
              <Stethoscope className="w-5 h-5 text-teal-100" />
            </div>
            <button
              onClick={() => {
                setCurrentView('public');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="text-sm sm:text-base md:text-lg font-extrabold tracking-tight text-slate-900 hover:text-teal-800 transition-colors whitespace-nowrap cursor-pointer text-right"
            >
              مستشفى لجنة الزكاة بميت علي
            </button>
          </div>

          {/* Zone 2: Navigation links for desktop screens */}
          <nav className="hidden lg:flex items-center gap-6 text-xs sm:text-sm font-semibold text-slate-600">
            {navItems.map(item => {
              const isActive = currentView === 'public' && publicSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`whitespace-nowrap transition-colors cursor-pointer py-1.5 ${
                    isActive
                      ? 'text-teal-800 font-bold border-b-2 border-teal-700'
                      : 'hover:text-slate-900'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Direct Staff Portal Action (Visible on both Mobile & Desktop) */}
          <div className="flex items-center gap-2 shrink-0">
            {isAuthenticated ? (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  onClick={() => setCurrentView(currentView === 'admin' ? 'public' : 'admin')}
                  className={`px-3 sm:px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 shadow-2xs ${
                    currentView === 'admin'
                      ? 'bg-slate-100 text-slate-800 border border-slate-300 hover:bg-slate-200'
                      : isDoctor
                      ? 'bg-blue-700 text-white hover:bg-blue-800'
                      : isAdmin
                      ? 'bg-purple-800 text-white hover:bg-purple-900'
                      : 'bg-teal-700 text-white hover:bg-teal-800'
                  }`}
                >
                  {isDoctor ? (
                    <Stethoscope className="w-3.5 h-3.5 text-blue-200 shrink-0" />
                  ) : (
                    <ShieldCheck className="w-3.5 h-3.5 text-teal-300 shrink-0" />
                  )}
                  <span className="hidden sm:inline">
                    {portalLabel.desktop}
                  </span>
                  <span className="sm:hidden">
                    {portalLabel.mobile}
                  </span>
                </button>

                <button
                  onClick={logout}
                  className="p-2 sm:px-2.5 sm:py-2 text-xs text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  title="تسجيل الخروج"
                >
                  <LogOut className="w-3.5 h-3.5 sm:hidden" />
                  <span className="hidden sm:inline">خروج</span>
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenLogin}
                className="px-3 sm:px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <LogIn className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                <span className="hidden sm:inline">دخول الموظفين</span>
                <span className="sm:hidden">دخول الموظفين</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
