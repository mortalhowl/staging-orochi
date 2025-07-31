import { AppShell, Burger, Button, Group, Text, Menu, Avatar, rem } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import type { Session } from '@supabase/supabase-js';
import { useState, useEffect } from 'react';
import { IconLogout, IconTicket, IconBrandGoogle } from '@tabler/icons-react';

export function PublicLayout() {
  const [opened, { toggle }] = useDisclosure();
  const [session, setSession] = useState<Session | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Lấy session ban đầu
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Lắng nghe sự thay đổi trạng thái đăng nhập
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.href, // Quay lại đúng trang hiện tại sau khi đăng nhập
      },
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{ width: 300, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Text fw={700} component={Link} to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
              OROCHI TICKET
            </Text>
          </Group>

          {session ? (

            // Nếu đã đăng nhập, hiển thị Avatar và Menu
            <Menu shadow="md" width={200}>
              <Menu.Target>
                <Avatar src={session.user.user_metadata?.avatar_url} radius="xl" style={{ cursor: 'pointer' }} />
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>{session.user.email}</Menu.Label>
                <Menu.Item
                  leftSection={<IconTicket style={{ width: rem(14), height: rem(14) }} />}
                  onClick={() => navigate('/my-tickets')} // Trang này sẽ tạo sau
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
            // Nếu chưa đăng nhập, hiển thị nút Đăng nhập
                        <Button onClick={handleGoogleLogin} leftSection={<IconBrandGoogle size={18} />} variant="default">
              Đăng nhập
            </Button>
          )}
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <Link to="/">Trang chủ</Link>
      </AppShell.Navbar>

      <AppShell.Main pt={60}>
        <Outlet />
      </AppShell.Main>
      {/* Không cần AuthModal ở đây nữa */}
    </AppShell>
  );
}