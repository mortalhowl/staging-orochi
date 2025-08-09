import { useState, useEffect } from 'react';
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
import { notifications } from '@mantine/notifications';
import { IconX } from '@tabler/icons-react';
import { supabase } from '../../services/supabaseClient';

export function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // SỬA LỖI Ở ĐÂY: Thêm useEffect để kiểm tra session
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Nếu đã có session, điều hướng ngay lập tức
        navigate('/admin/home', { replace: true });
      }
    };
    checkSession();
  }, [navigate]);

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
      const { data: { user }, error: signInError } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (signInError) throw signInError;
      if (!user) throw new Error('Không thể lấy thông tin người dùng.');

      // KIỂM TRA TRẠNG THÁI SAU KHI ĐĂNG NHẬP THÀNH CÔNG
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('status')
        .eq('id', user.id)
        .single();
      
      if (profileError) throw new Error('Không tìm thấy thông tin tài khoản.');

      if (userProfile.status === 'disabled') {
        // Nếu bị vô hiệu hóa, đăng xuất ngay lập tức và báo lỗi
        await supabase.auth.signOut();
        throw new Error('Tài khoản của bạn đã bị vô hiệu hóa.');
      }
      
      navigate('/admin/home');
    } catch (err: any) {
      notifications.show({
        title: 'Đăng nhập thất bại',
        message: err.message,
        color: 'red',
        icon: <IconX size={18} />,
      });
      setLoading(false); // Chỉ setLoading(false) khi có lỗi
    }
  };

  return (
    <Center h="100vh">
      <Paper radius="md" p="xl" withBorder shadow="md" w={400}>
        <LoadingOverlay visible={loading} zIndex={1000} overlayProps={{ radius: 'sm', blur: 2 }} />
        <Title order={2} ta="center" mb="xl">
          Đăng nhập Admin
        </Title>
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
