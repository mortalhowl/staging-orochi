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
  refreshAuth: () => Promise<void>; // Thêm hàm refresh
  clearAuthError: () => void; 
  hasEditPermission: (moduleCode: string) => boolean;
}

// Hàm trợ giúp để lấy dữ liệu session với timeout và retry
const fetchUserSessionData = async (session: Session | null, retryCount = 0) => {
  // Nếu không có session, trả về trạng thái đã đăng xuất
  if (!session) {
    return { session: null, userProfile: null, permissions: [], isLoading: false, isInitialized: true };
  }
  
  try {
    // Kiểm tra session còn valid không (với buffer 5 phút)
    const now = Math.floor(Date.now() / 1000);
    const bufferTime = 5 * 60; // 5 phút buffer
    if (session.expires_at && session.expires_at < (now + bufferTime)) {
      console.log('Session expiring soon, refreshing...');
      try {
        const { data: refreshedSession, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError || !refreshedSession.session) {
          console.error('Failed to refresh session:', refreshError);
          await supabase.auth.signOut();
          return { session: null, userProfile: null, permissions: [], isLoading: false, isInitialized: true };
        }
        session = refreshedSession.session;
      } catch (refreshError) {
        console.error('Refresh session error:', refreshError);
        await supabase.auth.signOut();
        return { session: null, userProfile: null, permissions: [], isLoading: false, isInitialized: true };
      }
    }

    // Thêm timeout ngắn hơn cho request (5 giây thay vì 10)
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Request timeout')), 5000)
    );

    const userProfilePromise = supabase
      .from('users')
      .select('*')
      .eq('id', session.user.id)
      .single();

    const { data: userProfile, error: profileError } = await Promise.race([
      userProfilePromise,
      timeoutPromise
    ]) as any;
    
    if (profileError) {
      // Kiểm tra nếu là JWT expired error
      if (profileError.message?.includes('JWT') && profileError.message?.includes('expired')) {
        console.log('JWT expired, attempting refresh...');
        try {
          const { data: refreshedSession, error: refreshError } = await supabase.auth.refreshSession();
          if (!refreshError && refreshedSession.session) {
            // Thử lại với session mới
            return fetchUserSessionData(refreshedSession.session, 0);
          }
        } catch (refreshError) {
          console.error('JWT refresh failed:', refreshError);
        }
        await supabase.auth.signOut();
        return { session: null, userProfile: null, permissions: [], isLoading: false, isInitialized: true };
      }
      
      // Nếu là network error và chưa retry, thử lại
      if ((profileError.message?.includes('Failed to fetch') || 
           profileError.message?.includes('timeout')) && retryCount < 2) {
        console.log(`Retrying fetch user data... (${retryCount + 1}/2)`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
        return fetchUserSessionData(session, retryCount + 1);
      }
      throw profileError;
    }

    if (userProfile?.status === 'disabled') {
      await supabase.auth.signOut();
      return { session: null, userProfile: null, permissions: [], isLoading: false, isInitialized: true };
    }

    let userPermissions: Permission[] = [];
    if (userProfile?.role === 'staff') {
      try {
        const permissionsPromise = supabase
          .from('permissions')
          .select('*, modules(code)')
          .eq('user_id', session.user.id);

        const { data: permissionsData, error: permissionsError } = await Promise.race([
          permissionsPromise,
          timeoutPromise
        ]) as any;
        
        if (permissionsError) {
          // JWT expired cho permissions query
          if (permissionsError.message?.includes('JWT') && permissionsError.message?.includes('expired')) {
            console.log('JWT expired during permissions fetch, refreshing...');
            const { data: refreshedSession, error: refreshError } = await supabase.auth.refreshSession();
            if (!refreshError && refreshedSession.session) {
              return fetchUserSessionData(refreshedSession.session, 0);
            }
            await supabase.auth.signOut();
            return { session: null, userProfile: null, permissions: [], isLoading: false, isInitialized: true };
          }
          
          // Các lỗi khác với permissions, vẫn cho phép login nhưng không có quyền
          console.warn('Failed to fetch permissions:', permissionsError);
          userPermissions = [];
        } else {
          userPermissions = (permissionsData || []).map((p: any) => ({
            moduleCode: p.modules.code,
            canView: p.can_view,
            canEdit: p.can_edit,
          }));
        }
      } catch (permError) {
        console.warn('Permissions fetch error:', permError);
        userPermissions = [];
      }
    }
    
    return { session, userProfile, permissions: userPermissions, isLoading: false, isInitialized: true };
  } catch (error: any) {
    console.error("Auth Store Error:", error);
    
    // JWT expired
    if (error.message?.includes('JWT') && error.message?.includes('expired')) {
      console.log('JWT expired, signing out...');
      await supabase.auth.signOut();
      return { session: null, userProfile: null, permissions: [], isLoading: false, isInitialized: true };
    }
    
    // Network errors - không tự động sign out
    if (error.message === 'Request timeout' || 
        error.message?.includes('Failed to fetch') ||
        error.message?.includes('NetworkError')) {
      return { 
        session, 
        userProfile: null, 
        permissions: [], 
        isLoading: false, 
        isInitialized: true,
        authError: 'Mất kết nối với máy chủ. Vui lòng thử lại.'
      };
    }
    
    // Các lỗi khác thì sign out
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
    let refreshInterval: number | null = null;
    
    // Lấy session hiện tại ngay lập tức
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        const sessionData = await fetchUserSessionData(session);
        set({ ...sessionData, isInitialized: true });
        hasInitialLoad = true;

        // Thiết lập auto-refresh cho session (mỗi 15 phút thay vì 30)
        if (session) {
          refreshInterval = window.setInterval(async () => {
            try {
              console.log('Auto-refreshing session...');
              const { data, error } = await supabase.auth.refreshSession();
              if (error) {
                console.error('Auto-refresh failed:', error);
                // Nếu refresh fail, kiểm tra session hiện tại
                const { data: { session: currentSession } } = await supabase.auth.getSession();
                if (!currentSession) {
                  console.log('No valid session found, signing out...');
                  set({ 
                    session: null, 
                    userProfile: null, 
                    permissions: [], 
                    authError: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' 
                  });
                }
              } else {
                console.log('Session refreshed successfully');
                // Fetch lại user data với session mới nếu cần
                const sessionData = await fetchUserSessionData(data.session);
                set(sessionData);
              }
            } catch (error) {
              console.error('Session refresh error:', error);
            }
          }, 15 * 60 * 1000); // 15 minutes thay vì 30
        }
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
      
      console.log('Auth state changed:', event);
      
      // Clear refresh interval nếu đăng xuất
      if (event === 'SIGNED_OUT' && refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
      }
      
      // Xử lý các events
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        const sessionData = await fetchUserSessionData(session);
        set(sessionData);
        
        // Thiết lập lại refresh interval cho session mới
        if (event === 'SIGNED_IN' && session) {
          if (refreshInterval) clearInterval(refreshInterval);
          refreshInterval = window.setInterval(async () => {
            try {
              console.log('Auto-refreshing session...');
              const { error } = await supabase.auth.refreshSession();
              if (error) {
                console.error('Auto-refresh failed:', error);
              } else {
                console.log('Session refreshed successfully');
              }
            } catch (error) {
              console.error('Session refresh error:', error);
            }
          }, 15 * 60 * 1000); // 15 minutes
        }
      }
    });

    // Trả về hàm để dọn dẹp listener
    return () => {
      subscription.unsubscribe();
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
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
    // onAuthStateChange sẽ tự động xử lý việc reset state
  },

  refreshAuth: async () => {
    const { session } = get();
    if (!session) return;
    
    set({ isLoading: true, authError: null });
    try {
      console.log('Manual refresh auth...');
      // Refresh session trước
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError || !refreshData.session) {
        throw new Error(refreshError?.message || 'Failed to refresh session');
      }
      
      // Sau đó fetch lại user data
      const sessionData = await fetchUserSessionData(refreshData.session);
      set(sessionData);
      console.log('Manual refresh successful');
    } catch (error: any) {
      console.error('Refresh auth error:', error);
      // Nếu là JWT expired, sign out luôn
      if (error.message?.includes('JWT') && error.message?.includes('expired')) {
        await supabase.auth.signOut();
        set({ 
          session: null,
          userProfile: null, 
          permissions: [], 
          isLoading: false,
          authError: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
        });
      } else {
        set({ 
          isLoading: false,
          authError: 'Không thể làm mới phiên đăng nhập. Vui lòng thử lại.'
        });
      }
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