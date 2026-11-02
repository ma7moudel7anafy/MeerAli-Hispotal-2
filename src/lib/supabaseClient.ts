import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STORAGE_KEY_URL = 'mit_ali_hosp_supabase_url';
const STORAGE_KEY_ANON = 'mit_ali_hosp_supabase_anon_key';

export function getStoredSupabaseConfig(): { url: string; anonKey: string } {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL as string) || '';
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '';

  const storedUrl = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_URL) : null;
  const storedKey = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_ANON) : null;

  return {
    url: (storedUrl || envUrl || '').trim(),
    anonKey: (storedKey || envKey || '').trim(),
  };
}

export function saveSupabaseConfig(url: string, anonKey: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_URL, url.trim());
    localStorage.setItem(STORAGE_KEY_ANON, anonKey.trim());
  }
}

export function clearSupabaseConfig(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY_URL);
    localStorage.removeItem(STORAGE_KEY_ANON);
  }
}

let cachedClient: SupabaseClient | null = null;
let lastUsedUrl = '';
let lastUsedKey = '';

export function getSupabaseClient(): SupabaseClient | null {
  const { url, anonKey } = getStoredSupabaseConfig();
  
  if (!url || !anonKey) {
    return null;
  }

  // Validate basic URL shape to prevent crashes
  try {
    new URL(url);
  } catch {
    return null;
  }

  if (cachedClient && lastUsedUrl === url && lastUsedKey === anonKey) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    lastUsedUrl = url;
    lastUsedKey = anonKey;
    return cachedClient;
  } catch (err) {
    console.error('Failed to create Supabase client:', err);
    return null;
  }
}

export async function testSupabaseConnection(testUrl?: string, testKey?: string): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> {
  const { url: defaultUrl, anonKey: defaultKey } = getStoredSupabaseConfig();
  const url = testUrl !== undefined ? testUrl.trim() : defaultUrl;
  const key = testKey !== undefined ? testKey.trim() : defaultKey;

  if (!url || !key) {
    return {
      success: false,
      message: 'الرجاء إدخال رابط المشروع (Project URL) والمفتاح العام (anon key).',
    };
  }

  try {
    new URL(url);
  } catch {
    return {
      success: false,
      message: 'صيغة رابط المشروع غير صحيحة، يجب أن يبدأ بـ https://',
    };
  }

  try {
    const client = createClient(url, key, {
      auth: { persistSession: false },
    });

    // Test querying public view or specialties
    const { data, error } = await client
      .from('specialties')
      .select('count')
      .limit(1);

    if (error) {
      if (error.code === '42P01') {
        // Table doesn't exist yet
        return {
          success: true,
          message: 'تم الاتصال بـ Supabase بنجاح! الجداول لم يتم إنشاؤها بعد. يرجى تشغيل كود SQL المرفق لإنشاء الجداول.',
          details: { code: 'TABLES_NOT_FOUND' },
        };
      }
      return {
        success: false,
        message: `خطأ من Supabase: ${error.message} (${error.code || ''})`,
      };
    }

    return {
      success: true,
      message: 'تم الاتصال بقاعدة البيانات بنجاح والتحقق من الجداول!',
      details: { sample: data },
    };
  } catch (err: any) {
    return {
      success: false,
      message: `فشل الاتصال: ${err?.message || 'تعذر الوصول إلى الخادم'}`,
    };
  }
}
