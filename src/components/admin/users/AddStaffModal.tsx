import { Modal, Button, Stack, TextInput, PasswordInput } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useState } from 'react';
import { supabase } from '../../../services/supabaseClient';

interface AddStaffModalProps {
  opened: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddStaffModal({ opened, onClose, onSuccess }: AddStaffModalProps) {
  const [loading, setLoading] = useState(false);
  const form = useForm({
    initialValues: {
      fullName: '',
      email: '',
      password: '',
    },
    validate: {
      fullName: (value) => (value.trim().length > 0 ? null : 'Họ tên không được trống'),
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Email không hợp lệ'),
      password: (value) => (value.length >= 6 ? null : 'Mật khẩu phải có ít nhất 6 ký tự'),
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('create-staff-user', {
        body: values,
      });
      if (error) throw error;
      notifications.show({ title: 'Thành công', message: 'Đã tạo tài khoản nhân viên mới.', color: 'green' });
      onSuccess();
      onClose();
      form.reset();
    } catch (err: any) {
      notifications.show({ title: 'Thất bại', message: err.message, color: 'red' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Tạo tài khoản Nhân viên mới" centered>
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <TextInput required label="Họ và tên" {...form.getInputProps('fullName')} />
          <TextInput required label="Email" {...form.getInputProps('email')} />
          <PasswordInput required label="Mật khẩu" {...form.getInputProps('password')} />
          <Button type="submit" mt="md" loading={loading}>Tạo tài khoản</Button>
        </Stack>
      </form>
    </Modal>
  );
}
