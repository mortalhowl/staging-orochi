import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Title, Paper, PasswordInput, Button, Stack, Center, Alert, Loader } from '@mantine/core';
import { useForm } from '@mantine/form';
import { supabase } from '../services/supabaseClient';
import { notifications } from '@mantine/notifications';
import { IconAlertCircle } from '@tabler/icons-react';

export function UpdatePasswordPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(true);

  useEffect(() => {
    // KIỂM TRA "VÉ VÀO CỬA"
    const isRecovering = sessionStorage.getItem('isRecoveringPassword') === 'true';

    if (!isRecovering) {
      setError('Link không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu một link mới.');
    }
    setIsValidating(false);

    // Dọn dẹp "vé" sau khi đã kiểm tra
    return () => {
        sessionStorage.removeItem('isRecoveringPassword');
    }
  }, []);

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
    setError(null);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: values.password,
      });

      if (updateError) throw updateError;

      notifications.show({
        title: 'Thành công',
        message: 'Đã đổi mật khẩu thành công! Bạn sẽ được chuyển đến trang đăng nhập.',
        color: 'green',
      });

      await supabase.auth.signOut();
      // Xóa "vé" sau khi thành công
      sessionStorage.removeItem('isRecoveringPassword');
      setTimeout(() => navigate('/admin/login'), 2000);

    } catch (err: any) {
      setError(err.message || 'Đã có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Center h="100vh" bg="gray.1">
      <Container size="xs">
        <Title order={2} ta="center" mb="xl">Đặt lại Mật khẩu</Title>
        <Paper withBorder shadow="md" p="xl" radius="md" w={400}>
          {isValidating ? (
            <Center><Loader /></Center>
          ) : error ? (
            <Alert color="red" icon={<IconAlertCircle />}>{error}</Alert>
          ) : (
            <form onSubmit={form.onSubmit(handleSubmit)}>
              <Stack>
                <PasswordInput
                  required
                  label="Mật khẩu mới"
                  {...form.getInputProps('password')}
                />
                <PasswordInput
                  required
                  label="Xác nhận mật khẩu mới"
                  {...form.getInputProps('confirmPassword')}
                />
                <Button type="submit" loading={loading} fullWidth mt="md">
                  Lưu Mật khẩu mới
                </Button>
              </Stack>
            </form>
          )}
        </Paper>
      </Container>
    </Center>
  );
}
