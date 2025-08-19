import { useState, useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
import { Center, Loader } from '@mantine/core';
import type { Session } from '@supabase/supabase-js';

export function AuthGuard() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const checkAuthAndRole = async () => {
      // Lấy session hiện tại
      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !currentSession) {
        setLoading(false);
        return;
      }
      
      setSession(currentSession);

      // Nếu có session, lấy vai trò từ bảng public.users
      try {
        const { data: userProfile, error: profileError } = await supabase
          .from('users')
          .select('role')
          .eq('id', currentSession.user.id)
          .single();

        if (profileError) {
          // Nếu không tìm thấy profile, có thể là do race condition, đăng xuất cho an toàn
          await supabase.auth.signOut();
          setUserRole(null);
        } else {
          setUserRole(userProfile.role);
        }
      } catch (e) {
        await supabase.auth.signOut();
        setUserRole(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuthAndRole();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      // Nếu đăng xuất, reset role
      if (!session) {
        setUserRole(null);
        setLoading(false);
      } else {
        // Nếu có sự kiện đăng nhập mới, kiểm tra lại role
        checkAuthAndRole();
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <Center h="100vh">
        <Loader />
      </Center>
    );
  }

  // Nếu không có session, điều hướng về trang login
  if (!session) {
    return <Navigate to="/admin/login" replace />;
  }

  // Nếu có session nhưng vai trò là 'viewer', điều hướng về trang chủ
  if (userRole === 'viewer') {
    return <Navigate to="/" replace />;
  }

  // Nếu là 'admin' hoặc 'staff', cho phép truy cập
  return <Outlet context={{ session }} />;
}
