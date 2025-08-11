import { Container, Title, Text, Stack, Group, Button, Tabs, Avatar, PasswordInput, Paper, Grid, Badge, List } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../services/supabaseClient';
import { useAuthStore } from '../../store/authStore';

// Component con cho Tab Đổi mật khẩu
function ChangePasswordTab() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const form = useForm({
    initialValues: {
      password: '',
      confirmPassword: '',
    },
    validate: {
      password: (value) => (value.length >= 6 ? null : 'Mật khẩu phải có ít nhất 6 ký tự'),
      confirmPassword: (value, values) => (value === values.password ? null : 'Mật khẩu không khớp'),
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: values.password });
      if (error) throw error;
      notifications.show({
        title: 'Thành công',
        message: 'Đổi mật khẩu thành công. Vui lòng đăng nhập lại.',
        color: 'green',
      });
      await supabase.auth.signOut();
      navigate('/admin/login');
    } catch (err: any) {
      notifications.show({ title: 'Lỗi', message: err.message, color: 'red' });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Paper withBorder p="md" radius="md" maw={500}>
        <form onSubmit={form.onSubmit(handleSubmit)}>
            <Stack>
                <PasswordInput required label="Mật khẩu mới" {...form.getInputProps('password')} />
                <PasswordInput required label="Xác nhận mật khẩu mới" {...form.getInputProps('confirmPassword')} />
                <Button type="submit" loading={loading} mt="md" style={{ alignSelf: 'flex-end' }}>
                    Lưu thay đổi
                </Button>
            </Stack>
        </form>
    </Paper>
  );
}

export function ProfilePage() {
  const { userProfile, permissions } = useAuthStore();

  if (!userProfile) {
    return null; // Hoặc một component loading
  }

  return (
    <Container>
      <Title order={2} mb="xl">Thông tin cá nhân</Title>
      
      <Tabs defaultValue="info">
        <Tabs.List>
          <Tabs.Tab value="info">Thông tin chung</Tabs.Tab>
          <Tabs.Tab value="password">Đổi mật khẩu</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="info" pt="md">
          <Paper withBorder p="xl" radius="md">
            <Grid>
              <Grid.Col span={{ base: 12, md: 4 }}>
                <Stack align="center">
                  <Avatar src={userProfile.avatar_url} size={120} radius="50%" />
                  <Title order={3} mt="md">{userProfile.full_name}</Title>
                  <Text c="dimmed">{userProfile.email}</Text>
                </Stack>
              </Grid.Col>
              <Grid.Col span={{ base: 12, md: 8 }}>
                <Stack>
                  <Title order={4}>Quyền hạn</Title>
                  {userProfile.role === 'admin' ? (
                    <Badge size="lg" color="red">Toàn quyền quản trị</Badge>
                  ) : (
                    <List>
                      {permissions.filter(p => p.canView).map(p => (
                        <List.Item key={p.moduleCode}>
                          <Text>
                            Truy cập module <b>{p.moduleCode}</b>
                            {p.canEdit && ' (có quyền chỉnh sửa)'}
                          </Text>
                        </List.Item>
                      ))}
                    </List>
                  )}
                </Stack>
              </Grid.Col>
            </Grid>
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="password" pt="md">
          <ChangePasswordTab />
        </Tabs.Panel>
      </Tabs>
    </Container>
  );
}
