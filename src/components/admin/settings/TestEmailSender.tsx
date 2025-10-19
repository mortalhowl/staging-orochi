// src/components/admin/settings/TestEmailSender.tsx
import { useState } from 'react';
import { Paper, Title, TextInput, Button, Stack } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconMailForward } from '@tabler/icons-react';
import { supabase } from '../../../services/supabaseClient'; //
import { getSupabaseFnError } from '../../../utils/supabaseFnError'; //

export function TestEmailSender() {
  const [loading, setLoading] = useState(false);
  const form = useForm({
    initialValues: {
      recipientEmail: '',
    },
    validate: {
      recipientEmail: (value) => (/^\S+@\S+$/.test(value) ? null : 'Email không hợp lệ'),
    },
  });

  const handleSendTestEmail = async (values: typeof form.values) => {
    setLoading(true);
    try {
      // *** LƯU Ý: Function 'send-test-email' chưa tồn tại.
      // Chúng ta sẽ tạo nó ở bước sau.
      const { error } = await supabase.functions.invoke('send-test-email', {
        body: { recipientEmail: values.recipientEmail },
      });

      if (error) {
        const message = await getSupabaseFnError(error); //
        throw new Error(message);
      }

      notifications.show({
        title: 'Thành công',
        message: `Đã gửi email test đến ${values.recipientEmail}. Vui lòng kiểm tra hộp thư.`,
        color: 'green',
      });
      form.reset(); // Xóa email sau khi gửi thành công
    } catch (err: any) {
      notifications.show({
        title: 'Thất bại',
        message: err.message || 'Không thể gửi email test.',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper withBorder p="md" radius="md" mt="md">
      <form onSubmit={form.onSubmit(handleSendTestEmail)}>
        <Stack>
          <Title order={5}>Kiểm tra Gửi Email</Title>
          <TextInput
            required
            label="Gửi đến Email"
            placeholder="recipient@example.com"
            {...form.getInputProps('recipientEmail')}
          />
          <Button
            type="submit"
            loading={loading}
            leftSection={<IconMailForward size={16} />}
            style={{ alignSelf: 'flex-end' }}
          >
            Gửi Email Test
          </Button>
        </Stack>
      </form>
    </Paper>
  );
}