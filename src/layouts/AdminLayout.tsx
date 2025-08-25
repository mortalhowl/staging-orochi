import { useState, useEffect } from 'react';
import {
  AppShell, Burger, Group, NavLink, Menu, Avatar, Text,
  useMantineColorScheme, Title, Drawer, Center, Loader,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import {
  IconHome2, IconLogout, IconTicket, IconUserCircle, IconSun,
  IconMoon, IconSettings, IconBook, IconShoppingCart, IconGift,
  IconTicketOff, IconScan, IconUsers,
} from '@tabler/icons-react';
import { Outlet, useNavigate, useOutletContext, useLocation, Link } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { useAuthStore } from '../store/authStore';

type OutletContextType = { session: Session };

const navLinks = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: IconHome2, moduleCode: 'dashboard' },
    { href: '/admin/events', label: 'Sự kiện', icon: IconTicket, moduleCode: 'events' },
    { href: '/admin/articles', label: 'Bài viết', icon: IconBook, moduleCode: 'articles' },
    { href: '/admin/transactions', label: 'Đơn hàng', icon: IconShoppingCart, moduleCode: 'transactions' },
    { href: '/admin/invited-tickets', label: 'Vé mời', icon: IconGift, moduleCode: 'invited-tickets' },
    { href: '/admin/tickets', label: 'Quản lý Vé', icon: IconTicketOff, moduleCode: 'tickets' },
    { href: '/admin/check-in', label: 'Check-in', icon: IconScan, moduleCode: 'check-in' },
    { href: '/admin/users', label: 'Người dùng', icon: IconUsers, moduleCode: 'users' },
    { href: '/admin/settings', label: 'Cài đặt', icon: IconSettings, moduleCode: 'settings' },
];

export function AdminLayout() {
  const { session } = useOutletContext<OutletContextType>();
  const navigate = useNavigate();
  const [sidebarOpened, setSidebarOpened] = useState(false);
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  
  // Lấy state và actions từ "kho"
  const { userProfile, permissions, isLoading, logout, checkSession } = useAuthStore();
  const location = useLocation();
  const isMobile = useMediaQuery('(max-width: 768px)');

  // SỬA LỖI Ở ĐÂY: Thêm useEffect để đồng bộ hóa trạng thái
  // Khi người dùng đăng nhập, session thay đổi, chúng ta cần yêu cầu store tải lại dữ liệu.
  useEffect(() => {
    if (session?.user && (!userProfile || userProfile.id !== session.user.id)) {
      checkSession();
    }
  }, [session, userProfile, checkSession]);

  const handleLogout = async () => {
    await logout(); // Sử dụng action logout từ store
    navigate('/admin/login');
  };

  const toggleSidebar = () => setSidebarOpened((o) => !o);

  const hasPermission = (moduleCode: string) => {
    if (userProfile?.role === 'admin') return true;
    if (userProfile?.role === 'staff') {
      return permissions.some(p => p.moduleCode === moduleCode && p.canView);
    }
    return false;
  };

  const userAvatar = userProfile?.avatar_url || session.user?.user_metadata?.avatar_url;

  // Nội dung Nav menu
  const navMenu = (
    <>
      {navLinks.map((link) =>
        hasPermission(link.moduleCode) && (
          <NavLink
            key={link.href}
            component={Link}
            to={link.href}
            label={isMobile || sidebarOpened ? link.label : ''}
            leftSection={<link.icon size={20} />}
            active={location.pathname.startsWith(link.href)}
            onClick={() => isMobile && setSidebarOpened(false)}
          />
        )
      )}
    </>
  );

  // Hiển thị loader cho đến khi có dữ liệu quyền
  if (isLoading || !userProfile) {
    return (
        <AppShell header={{ height: 60 }} padding="md">
            <AppShell.Header>
                <Group h="100%" px="md" justify="space-between">
                    <Title order={4} c='#008a87' fw='bold'>Orochi</Title>
                </Group>
            </AppShell.Header>
            <AppShell.Main>
                <Center h="calc(100vh - 60px)"><Loader /></Center>
            </AppShell.Main>
        </AppShell>
    );
  }

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={ !isMobile ? { width: sidebarOpened ? 200 : 60, breakpoint: 'sm' } : undefined }
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={sidebarOpened} onClick={toggleSidebar} size="sm" />
            <Title order={4} c='#008a87' fw='bold'>Orochi</Title>
          </Group>
          <Menu shadow="md" width={200} trigger="click">
            <Menu.Target>
              <Avatar src={userAvatar} alt="User Avatar" radius="xl" style={{ cursor: 'pointer' }} />
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Label>
                <Text fw={500} truncate>{userProfile?.full_name || 'Người dùng'}</Text>
                <Text size="xs" c="dimmed" truncate>{session.user.email}</Text>
              </Menu.Label>
              <Menu.Divider />
              <Menu.Item leftSection={<IconUserCircle size={14} />} onClick={() => navigate('/admin/profile')}>
                Thông tin cá nhân
              </Menu.Item>
              <Menu.Item
                leftSection={colorScheme === 'dark' ? <IconSun size={14} /> : <IconMoon size={14} />}
                onClick={() => setColorScheme(colorScheme === 'dark' ? 'light' : 'dark')}
              >
                Giao diện {colorScheme === 'dark' ? 'Sáng' : 'Tối'}
              </Menu.Item>
              <Menu.Divider />
              <Menu.Item color="red" leftSection={<IconLogout size={14} />} onClick={handleLogout}>
                Đăng xuất
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </AppShell.Header>

      {!isMobile && (
        <AppShell.Navbar p="xs">
          {navMenu}
        </AppShell.Navbar>
      )}

      {isMobile && (
        <Drawer opened={sidebarOpened} onClose={() => setSidebarOpened(false)} title="Menu" padding="md" size="xs">
          {navMenu}
        </Drawer>
      )}

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
