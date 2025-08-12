
//src/store/authStore.ts
import { create } from 'zustand';
import { supabase } from '../services/supabaseClient';
import type{ Session, User } from '@supabase/supabase-js';
import type { Permission, UserProfile } from '../types'; 

interface AuthState {
  session: Session | null;
  userProfile: UserProfile | null;
  permissions: Permission[];
  isLoading: boolean;
  checkSession: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
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

      // Lấy thông tin role từ bảng public.users
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      if (profileError) throw profileError;

      let userPermissions: Permission[] = [];
      // Nếu là staff, lấy thêm các quyền chi tiết
      if (userProfile?.role === 'staff') {
        const { data: permissionsData, error: permissionsError } = await supabase
          .from('permissions')
          .select('*, modules(code)') // JOIN với bảng modules để lấy code
          .eq('user_id', session.user.id);
        
        if (permissionsError) throw permissionsError;
        userPermissions = permissionsData.map((p: any) => ({
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
    set({ session: null, userProfile: null, permissions: [], isLoading: false });
  }

}));
