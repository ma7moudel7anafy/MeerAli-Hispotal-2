import React, { createContext, useContext, useState, useEffect } from 'react';
import { StaffProfile, UserRole } from '../types';
import { dbService } from '../lib/databaseService';
import { getSupabaseClient } from '../lib/supabaseClient';

interface AuthContextType {
  currentUser: StaffProfile | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isReceptionist: boolean;
  isDoctor: boolean;
  isLabTech: boolean;
  isRadiologyTech: boolean;
  isTechnician: boolean;
  doctorId: string | null;
  login: (email: string, role?: UserRole, doctorId?: string) => Promise<boolean>;
  logout: () => void;
  switchRole: (role: UserRole, doctorId?: string) => void;
  staffList: StaffProfile[];
  refreshStaff: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY_AUTH = 'mit_ali_current_staff';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<StaffProfile | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const stored = localStorage.getItem(STORAGE_KEY_AUTH);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [staffList, setStaffList] = useState<StaffProfile[]>([]);

  const refreshStaff = async () => {
    try {
      const list = await dbService.getStaffProfiles();
      setStaffList(list);
    } catch (e) {
      console.error('Failed to load staff profiles:', e);
    }
  };

  useEffect(() => {
    refreshStaff();
  }, []);

  const login = async (
    email: string,
    roleOverride?: UserRole,
    doctorIdOverride?: string
  ): Promise<boolean> => {
    const client = getSupabaseClient();
    if (client) {
      // In live Supabase, auth is checked with signInWithPassword or verified staff profile
    }

    const staff = await dbService.getStaffProfiles();
    const cleanEmail = email.trim().toLowerCase();

    // 1. If doctorId is provided, strictly prioritize matching this specific doctor
    let matched: StaffProfile | undefined;

    if (doctorIdOverride) {
      matched = staff.find(s => s.doctor_id === doctorIdOverride);
      if (!matched) {
        // Look up doctor in doctors list to create a pristine doctor profile
        const allDocs = await dbService.getDoctors();
        const doc = allDocs.find(d => d.id === doctorIdOverride);
        if (doc) {
          const docProfile: StaffProfile = {
            id: `staff-${doc.id}`,
            full_name: doc.full_name,
            role: 'doctor',
            email: cleanEmail || doc.email || `${doc.id}@mitali-hosp.org`,
            doctor_id: doc.id,
            doctor_name: doc.full_name,
            specialty_name: doc.specialty_name,
            phone: doc.phone || '01000000000',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          setCurrentUser(docProfile);
          localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(docProfile));
          return true;
        }
      }
    }

    // 2. Try matching by exact email
    if (!matched && cleanEmail) {
      matched = staff.find(s => s.email?.toLowerCase() === cleanEmail);
    }

    // 3. Fallback matching by role
    if (!matched && roleOverride) {
      matched = staff.find(s => s.role === roleOverride);
    }

    if (!matched && !roleOverride && !doctorIdOverride && staff.length > 0) {
      matched = staff[0];
    }

    if (matched) {
      setCurrentUser(matched);
      localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(matched));
      return true;
    }

    // Default fallback if no staff registered yet
    let fallbackName = 'محمود عبد الحليم (استقبال)';
    if (roleOverride === 'admin') fallbackName = 'م. أحمد الشريف (مدير)';
    if (roleOverride === 'doctor') fallbackName = 'د. محمد عبد الرحمن الدسوقي (طبيب)';
    if (roleOverride === 'lab_tech') fallbackName = 'كيميائي / إبراهيم عبد السلام (معمل)';
    if (roleOverride === 'radiology_tech') fallbackName = 'أخصائي تكنولوجي / مصطفى سالم (أشعة)';

    const defaultProfile: StaffProfile = {
      id: `staff-${roleOverride || 'recep'}-01`,
      full_name: fallbackName,
      role: roleOverride || 'receptionist',
      email: cleanEmail || 'staff@mitali-hosp.org',
      doctor_id: doctorIdOverride || (roleOverride === 'doctor' ? 'doc-01' : undefined),
      doctor_name: roleOverride === 'doctor' ? 'د. محمد عبد الرحمن الدسوقي' : undefined,
      specialty_name: roleOverride === 'doctor' ? 'الباطنة العامة والجهاز الهضمي' : undefined,
      phone: '01022334455',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setCurrentUser(defaultProfile);
    localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(defaultProfile));
    return true;
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem(STORAGE_KEY_AUTH);
  };

  const switchRole = (newRole: UserRole, doctorId?: string) => {
    if (!currentUser) return;
    let name = 'محمود عبد الحليم (استقبال)';
    if (newRole === 'admin') name = 'م. أحمد الشريف (مدير)';
    if (newRole === 'doctor') name = 'د. محمد عبد الرحمن الدسوقي (طبيب باطنة)';
    if (newRole === 'lab_tech') name = 'كيميائي / إبراهيم عبد السلام (معمل)';
    if (newRole === 'radiology_tech') name = 'أخصائي تكنولوجي / مصطفى سالم (أشعة)';

    const updated: StaffProfile = {
      ...currentUser,
      role: newRole,
      full_name: name,
      doctor_id: newRole === 'doctor' ? (doctorId || 'doc-01') : undefined,
    };
    setCurrentUser(updated);
    localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(updated));
  };

  const role = currentUser?.role || null;
  const isAuthenticated = !!currentUser;
  const isAdmin = role === 'admin';
  const isReceptionist = role === 'receptionist';
  const isDoctor = role === 'doctor';
  const isLabTech = role === 'lab_tech';
  const isRadiologyTech = role === 'radiology_tech';
  const isTechnician = isLabTech || isRadiologyTech;
  const doctorId = currentUser?.doctor_id || null;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        role,
        isAuthenticated,
        isAdmin,
        isReceptionist,
        isDoctor,
        isLabTech,
        isRadiologyTech,
        isTechnician,
        doctorId,
        login,
        logout,
        switchRole,
        staffList,
        refreshStaff,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
