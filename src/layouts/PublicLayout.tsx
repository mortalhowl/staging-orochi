import { AppShell, Button, Group, Text, Menu, Avatar, rem, Image, useMantineColorScheme, } from '@mantine/core';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { useEffect } from 'react';
import { IconLogout, IconTicket, IconSun, IconMoon } from '@tabler/icons-react';
import { Footer } from '../components/public/Footer';
import { useAuthStore } from '../store/authStore'; // Import store
import { notifications } from '@mantine/notifications';

export function PublicLayout() {
  const navigate = useNavigate();
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  
  // Sử dụng auth store thay vì local state
  const { session, userProfile, isInitialized, authError, logout, refreshAuth, clearAuthError } = useAuthStore();

  // Hiển thị auth error nếu có
  useEffect(() => {
    if (authError) {
      notifications.show({
        title: 'Thông báo',
        message: authError,
        color: 'yellow',
        autoClose: 5000,
      });
      clearAuthError();
    }
  }, [authError, clearAuthError]);

  // Xử lý password recovery navigation
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, _session) => {
      if (event === 'PASSWORD_RECOVERY') {
        navigate('/update-password');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
      });
      
      if (error) throw error;
    } catch (error: any) {
      console.error('Login error:', error);
      notifications.show({
        title: 'Lỗi Đăng nhập',
        message: error.message || 'Có lỗi xảy ra khi đăng nhập. Vui lòng thử lại.',
        color: 'red',
      });
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
      notifications.show({
        title: 'Thành công',
        message: 'Đã đăng xuất thành công',
        color: 'green',
      });
    } catch (error: any) {
      console.error('Logout error:', error);
      notifications.show({
        title: 'Lỗi',
        message: error.message || 'Có lỗi xảy ra khi đăng xuất.',
        color: 'red',
      });
    }
  };

  // Hàm retry khi có lỗi kết nối
  const handleRetry = async () => {
    try {
      await refreshAuth();
      notifications.show({
        title: 'Thành công',
        message: 'Đã làm mới kết nối',
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        title: 'Lỗi',
        message: 'Không thể kết nối. Vui lòng thử lại sau.',
        color: 'red',
      });
    }
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
          
          {/* Chỉ hiển thị UI khi đã initialized */}
          {isInitialized && (
            <>
              {session && userProfile ? (
                <Menu shadow="md" width={200}>
                  <Menu.Target>
                    <Avatar 
                      src={userProfile.avatar_url || session.user?.user_metadata?.avatar_url} 
                      radius="xl" 
                      style={{ cursor: 'pointer' }} 
                    />
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Label>
                      <Text fw={500} truncate>{userProfile.full_name || 'Người dùng'}</Text>
                      <Text size="xs" c="dimmed" truncate>{userProfile.email || session.user.email}</Text>
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
              ) : session && !userProfile ? (
                // Hiển thị khi có session nhưng không load được userProfile
                <Button 
                  variant="outline" 
                  size="xs" 
                  onClick={handleRetry}
                  color="yellow"
                >
                  Thử lại
                </Button>
              ) : (
                <Button onClick={handleGoogleLogin} c="#fff" bg="#008a87">
                  Đăng nhập
                </Button>
              )}
            </>
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