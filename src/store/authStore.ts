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
  isInitialized: boolean; // Thêm flag này để track việc khởi tạo
  authError: string | null; // Thêm authError
  initListener: () => () => void;
  logout: () => Promise<void>;
  clearAuthError: () => void; // Thêm hàm clear error
  hasEditPermission: (moduleCode: string) => boolean;
}

// Hàm trợ giúp để lấy dữ liệu session, tránh lặp code
const fetchUserSessionData = async (session: Session | null) => {
  // Nếu không có session, trả về trạng thái đã đăng xuất
  if (!session) {
    return { session: null, userProfile: null, permissions: [], isLoading: false, isInitialized: true };
  }
  
  try {
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .single();
    
    if (profileError) throw profileError;

    if (userProfile?.status === 'disabled') {
      await supabase.auth.signOut();
      return { session: null, userProfile: null, permissions: [], isLoading: false, isInitialized: true };
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
    
    return { session, userProfile, permissions: userPermissions, isLoading: false, isInitialized: true };
  } catch (error) {
    console.error("Auth Store Error:", error);
    await supabase.auth.signOut();
    return { session: null, userProfile: null, permissions: [], isLoading: false, isInitialized: true };
  }
};

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  userProfile: null,
  permissions: [],
  isLoading: true,
  isInitialized: false,
  authError: null, // Khởi tạo authError

  // Hàm này sẽ thiết lập listener để tự động cập nhật state khi có thay đổi
  initListener: () => {
    let hasInitialLoad = false;
    
    // Lấy session hiện tại ngay lập tức
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
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

    // Khởi tạo ngay lập tức
    initializeAuth();

    // Thiết lập listener cho các thay đổi sau này
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Bỏ qua lần đầu tiên nếu đã khởi tạo rồi
      if (!hasInitialLoad) {
        hasInitialLoad = true;
        return;
      }
      
      // Chỉ xử lý các thay đổi thực sự
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        const sessionData = await fetchUserSessionData(session);
        set(sessionData);
      }
    });

    // Trả về hàm để dọn dẹp listener
    return () => {
      subscription.unsubscribe();
    };
  },

  logout: async () => {
    set({ isLoading: true }); // Set loading khi đang logout
    await supabase.auth.signOut();
    // onAuthStateChange sẽ tự động xử lý việc reset state
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