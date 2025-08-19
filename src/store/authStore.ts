import { create } from 'zustand';
import { supabase } from '../services/supabaseClient';
import type{ Session } from '@supabase/supabase-js';
import type { Permission, UserProfile } from '../types'; 

interface AuthState {
  session: Session | null;
  userProfile: UserProfile | null;
  permissions: Permission[];
  isLoading: boolean;
  checkSession: () => Promise<void>;
  logout: () => Promise<void>;
  // Bổ sung hàm còn thiếu
  hasEditPermission: (moduleCode: string) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  userProfile: null,
  permissions: [],
  isLoading: true,

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
        .single();
      
      if (profileError) throw profileError;

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
      set({ session: null, userProfile: null, permissions: [], isLoading: false });
    }
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({ session: null, userProfile: null, permissions: [], isLoading: false });
  },

  // BỔ SUNG HÀM CÒN THIẾU VÀO ĐÂY
  hasEditPermission: (moduleCode: string) => {
    const { userProfile, permissions } = get();
    // Admin luôn có quyền sửa
    if (userProfile?.role === 'admin') {
      return true;
    }
    // Staff cần có quyền canEdit
    if (userProfile?.role === 'staff') {
      return permissions.some(p => p.moduleCode === moduleCode && p.canEdit);
    }
    // Các trường hợp khác không có quyền
    return false;
  }
}));
