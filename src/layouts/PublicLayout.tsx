import { AppShell, Burger, Button, Group, Text, Menu, Avatar, rem, Container } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { useEffect } from 'react';
import { IconLogout, IconTicket, IconBrandGoogle } from '@tabler/icons-react';
import { Footer } from '../components/public/Footer';
import { useAuthStore } from '../store/authStore';

export function PublicLayout() {
  const [opened, { toggle }] = useDisclosure();
  const navigate = useNavigate();
  
  // Lấy state và actions từ "kho"
  const { session, userProfile, logout, checkSession } = useAuthStore();

  // Lắng nghe sự thay đổi session từ Supabase để cập nhật lại profile
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, _session) => {
      // Khi có thay đổi, yêu cầu store kiểm tra lại
      if (_event === 'SIGNED_IN' || _event === 'SIGNED_OUT') {
        checkSession();
      }
      if (_event === 'PASSWORD_RECOVERY') {
        sessionStorage.setItem('isRecoveringPassword', 'true');
        navigate('/update-password');
      }
    });
    return () => subscription.unsubscribe();
  }, [checkSession, navigate]);


  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google' });
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const userAvatar = userProfile?.avatar_url || session?.user?.user_metadata?.avatar_url;

  return (
    <AppShell
      header={{ height: 60 }}
      padding={0}
    >
      <AppShell.Header>
        <Container size="lg">
            <Group h="100%" justify="space-between">
              <Group>
                <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
                <Text fw={700} component={Link} to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
                  OROCHI TICKET
                </Text>
              </Group>

              {session && userProfile ? (
                <Menu shadow="md" width={200}>
                  <Menu.Target>
                    <Avatar src={userAvatar} radius="xl" style={{ cursor: 'pointer' }} />
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
        </Container>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <Link to="/">Trang chủ</Link>
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>

      <Footer />
    </AppShell>
  );
}
