import { useEffect, useState } from 'react';
import { Paper, Title, TextInput, Button, Stack, NumberInput, Alert, Text } from '@mantine/core';
import { useForm } from '@mantine/form';
import { supabase } from '../../services/supabaseClient';
import { notifications } from '@mantine/notifications';
import { useDisclosure } from '@mantine/hooks';
import { IconInfoCircle } from '@tabler/icons-react';

interface EmailConfigForm {
  sender_email: string;
  smtp_host: string;
  smtp_port: number;
}

export function EmailConfigPage() {
  const [loading, { open: startLoading, close: endLoading }] = useDisclosure(false);
  const [configId, setConfigId] = useState<string | null>(null);

  const form = useForm<EmailConfigForm>({
    initialValues: {
      sender_email: '',
      smtp_host: 'smtp.gmail.com',
      smtp_port: 587,
    },
    validate: {
      sender_email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Email không hợp lệ'),
      smtp_host: (value) => (value.trim().length > 0 ? null : 'SMTP host không được trống'),
      smtp_port: (value) => (value > 0 ? null : 'Port không hợp lệ'),
    },
  });

  useEffect(() => {
    const fetchConfig = async () => {
      const { data, error } = await supabase.from('email_configs').select('*').limit(1);

      if (error) {
        console.error('Error fetching email config:', error);
        return;
      }
      
      if (data && data.length > 0) {
        const config = data[0];
        form.setValues(config);
        setConfigId(config.id);
      }
    };
    fetchConfig();
  }, []);

  const handleSubmit = async (values: EmailConfigForm) => {
    startLoading();
    try {
      let error;
      if (configId) {
        // Cập nhật cấu hình đã có
        ({ error } = await supabase.from('email_configs').update(values).eq('id', configId));
      } else {
        // Tạo cấu hình mới và lấy lại ID
        const { data, error: insertError } = await supabase
          .from('email_configs')
          .insert([values])
          .select()
          .single();

        error = insertError;
        if (data) {
          setConfigId(data.id);
        }
      }
      if (error) throw error;
      notifications.show({ title: 'Thành công', message: 'Đã lưu cấu hình email.', color: 'green' });
    } catch (err: any) {
      notifications.show({ title: 'Lỗi', message: err.message, color: 'red' });
    } finally {
      endLoading();
    }
  };

  return (
    <Paper withBorder p="xl" radius="md" maw={600} mx="auto">
      <Title order={3} mb="lg">Cấu hình Gửi Email (SMTP)</Title>
      
      <Alert color="blue" title="Lưu ý quan trọng" icon={<IconInfoCircle />} mb="xl">
        <Text size="sm">
          Mật khẩu ứng dụng Gmail (App Password) phải được cấu hình dưới dạng Secret trong mục <b>Project Settings &gt; Edge Functions</b> bởi lập trình viên để đảm bảo an toàn.
        </Text>
      </Alert>

      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <TextInput required label="Email người gửi" placeholder="your-email@gmail.com" {...form.getInputProps('sender_email')} />
          <TextInput required label="SMTP Host" {...form.getInputProps('smtp_host')} />
          <NumberInput required label="SMTP Port" {...form.getInputProps('smtp_port')} />
          <Button type="submit" mt="md" loading={loading}>
            Lưu Cấu hình
          </Button>
        </Stack>
      </form>
    </Paper>
  );
}