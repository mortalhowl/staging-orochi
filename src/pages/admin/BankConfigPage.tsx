// src/pages/admin/BankConfigPage.tsx
import { useEffect, useState } from 'react';
import { Paper, Title, TextInput, Button, Stack, Select } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useDisclosure } from '@mantine/hooks';
import { BANK_LIST } from '../../constants/banks';
import { SettingsApi } from '../../services/api/settings'; // <-- 1. IMPORT SERVICE MỚI

interface BankConfigForm {
  id?: string;
  bank_bin: string;
  bank_name: string;
  account_name: string;
  account_number: string;
  qr_template: string;
}

export function BankConfigPage() {
  const [loading, { open: startLoading, close: endLoading }] = useDisclosure(false);
  // Không cần state 'configId' nữa, service sẽ tự xử lý
  // const [configId, setConfigId] = useState<string | null>(null);

  const form = useForm<BankConfigForm>({
    initialValues: { bank_bin: '', bank_name: '', account_name: '', account_number: '', qr_template: 'compact' },
    validate: {
      bank_bin: (value) => (value ? null : 'Vui lòng chọn một ngân hàng'),
      account_name: (value) => (value.trim().length > 0 ? null : 'Tên chủ tài khoản không được trống'),
      account_number: (value) => (value.trim().length > 0 ? null : 'Số tài khoản không được trống'),
    },
  });

  // <-- 2. TÁI CẤU TRÚC useEffect
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const config = await SettingsApi.getBankConfig();
        if (config) {
          form.setValues(config);
        }
      } catch (error: any) {
        notifications.show({ title: 'Lỗi', message: error.message, color: 'red' });
      }
    };
    fetchConfig();
  }, []); // Mảng rỗng đảm bảo useEffect chỉ chạy một lần

  // <-- 3. TÁI CẤU TRÚC handleSubmit
  const handleSubmit = async (values: BankConfigForm) => {
    startLoading();
    try {
      // Logic `upsert` phức tạp giờ đây chỉ là một dòng gọi service
      await SettingsApi.upsertBankConfig(values);
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