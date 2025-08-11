// src/layouts/AdminLayout.tsx
import { useState, useRef, useEffect } from 'react';
import {
  AppShell,
  Burger,
  Group,
  NavLink,
  Menu,
  Avatar,
  Text,
  rem,
  useMantineColorScheme,
  Title,
  Transition,
  Drawer,
  Image,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import {
  IconHome2,
  IconLogout,
  IconTicket,
  IconUserCircle,
  IconSun,
  IconMoon,
  IconSettings,
  IconBook,
  IconShoppingCart,
  IconGift,
  IconTicketOff,
  IconScan,
  IconUsers,
} from '@tabler/icons-react';
import { Outlet, useNavigate, useOutletContext, useLocation, Link } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { notifications } from '@mantine/notifications';
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
  const [isTransitioning, setIsTransitioning] = useState(false);
  const transitionTimeoutRef = useRef<number | null>(null);
  const { userProfile, permissions } = useAuthStore();
  const location = useLocation();
  const isMobile = useMediaQuery('(max-width: 768px)');

  const { logout } = useAuthStore();

  const handleLogout = async () => {
    await logout(); // 🔹 Reset state
    navigate('/admin/login');
  };

  const toggleSidebar = () => {
    setIsTransitioning(true);
    setSidebarOpened((o) => !o);

    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }
    transitionTimeoutRef.current = window.setTimeout(() => {
      setIsTransitioning(false);
    }, 200);
  };

  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, []);

  const hasPermission = (moduleCode: string) => {
    if (userProfile?.role === 'admin') return true;
    if (userProfile?.role === 'staff') {
      return permissions.some(p => p.moduleCode === moduleCode && p.canView);
    }
    return false;
  };

  const userAvatar = session.user?.user_metadata?.avatar_url;

  // Nav menu content (dùng chung cho Drawer và Navbar)
  const navMenu = (
    <>
      {navLinks.map((link) =>
        hasPermission(link.moduleCode) && (
          <NavLink
            key={link.href}
            href={link.href}
            onClick={(e) => {
              e.preventDefault();
              navigate(link.href);
              if (isMobile) setSidebarOpened(false); // đóng menu sau khi chọn
            }}
            label={
              !isMobile && sidebarOpened ? (
                <Transition
                  mounted={sidebarOpened && !isTransitioning}
                  transition="fade"
                  duration={200}
                  timingFunction="ease"
                >
                  {(styles) => <span style={styles}>{link.label}</span>}
                </Transition>
              ) : (
                link.label
              )
            }
            leftSection={<link.icon size={20} />}
            active={location.pathname.startsWith(link.href)}
            style={{
              height: rem(36),
              paddingLeft: sidebarOpened ? rem(8) : rem(10),
              paddingRight: rem(10),
              marginBottom: rem(4),
            }}
          />
        )
      )}
    </>
  );

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={
        !isMobile
          ? { width: sidebarOpened ? 180 : 57, breakpoint: 0 }
          : undefined
      }
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Burger opened={sidebarOpened} onClick={toggleSidebar} size="sm" />
            <Link to="/admin/home" style={{ textDecoration: 'none', color: 'inherit' }}>
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
          </Group>

          <Menu shadow="md" width={200} trigger="click">
            <Menu.Target>
              <Avatar
                src={userAvatar}
                alt="User Avatar"
                radius="xl"
                style={{ cursor: 'pointer' }}
              />
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Label>
                <Text fw={500}>{userProfile?.full_name || 'Người dùng'}</Text>
                <Text size="xs" c="dimmed">
                  {session.user.email}
                </Text>
              </Menu.Label>
              <Menu.Divider />
              <Menu.Item
                leftSection={<IconUserCircle size={14} />}
                onClick={() => navigate('/admin/profile')}
              >
                Thông tin cá nhân
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
                leftSection={<IconLogout size={14} />}
                onClick={handleLogout}
              >
                Đăng xuất
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </AppShell.Header>

      {/* Navbar cố định trên desktop */}
      {!isMobile && (
        <AppShell.Navbar
          px={sidebarOpened ? 'xs' : 8}
          py="xs"
          style={{
            transition: 'width 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            overflowX: 'hidden',
          }}
        >

          {navMenu}
        </AppShell.Navbar>
      )}

      {/* Drawer trên mobile */}
      {isMobile && (
        <Drawer
          opened={sidebarOpened}
          onClose={() => setSidebarOpened(false)}
          title="Menu"
          padding="md"
          size="xs"
        >
          {navMenu}
        </Drawer>
      )}

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}
