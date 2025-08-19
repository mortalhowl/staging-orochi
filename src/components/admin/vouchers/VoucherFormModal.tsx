import { Modal, Button, Stack, TextInput, Select, NumberInput, Switch } from '@mantine/core';
import { DateTimePicker } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabaseClient';
import type { Voucher } from '../../../types';

interface VoucherFormModalProps {
  opened: boolean;
  onClose: () => void;
  onSuccess: () => void;
  voucherToEdit?: Voucher | null;
}

export function VoucherFormModal({ opened, onClose, onSuccess, voucherToEdit }: VoucherFormModalProps) {
  const [loading, setLoading] = useState(false);
  const isEditing = !!voucherToEdit;

  const form = useForm({
    initialValues: {
      code: '',
      discount_type: 'fixed' as 'fixed' | 'percentage',
      discount_value: 0,
      max_discount_amount: null as number | null,
      min_order_amount: 0,
      usage_limit: 1,
      valid_from: new Date(),
      valid_until: new Date(),
      is_active: true,
      event_id: null as string | null,
    },
    validate: {
      code: (val) => (val.trim().length > 0 ? null : 'Mã không được trống'),
      discount_value: (val) => (val > 0 ? null : 'Giá trị phải lớn hơn 0'),
      // SỬA LỖI VALIDATION: Luôn tạo đối tượng Date mới để so sánh an toàn
      valid_until: (val, values) =>
        (new Date(val) > new Date(values.valid_from) ? null : 'Ngày hết hạn phải sau ngày bắt đầu'),
    },
  });

  useEffect(() => {
    if (opened) {
      if (isEditing && voucherToEdit) {
        form.setValues({
          ...voucherToEdit,
          valid_from: new Date(voucherToEdit.valid_from),
          valid_until: new Date(voucherToEdit.valid_until),
        });
      } else {
        form.reset();
      }
    }
  }, [opened, voucherToEdit]);

  const handleSubmit = async (values: typeof form.values) => {
    setLoading(true);
    try {
      // SỬA LỖI toISOString: Luôn tạo đối tượng Date mới trước khi chuyển đổi
      const submissionData = {
        ...values,
        valid_from: new Date(values.valid_from).toISOString(),
        valid_until: new Date(values.valid_until).toISOString(),
        max_discount_amount: values.discount_type === 'percentage' ? values.max_discount_amount : null,
      };

      if (isEditing) {
        const { error } = await supabase.from('vouchers').update(submissionData).eq('id', voucherToEdit.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('vouchers').insert([submissionData]);
        if (error) throw error;
      }
      notifications.show({ title: 'Thành công', message: 'Đã lưu voucher.' });
      onSuccess();
      onClose();
    } catch (err: any) {
      notifications.show({ title: 'Lỗi', message: err.message, color: 'red' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title={isEditing ? 'Sửa Voucher' : 'Tạo Voucher mới'} size="lg">
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <TextInput
            required
            label="Mã Voucher"
            {...form.getInputProps('code')}
            onChange={(e) => {
              const value = e.currentTarget.value
                .toUpperCase()        // ép in hoa
                .replace(/\s+/g, "") // loại bỏ tất cả khoảng trắng
                .replace(/[^A-Z0-9-_!@#$%^&*]/g, "")
              form.setFieldValue('code', value);
            }}
          />

          <Select
            label="Loại giảm giá"
            data={[{ value: 'fixed', label: 'Số tiền cố định' }, { value: 'percentage', label: 'Phần trăm' }]}
            {...form.getInputProps('discount_type')}
          />
          <NumberInput required label="Giá trị giảm" {...form.getInputProps('discount_value')} />
          {form.values.discount_type === 'percentage' && (
            <NumberInput label="Giảm tối đa (VNĐ)" {...form.getInputProps('max_discount_amount')} />
          )}
          <NumberInput label="Đơn hàng tối thiểu (VNĐ)" {...form.getInputProps('min_order_amount')} />
          <NumberInput required label="Tổng lượt sử dụng" {...form.getInputProps('usage_limit')} />
          <DateTimePicker required label="Bắt đầu hiệu lực" {...form.getInputProps('valid_from')} />
          <DateTimePicker required label="Hết hạn" {...form.getInputProps('valid_until')} />
          <Switch label="Kích hoạt" {...form.getInputProps('is_active', { type: 'checkbox' })} />
          <Button type="submit" loading={loading} mt="md">Lưu</Button>
        </Stack>
      </form>
    </Modal>
  );
}
