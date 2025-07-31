import { useEffect, useState } from 'react';
import { Paper, Title, TextInput, Button, Stack, Select } from '@mantine/core';
import { useForm } from '@mantine/form';
import { supabase } from '../../services/supabaseClient';
import { notifications } from '@mantine/notifications';
import { useDisclosure } from '@mantine/hooks';
import { BANK_LIST } from '../../constants/banks';

interface BankConfigForm {
  bank_bin: string;
  bank_name: string;
  account_name: string;
  account_number: string;
  qr_template: string;
}

export function BankConfigPage() {
  const [loading, { open: startLoading, close: endLoading }] = useDisclosure(false);
  const [configId, setConfigId] = useState<string | null>(null);

  const form = useForm<BankConfigForm>({
    initialValues: { bank_bin: '', bank_name: '', account_name: '', account_number: '', qr_template: 'compact' },
    validate: {
      bank_bin: (value) => (value ? null : 'Vui lòng chọn một ngân hàng'),
      account_name: (value) => (value.trim().length > 0 ? null : 'Tên chủ tài khoản không được trống'),
      account_number: (value) => (value.trim().length > 0 ? null : 'Số tài khoản không được trống'),
    },
  });

  useEffect(() => {
    const fetchConfig = async () => {
      const { data, error } = await supabase.from('bank_configs').select('*').limit(1);
      if (error) {
        console.error('Error fetching bank config:', error);
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

  const handleSubmit = async (values: BankConfigForm) => {
    startLoading();
    try {
      let error;
      if (configId) {
        // Nếu đã có ID, chỉ cần CẬP NHẬT
        ({ error } = await supabase.from('bank_configs').update(values).eq('id', configId));
      } else {
        // Nếu chưa có ID, TẠO MỚI và lấy lại bản ghi vừa tạo để có ID
        const { data, error: insertError } = await supabase
          .from('bank_configs')
          .insert([values])
          .select()
          .single(); // Lấy về bản ghi duy nhất vừa tạo

        error = insertError;
        if (data) {
          // CẬP NHẬT STATE NGAY LẬP TỨC
          setConfigId(data.id);
        }
      }
      if (error) throw error;
      notifications.show({ title: 'Thành công', message: 'Đã lưu cấu hình ngân hàng.', color: 'green' });
    } catch (err: any) {
      notifications.show({ title: 'Lỗi', message: err.message, color: 'red' });
    } finally {
      endLoading();
    }
  };

  return (
    <Paper withBorder p="xl" radius="md" maw={600} mx="auto">
      <Title order={3} mb="lg">Cấu hình Ngân hàng (VietQR)</Title>
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <Select
            label="Ngân hàng"
            placeholder="Chọn ngân hàng của bạn"
            data={BANK_LIST}
            searchable
            required
            onChange={(value) => {
              const selectedBank = BANK_LIST.find(bank => bank.value === value);
              form.setFieldValue('bank_bin', value || '');
              form.setFieldValue('bank_name', selectedBank?.label || '');
            }}
            value={form.values.bank_bin}
          />
          <TextInput required label="Tên chủ tài khoản" placeholder="Tên in trên thẻ" {...form.getInputProps('account_name')} />
          <TextInput required label="Số tài khoản" placeholder="Nhập số tài khoản" {...form.getInputProps('account_number')} />
          <Select
            label="Mẫu VietQR"
            data={[
              { value: 'compact', label: 'Compact' },
              { value: 'compact2', label: 'Compact 2' },
              { value: 'qr_only', label: 'Chỉ mã QR' },
            ]}
            required
            {...form.getInputProps('qr_template')}
          />
          <Button type="submit" mt="md" loading={loading}>
            Lưu Cấu hình
          </Button>
        </Stack>
      </form>
    </Paper>
  );
}