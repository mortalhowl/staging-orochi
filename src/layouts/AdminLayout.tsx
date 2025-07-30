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
  Transition
} from '@mantine/core';
import {
  IconHome2,
  IconLogout,
  IconTicket,
  IconUserCircle,
  IconSun,
  IconMoon,
  IconSettings,
} from '@tabler/icons-react';
import { Outlet, useNavigate, useOutletContext } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { notifications } from '@mantine/notifications';
import type { Session } from '@supabase/supabase-js';

type OutletContextType = { session: Session };

export function AdminLayout() {
  const { session } = useOutletContext<OutletContextType>();
  const navigate = useNavigate();
  const [sidebarOpened, setSidebarOpened] = useState(false);
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const transitionTimeoutRef = useRef<number | null>(null);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      notifications.show({
        title: 'Lỗi đăng xuất',
        message: error.message,
        color: 'red',
      });
    } else {
      navigate('/admin/login');
    }
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

  const userAvatar = session.user?.user_metadata?.avatar_url;

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: sidebarOpened ? 180 : 65,
        breakpoint: 0,
      }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Title order={4}>Orochi Ticket</Title>

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
                <Text fw={500}>
                  {session.user?.user_metadata?.full_name || 'Người dùng'}
                </Text>
                <Text size="xs" c="dimmed">
                  {session.user.email}
                </Text>
              </Menu.Label>
              <Menu.Divider />
              <Menu.Item
                leftSection={
                  <IconUserCircle style={{ width: rem(14), height: rem(14) }} />
                }
                onClick={() => navigate('/admin/profile')}
              >
                Thông tin cá nhân
              </Menu.Item>
              <Menu.Item
                leftSection={
                  colorScheme === 'dark' ? (
                    <IconSun style={{ width: rem(14), height: rem(14) }} />
                  ) : (
                    <IconMoon style={{ width: rem(14), height: rem(14) }} />
                  )
                }
                onClick={() =>
                  setColorScheme(colorScheme === 'dark' ? 'light' : 'dark')
                }
              >
                Giao diện {colorScheme === 'dark' ? 'Sáng' : 'Tối'}
              </Menu.Item>
              <Menu.Divider />
              <Menu.Item
                color="red"
                leftSection={
                  <IconLogout style={{ width: rem(14), height: rem(14) }} />
                }
                onClick={handleLogout}
              >
                Đăng xuất
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar
        p="xs"
        style={{
          transition: 'width 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          overflowX: 'hidden',
        }}
      >
        {/* Nút burger đặt trong sidebar */}
        <Group 
          justify={sidebarOpened ? 'end' : 'center'} 
          mb="lg"
          style={{ height: rem(36) }}
        >
          <Burger
            opened={sidebarOpened}
            onClick={toggleSidebar}
            size="sm"
          />
        </Group>

        <NavLink
          href="/admin/dashboard"
          style={{ height: rem(40) }}
          label={
            <Transition
              mounted={sidebarOpened && !isTransitioning}
              transition="fade"
              duration={200}
              timingFunction="ease"
            >
              {(styles) => <span style={styles}>Dashboard</span>}
            </Transition>
          }
          leftSection={<IconHome2 size={20} />}
          active
        />
        <NavLink
          href="/admin/events"
          style={{ height: rem(40) }}
          label={
            <Transition
              mounted={sidebarOpened && !isTransitioning}
              transition="fade"
              duration={200}
              timingFunction="ease"
            >
              {(styles) => <span style={styles}>Sự kiện</span>}
            </Transition>
          }
          leftSection={<IconTicket size={20} />}
        />
        <NavLink
          href="/admin/settings"
          style={{ height: rem(40) }}
          label={
            <Transition
              mounted={sidebarOpened && !isTransitioning}
              transition="fade"
              duration={200}
              timingFunction="ease"
            >
              {(styles) => <span style={styles}>Cài đặt</span>}
            </Transition>
          }
          leftSection={<IconSettings size={20} />}
        />
      </AppShell.Navbar>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}