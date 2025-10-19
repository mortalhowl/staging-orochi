// src/pages/admin/EmailConfigPage.tsx
import { useEffect } from 'react';
import { Paper, Title, TextInput, Button, Stack, NumberInput, Alert, Text, Select, Box, Container } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useDisclosure } from '@mantine/hooks';
import { IconInfoCircle } from '@tabler/icons-react';
import { SettingsApi } from '../../services/api/settings'; //

// Thêm provider vào interface
interface EmailConfigForm {
  id?: string;
  sender_email: string;
  smtp_host: string;
  smtp_port: number;
  provider: 'smtp' | 'resend'; // Thêm trường provider
}

export function EmailConfigPage() {
  const [loading, { open: startLoading, close: endLoading }] = useDisclosure(false);

  const form = useForm<EmailConfigForm>({
    initialValues: {
      provider: 'smtp', // Giá trị mặc định
      sender_email: '',
      smtp_host: 'smtp.gmail.com', // Giữ lại giá trị mặc định cho SMTP
      smtp_port: 587,          // Giữ lại giá trị mặc định cho SMTP
    },
    validate: (values) => {
      const errors: Record<string, string> = {};
      if (!/^\S+@\S+$/.test(values.sender_email)) {
        errors.sender_email = 'Email người gửi không hợp lệ';
      }
      // Chỉ validate SMTP fields nếu provider là smtp
      if (values.provider === 'smtp') {
        if (!values.smtp_host || values.smtp_host.trim().length === 0) {
          errors.smtp_host = 'SMTP host không được trống';
        }
        if (!values.smtp_port || values.smtp_port <= 0) {
          errors.smtp_port = 'Port không hợp lệ';
        }
      }
      return errors;
    },
  });

  // Fetch config, bao gồm cả provider
  useEffect(() => {
    const fetchConfig = async () => {
      startLoading(); // Bắt đầu loading khi fetch
      try {
        const config = await SettingsApi.getEmailConfig(); //
        if (config) {
          // Gán giá trị lấy được vào form, bao gồm cả provider
          form.setValues({
            id: config.id, // Giữ lại ID nếu có để update
            provider: config.provider || 'smtp', // Mặc định là smtp nếu null
            sender_email: config.sender_email || '',
            smtp_host: config.smtp_host || 'smtp.gmail.com',
            smtp_port: config.smtp_port || 587,
          });
        }
      } catch (error: any) {
        notifications.show({ title: 'Lỗi', message: `Không thể tải cấu hình: ${error.message}`, color: 'red' });
      } finally {
        endLoading(); // Kết thúc loading
      }
    };
    fetchConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Chỉ chạy 1 lần khi component mount

  // Submit form, bao gồm cả provider
  const handleSubmit = async (values: EmailConfigForm) => {
    startLoading();
    try {
      // Dữ liệu gửi đi bao gồm cả provider
      await SettingsApi.upsertEmailConfig(values); //
      notifications.show({ title: 'Thành công', message: 'Đã lưu cấu hình email.', color: 'green' });
    } catch (err: any) {
      notifications.show({ title: 'Lỗi', message: `Lưu cấu hình thất bại: ${err.message}`, color: 'red' });
    } finally {
      endLoading();
    }
  };

  return (
    <Container size="sm"> {/* Thay đổi size để vừa vặn hơn */}
      <Paper withBorder p="xl" radius="md">
        <Title order={3} mb="lg">Cấu hình Gửi Email</Title>
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            {/* --- Chọn Provider --- */}
            <Select
              label="Nhà cung cấp dịch vụ Email"
              data={[
                { value: 'smtp', label: 'SMTP (vd: Gmail)' },
                { value: 'resend', label: 'Resend' },
              ]}
              required
              {...form.getInputProps('provider')}
            />

            {/* --- Thông tin chung --- */}
            <TextInput
              required
              label="Email người gửi"
              description="Địa chỉ email sẽ hiển thị ở phần 'From'"
              placeholder="your-email@example.com"
              {...form.getInputProps('sender_email')}
            />

            {/* --- Cấu hình SMTP (Hiển thị có điều kiện) --- */}
            {form.values.provider === 'smtp' && (
              <Box mt="md" p="md" style={(theme) => ({ border: `1px solid ${theme.colors.gray[3]}`, borderRadius: theme.radius.sm })}>
                <Text fw={500} mb="xs">Cấu hình SMTP</Text>
                <Stack>
                   <Alert color="blue" title="Lưu ý quan trọng (SMTP)" icon={<IconInfoCircle />}>
                    <Text size="sm">
                      Nếu dùng Gmail, mật khẩu ứng dụng (App Password) phải được cấu hình dưới dạng Secret trong mục <b>Project Settings &gt; Edge Functions</b> với tên `GMAIL_APP_PASSWORD`.
                    </Text>
                  </Alert>
                  <TextInput
                    required
                    label="SMTP Host"
                    placeholder="smtp.gmail.com"
                    {...form.getInputProps('smtp_host')}
                  />
                  <NumberInput
                    required
                    label="SMTP Port"
                    placeholder="587"
                    {...form.getInputProps('smtp_port')}
                  />
                </Stack>
              </Box>
            )}

            {/* --- Thông báo cho Resend (Hiển thị có điều kiện) --- */}
            {form.values.provider === 'resend' && (
              <Alert color="blue" title="Cấu hình Resend" icon={<IconInfoCircle />} mt="md">
                <Text size="sm">
                  Khóa API Resend phải được cấu hình dưới dạng Secret trong mục <b>Project Settings &gt; Edge Functions</b> với tên `RESEND_API_KEY`.
                </Text>
              </Alert>
            )}

            <Button type="submit" mt="xl" loading={loading} style={{ alignSelf: 'flex-end' }}>
              Lưu Cấu hình
            </Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
}