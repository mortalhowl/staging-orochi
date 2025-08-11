import { AppShell, Burger, Button, Group, Text, Menu, Avatar, rem, Image } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import type { Session, User } from '@supabase/supabase-js';
import { useState, useEffect } from 'react';
import { IconLogout, IconTicket, IconBrandGoogle } from '@tabler/icons-react';
import type { UserProfile } from '../types';

export function PublicLayout() {
  const [opened, { toggle }] = useDisclosure();
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async (user: User | null) => {
      if (!user) {
        setUserProfile(null);
        return;
      }
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!error) setUserProfile(data);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      fetchProfile(session?.user ?? null);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      fetchProfile(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.href },
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUserProfile(null);
    navigate('/');
  };

  return (
    <AppShell header={{ height: 60 }} padding="md">
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
            <Group>
              <Image src="/logo.png" alt="Orochi Logo" style={{ width: '30px' }} />
              <Text
                fw={900} // Đậm nhất
                fz="xl" // Chữ to
                style={{
                  fontFamily: "'Poppins', sans-serif", // Font nổi bật
                }}
                c="#008a87"
              >
                Orochi
              </Text>
            </Group>
          </Link>
          {session && userProfile ? (
            <Menu shadow="md" width={200}>
              <Menu.Target>
                <Avatar src={userProfile.avatar_url} radius="xl" style={{ cursor: 'pointer' }} />
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>
                  <Text fw={500} truncate>{userProfile.full_name}</Text>
                  <Text size="xs" c="dimmed" truncate>{userProfile.email}</Text>
                </Menu.Label>
                <Menu.Divider />
                <Menu.Item
                  leftSection={<IconTicket style={{ width: rem(14), height: rem(14) }} />}
                  onClick={() => navigate('/my-tickets')}
                >
                  Vé của tôi
                </Menu.Item>
                <Menu.Divider />
                <Menu.Item
                  color="red"
                  leftSection={<IconLogout style={{ width: rem(14), height: rem(14) }} />}
                  onClick={handleLogout}
                >
                  Đăng xuất
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          ) : (
            <Button onClick={handleGoogleLogin} leftSection={<IconBrandGoogle size={18} />} variant="default">
              Đăng nhập
            </Button>
          )}
        </Group>
      </AppShell.Header>

      <AppShell.Main pt={60}>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
