//src/store/authStore.ts
import { create } from 'zustand';
import { supabase } from '../services/supabaseClient';
import type { Session } from '@supabase/supabase-js';
import type { Permission, UserProfile } from '../types'; 

interface AuthState {
  session: Session | null;
  userProfile: UserProfile | null;
  permissions: Permission[];
  isLoading: boolean;
  isInitialized: boolean; 
  authError: string | null; 
  initListener: () => () => void;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  clearAuthError: () => void; 
  hasEditPermission: (moduleCode: string) => boolean;
}

// Hàm trợ giúp để lấy dữ liệu session - giữ nguyên logic đơn giản
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
      
    if (profileError) {
      // Chỉ log lỗi, không throw để tránh sign out không cần thiết
      console.error("Profile fetch error:", profileError);
      return { 
        session, 
        userProfile: null, 
        permissions: [], 
        isLoading: false,
        authError: 'Không thể tải thông tin người dùng. Vui lòng thử lại.'
      };
    }

    // Kiểm tra tài khoản bị vô hiệu hóa
    if (userProfile?.status === 'disabled') {
      console.warn(`[Auth] Access denied for disabled user: ${userProfile.email}`);
      await supabase.auth.signOut();
      return { session: null, userProfile: null, permissions: [], isLoading: false };
    }

    let userPermissions: Permission[] = [];
    if (userProfile?.role === 'staff') {
      try {
        const { data: permissionsData, error: permissionsError } = await supabase
          .from('permissions')
          .select('*, modules(code)')
          .eq('user_id', session.user.id);
          
        if (permissionsError) {
          console.error("Permissions fetch error:", permissionsError);
          // Không throw, chỉ để permissions rỗng
          userPermissions = [];
        } else {
          userPermissions = (permissionsData || []).map((p: any) => ({
            moduleCode: p.modules.code,
            canView: p.can_view,
            canEdit: p.can_edit,
          }));
        }
      } catch (permError) {
        console.error("Permissions error:", permError);
        userPermissions = [];
      }
    }
    
    return { session, userProfile, permissions: userPermissions, isLoading: false };
  } catch (error: any) {
    console.error("Auth Store Error:", error);
    
    // Chỉ sign out trong trường hợp thật sự cần thiết
    if (error.message?.includes('JWT') && error.message?.includes('expired')) {
      await supabase.auth.signOut();
      return { session: null, userProfile: null, permissions: [], isLoading: false };
    }
    
    // Với các lỗi khác, giữ session và thông báo lỗi
    return { 
      session, 
      userProfile: null, 
      permissions: [], 
      isLoading: false,
      authError: 'Có lỗi xảy ra khi tải dữ liệu. Vui lòng thử lại.'
    };
  }
};

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  userProfile: null,
  permissions: [],
  isLoading: true,
  isInitialized: false,
  authError: null,

  // Giữ nguyên logic đơn giản của code cũ, chỉ thêm isInitialized
  initListener: () => {
    let hasInitialLoad = false;
    
    // Lấy session hiện tại ngay lập tức
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Get session error:', error);
        }
        
        const sessionData = await fetchUserSessionData(session);
        set({ ...sessionData, isInitialized: true });
        hasInitialLoad = true;
      } catch (error) {
        console.error("Error initializing auth:", error);
        set({ 
          session: null, 
          userProfile: null, 
          permissions: [], 
          isLoading: false, 
          isInitialized: true 
        });
        hasInitialLoad = true;
      }
    };

    // Khởi tạo ngay
    initializeAuth();

    // Listener đơn giản như code cũ
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Bỏ qua lần đầu tiên nếu đã khởi tạo
      if (!hasInitialLoad) {
        hasInitialLoad = true;
        return;
      }
      
      console.log('Auth state changed:', event);
      
      const sessionData = await fetchUserSessionData(session);
      set({ ...sessionData, isInitialized: true });
    });

    return () => {
      subscription.unsubscribe();
    };
  },

  logout: async () => {
    set({ isLoading: true, authError: null }); 
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Logout error:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  // Hàm refresh đơn giản
  refreshAuth: async () => {
    const { session } = get();
    if (!session) return;
    
    set({ isLoading: true, authError: null });
    try {
      // Chỉ fetch lại user data với session hiện tại
      const sessionData = await fetchUserSessionData(session);
      set({ ...sessionData, isInitialized: true });
    } catch (error: any) {
      console.error('Refresh auth error:', error);
      set({ 
        isLoading: false,
        authError: 'Không thể làm mới dữ liệu. Vui lòng thử lại.'
      });
    }
  },

  clearAuthError: () => {
    set({ authError: null });
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