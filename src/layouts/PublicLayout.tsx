import { AppShell, Burger, Button, Group, Text, Image } from '@mantine/core';
import { Outlet, Link } from 'react-router-dom';

export function PublicLayout() {
  return (
    <AppShell
      header={{ height: 60 }}
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group>
            <Image src={'/public/logo.png'} style={{height: 'auto', width: '30px'}}></Image>
            <Text fw="bold" c="#008a87"  component={Link} to="/">OROCHI</Text>
          </Group>
          <Button>Đăng nhập</Button>
        </Group>
      </AppShell.Header>

      <AppShell.Main>
        <Outlet />
      </AppShell.Main>
    </AppShell>
  );
}