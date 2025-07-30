import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Paper,
  Title,
  TextInput,
  PasswordInput,
  Button,
  Stack,
  LoadingOverlay,
  Center,
} from '@mantine/core';
import { useForm } from '@mantine/form';
// === 1. IMPORT HOOK VÀ ICON MỚI ===
import { notifications } from '@mantine/notifications';
import { IconX } from '@tabler/icons-react';
import { supabase } from '../../services/supabaseClient';

export function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  // === 2. KHÔNG CẦN STATE `error` NỮA ===
  // const [error, setError] = useState<string | null>(null);

  const form = useForm({
    initialValues: {
      email: '',
      password: '',
    },
    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Email không hợp lệ'),
      password: (value) => (value.length > 0 ? null : 'Mật khẩu không được để trống'),
    },
  });

  const handleLogin = async (values: typeof form.values) => {
    setLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (signInError) {
        throw signInError;
      }

      navigate('/admin/dashboard');
    } catch (err: any) {
      // === 3. HIỂN THỊ NOTIFICATION KHI CÓ LỖI ===
      notifications.show({
        title: 'Đăng nhập thất bại',
        message: err.message || 'Đã có lỗi xảy ra. Vui lòng thử lại.',
        color: 'red',
        icon: <IconX size={18} />,
        autoClose: 5000, // Tự động đóng sau 5 giây
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Center h="100vh" bg="gray.1">
      <Paper radius="md" p="xl" withBorder shadow="md" w={400}>
        <LoadingOverlay visible={loading} zIndex={1000} overlayProps={{ radius: 'sm', blur: 2 }} />
        <Title order={2} ta="center" mb="xl">
          Đăng nhập Admin
        </Title>

        {/* === 4. XÓA COMPONENT ALERT CŨ === */}

        <form onSubmit={form.onSubmit(handleLogin)}>
          <Stack>
            <TextInput
              required
              label="Email"
              placeholder="admin@example.com"
              {...form.getInputProps('email')}
            />
            <PasswordInput
              required
              label="Mật khẩu"
              placeholder="••••••••"
              {...form.getInputProps('password')}
            />
            <Button type="submit" mt="xl" fullWidth>
              Đăng nhập
            </Button>
          </Stack>
        </form>
      </Paper>
    </Center>
  );
}