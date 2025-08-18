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

  // SỬA LỖI Ở ĐÂY: Đảm bảo logout xóa sạch state ngay lập tức
  logout: async () => {
    await supabase.auth.signOut();
    // Reset state về trạng thái ban đầu một cách tường minh
    set({ session: null, userProfile: null, permissions: [], isLoading: false });
  },
}));
