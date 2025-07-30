import { Paper, Text, Button, Group } from '@mantine/core';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { IconTrash } from '@tabler/icons-react';
import { supabase } from '../../../services/supabaseClient';

interface EventsToolbarProps {
  selection: string[];
  onSuccess: () => void;
  clearSelection: () => void;
}

export function EventsToolbar({ selection, onSuccess, clearSelection }: EventsToolbarProps) {
  const handleDelete = () => {
    modals.openConfirmModal({
      title: 'Xác nhận xóa',
      centered: true,
      children: (
        <Text size="sm">
          Bạn có chắc muốn xóa <b>{selection.length}</b> sự kiện đã chọn?
        </Text>
      ),
      labels: { confirm: 'Xóa', cancel: 'Hủy' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        const { error } = await supabase.from('events').delete().in('id', selection);
        if (error) {
          notifications.show({ title: 'Lỗi', message: 'Xóa hàng loạt thất bại', color: 'red' });
        } else {
          notifications.show({ title: 'Thành công', message: `Đã xóa ${selection.length} sự kiện.`, color: 'green' });
          clearSelection();
          onSuccess();
        }
      },
    });
  };

  return (
    <Paper withBorder p="sm" radius="md" shadow="sm" mb="md">
      <Group justify="space-between">
        <Text fw={500}>{selection.length} mục đã được chọn</Text>
        <Button color="red" leftSection={<IconTrash size={16} />} onClick={handleDelete}>
          Xóa
        </Button>
      </Group>
    </Paper>
  );
}