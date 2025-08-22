import { AppShell, Button, Group, Text, Menu, Avatar, rem, Image, useMantineColorScheme, } from '@mantine/core';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import type { Session, User } from '@supabase/supabase-js';
import { useState, useEffect } from 'react';
import { IconLogout, IconTicket, IconSun, IconMoon } from '@tabler/icons-react';
import type { UserProfile } from '../types';
import { Footer } from '../components/public/Footer';

export function PublicLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const navigate = useNavigate();
  const { colorScheme, setColorScheme } = useMantineColorScheme();

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
              <Image src="/logo.png" alt="Orochi Logo" style={{ width: '34px' }} />
              <Text
                fw={900} // Đậm nhất
                style={{
                  fontFamily: 'BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
                  color: '#008a87',
                  fontSize: '1.5rem',
                  fontWeight: 700,
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
                              <Menu.Item
                leftSection={
                  colorScheme === 'dark' ? <IconSun size={14} /> : <IconMoon size={14} />
                }
                onClick={() => setColorScheme(colorScheme === 'dark' ? 'light' : 'dark')}
              >
                Giao diện {colorScheme === 'dark' ? 'Sáng' : 'Tối'}
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
            <Button onClick={handleGoogleLogin} c="#fff" bg="#008a87" >
              Đăng nhập
            </Button>
          )}
        </Group>
      </AppShell.Header>

      <AppShell.Main pt={60} px="0px">
        <Outlet />
      </AppShell.Main>

      <Footer />
    </AppShell>
  );
}
