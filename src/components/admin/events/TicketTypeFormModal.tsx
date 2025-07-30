import { Modal, TextInput, NumberInput, Textarea, Button, Stack, Checkbox, Select } from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabaseClient';
import type { TicketType, TicketStatus } from '../../../types';

interface TicketTypeFormModalProps {
  opened: boolean;
  onClose: () => void;
  onSuccess: () => void;
  eventId: string;
  ticketTypeToEdit?: TicketType | null;
}

export function TicketTypeFormModal({ opened, onClose, onSuccess, eventId, ticketTypeToEdit }: TicketTypeFormModalProps) {
  const [loading, setLoading] = useState(false);
  const isEditing = !!ticketTypeToEdit;
  const [isUnlimited, setIsUnlimited] = useState(isEditing ? ticketTypeToEdit.quantity_total === null : true);

  const form = useForm({
    initialValues: {
      name: '',
      price: 0,
      quantity_total: 100,
      description: '',
      status: 'public' as TicketStatus,
    },
        validate: {
      name: (val) => (val.trim().length > 0 ? null : 'Tên vé không được trống'),
      price: (val) => (val >= 0 ? null : 'Giá không hợp lệ'),
      quantity_total: (val) => (val > 0 ? null : 'Số lượng phải lớn hơn 0'),
    },
  });

  useEffect(() => {
    if (isEditing && ticketTypeToEdit) {
      form.setValues({
        name: ticketTypeToEdit.name,
        price: ticketTypeToEdit.price,
        quantity_total: ticketTypeToEdit.quantity_total || 100,
        description: ticketTypeToEdit.description || '',
        status: ticketTypeToEdit.status,
      });
      setIsUnlimited(ticketTypeToEdit.quantity_total === null);
    } else {
      form.reset();
      setIsUnlimited(true);
    }
  }, [ticketTypeToEdit, opened]);

  const handleSubmit = async (values: typeof form.values) => {
    setLoading(true);
    const submissionData = {
      ...values,
      quantity_total: isUnlimited ? null : values.quantity_total,
      event_id: eventId,
    };

    try {
      if (isEditing) {
        const { error } = await supabase.from('ticket_types').update(submissionData).eq('id', ticketTypeToEdit.id);
        if (error) throw error;
        notifications.show({ title: 'Thành công', message: 'Cập nhật loại vé thành công.' });
      } else {
        const { error } = await supabase.from('ticket_types').insert([submissionData]);
        if (error) throw error;
        notifications.show({ title: 'Thành công', message: 'Đã tạo loại vé mới.' });
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      notifications.show({ title: 'Lỗi', message: err.message, color: 'red' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title={isEditing ? 'Sửa loại vé' : 'Thêm loại vé mới'}>
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <TextInput required label="Tên loại vé" {...form.getInputProps('name')} />
          <Select
            label="Trạng thái"
            data={[
              { value: 'public', label: 'Công khai' },
              { value: 'hidden', label: 'Ẩn' },
              { value: 'invited', label: 'Vé mời' },
            ]}
            required
            {...form.getInputProps('status')}
          />
          <NumberInput required label="Giá vé (VNĐ)" min={0} step={10000} {...form.getInputProps('price')} />
          <Checkbox
            label="Không giới hạn số lượng"
            checked={isUnlimited}
            onChange={(event) => setIsUnlimited(event.currentTarget.checked)}
            mt="sm"
          />
          <NumberInput disabled={isUnlimited} required label="Tổng số lượng vé" min={1} {...form.getInputProps('quantity_total')} />
          <Textarea label="Mô tả" {...form.getInputProps('description')} />
          <Button type="submit" loading={loading} mt="md">Lưu</Button>
        </Stack>
      </form>
    </Modal>
  );
}