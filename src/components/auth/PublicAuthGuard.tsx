import { useState, useEffect } from 'react';
import type {ReactNode} from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
import { Center, Loader } from '@mantine/core';

export function PublicAuthGuard() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return <Center h="100vh"><Loader /></Center>;
  }

  if (!session) {
    return <Navigate to="/" replace />;
  }

  // Truyền session xuống để các trang con có thể sử dụng
  return <Outlet context={{ session }} />;
}