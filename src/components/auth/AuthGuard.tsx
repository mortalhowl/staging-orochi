// src/components/auth/AuthGuard.tsx
import { useState, useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
import { Center, Loader } from '@mantine/core';
import type { Session } from '@supabase/supabase-js';
import { useAuthStore } from '../../store/authStore';

export function AuthGuard() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const checkSession = useAuthStore(state => state.checkSession);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        checkSession(); // 🔹 Load quyền ngay khi vào
      }
      setLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        checkSession(); // 🔹 Load quyền khi đổi user
      } else {
        useAuthStore.setState({ session: null, userProfile: null, permissions: [] });
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [checkSession]);

  if (loading) {
    return (
      <Center h="100vh">
        <Loader />
      </Center>
    );
  }

  if (!session) {
    return <Navigate to="/admin/login" replace />;
  }

  return <Outlet context={{ session }} />;
}
