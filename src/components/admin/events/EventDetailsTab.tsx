import { Stack, Image, Group, Title, Badge, Divider, Text, Button } from '@mantine/core';
import { IconCalendar, IconMapPin } from '@tabler/icons-react';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { supabase } from '../../../services/supabaseClient';
import type { Event } from '../../../types';
import {formatDate} from '../../../utils/FormatDate'

interface EventDetailsTabProps {
  event: Event;
  onEdit: (event: Event) => void;
  onSuccess: () => void;
  onClose: () => void;
}

export function EventDetailsTab({ event, onEdit, onSuccess, onClose }: EventDetailsTabProps) {
      const handleDelete = () => {
        if (!event) return;

        modals.openConfirmModal({
            title: 'Xác nhận xóa sự kiện',
            centered: true,
            children: (
                <Text size="sm">
                    Bạn có chắc chắn muốn xóa sự kiện "<b>{event.title}</b>"? Hành động này không thể hoàn tác.
                </Text>
            ),
            labels: { confirm: 'Xóa', cancel: 'Hủy bỏ' },
            confirmProps: { color: 'red' },
            onConfirm: async () => {
                const { error } = await supabase.from('events').delete().eq('id', event.id);

                if (error) {
                    notifications.show({ title: 'Lỗi', message: 'Xóa sự kiện thất bại.', color: 'red' });
                } else {
                    notifications.show({ title: 'Thành công', message: 'Đã xóa sự kiện.', color: 'green' });
                    onSuccess(); // Refresh lại bảng
                    onClose(); // Đóng drawer
                }
            },
        });
    };


  return (
    <Stack justify="space-between" h="calc(100vh - 150px)">
      <Stack>
        <Image radius="md" src={event.cover_image_url || '...'} alt="Ảnh bìa" h={200} />
        <Group justify="space-between">
          <Title order={3}>{event.title}</Title>
          <Badge size="lg" color={event.is_active ? 'green' : 'gray'}>{event.is_active ? 'Đang hoạt động' : 'Đã ẩn'}</Badge>
        </Group>
        <Divider my="sm" />
        <Group><IconCalendar size={20} /><Text>{formatDate(event.start_time)} - {formatDate(event.end_time)}</Text></Group>
        <Group><IconMapPin size={20} /><Text>{event.location || 'Chưa có địa điểm'}</Text></Group>
        <Divider my="sm" />
        <Text c="dimmed" size="sm">Mô tả:</Text>
        <Text>{event.description || 'Chưa có mô tả'}</Text>
      </Stack>
      <Group grow>
        <Button variant="default" onClick={() => onEdit(event)}>Sửa thông tin</Button>
        <Button color="red" onClick={handleDelete}>Xóa sự kiện</Button>
      </Group>
    </Stack>
  );
}