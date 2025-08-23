import { create } from 'zustand';
import { supabase } from '../services/supabaseClient';
import type { Session } from '@supabase/supabase-js';
import type { Permission, UserProfile } from '../types'; 

interface AuthState {
  session: Session | null;
  userProfile: UserProfile | null;
  permissions: Permission[];
  isLoading: boolean;
  initListener: () => () => void;
  logout: () => Promise<void>;
  hasEditPermission: (moduleCode: string) => boolean;
}

// Hàm trợ giúp để lấy dữ liệu session
const fetchUserSessionData = async (session: Session | null) => {
  if (!session) {
    return { session: null, userProfile: null, permissions: [], isLoading: false };
  }
  try {
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .single();
    if (profileError) throw profileError;

    // *** BƯỚC KIỂM TRA BẢO MẬT QUAN TRỌNG ***
    // Nếu tài khoản bị vô hiệu hóa, tự động đăng xuất và trả về trạng thái rỗng.
    if (userProfile?.status === 'disabled') {
        console.warn(`[Auth] Access denied for disabled user: ${userProfile.email}`);
        await supabase.auth.signOut();
        return { session: null, userProfile: null, permissions: [], isLoading: false };
    }

    let userPermissions: Permission[] = [];
    if (userProfile?.role === 'staff') {
      const { data: permissionsData, error: permissionsError } = await supabase
        .from('permissions')
        .select('*, modules(code)')
        .eq('user_id', session.user.id);
      if (permissionsError) throw permissionsError;
      userPermissions = (permissionsData || []).map((p: any) => ({
        moduleCode: p.modules.code,
        canView: p.can_view,
        canEdit: p.can_edit,
      }));
    }
    return { session, userProfile, permissions: userPermissions, isLoading: false };
  } catch (error) {
    console.error("Auth Store Error:", error);
    await supabase.auth.signOut();
    return { session: null, userProfile: null, permissions: [], isLoading: false };
  }
};

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  userProfile: null,
  permissions: [],
  isLoading: true,

  initListener: () => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const sessionData = await fetchUserSessionData(session);
      set(sessionData);
    });
    return () => {
      subscription.unsubscribe();
    };
  },

  logout: async () => {
    await supabase.auth.signOut();
  },

  hasEditPermission: (moduleCode: string) => {
    const { userProfile, permissions } = get();
    if (userProfile?.role === 'admin') return true;
    if (userProfile?.role === 'staff') {
      return permissions.some(p => p.moduleCode === moduleCode && p.canEdit);
    }
    return false;
  }
}));
