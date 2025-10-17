import { create } from 'zustand';
import { supabase } from '../services/supabaseClient';
import type { Session } from '@supabase/supabase-js';
import type { Permission, UserProfile } from '../types'; 

interface AuthState {
  session: Session | null;
  userProfile: UserProfile | null;
  permissions: Permission[];
  isLoading: boolean;
  checkSession: () => Promise<void>; // Quay lại với checkSession
  logout: () => Promise<void>;
  hasEditPermission: (moduleCode: string) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  userProfile: null,
  permissions: [],
  isLoading: true, // Luôn bắt đầu với trạng thái đang tải

  checkSession: async () => {
    set({ isLoading: true });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No session found');
      }

      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();
      
      if (profileError) throw profileError;

      // Kiểm tra trạng thái vô hiệu hóa
      if (userProfile?.status === 'disabled') {
        await supabase.auth.signOut();
        throw new Error('Tài khoản đã bị vô hiệu hóa.');
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

      set({ session, userProfile, permissions: userPermissions, isLoading: false });
    } catch (error) {
      // Nếu có lỗi (ví dụ: chưa đăng nhập), reset state
      set({ session: null, userProfile: null, permissions: [], isLoading: false });
    }
  },

  logout: async () => {
    await supabase.auth.signOut();
    // Reset state một cách tường minh
    set({ session: null, userProfile: null, permissions: [], isLoading: false });
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
