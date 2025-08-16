import { Stack, Image, Group, Title, Badge, Text, Button, ActionIcon } from '@mantine/core';
import { IconCalendar, IconMapPin } from '@tabler/icons-react';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { supabase } from '../../../services/supabaseClient';
import type { Event } from '../../../types';
import { formatDateRange } from '../../../utils/formatters'

interface EventDetailsTabProps {
  event: Event;
  onEdit: (event: Event) => void;
  onSuccess: () => void;
  onClose: () => void;
  canEdit: boolean;
}

export function EventDetailsTab({ event, onEdit, onSuccess, onClose, canEdit }: EventDetailsTabProps) {
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
    <Stack justify="space-between" h="calc(95vh - 100px)">
      <Stack>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            margin: '16px 0'
          }}
        >
          <Image
            src={event.cover_image_url}
            radius="md"
            style={{
              maxHeight: '350px',
              maxWidth: '100%',
              height: 'auto',
              width: 'auto',
              objectFit: 'contain' // giữ nguyên tỉ lệ, không cắt
            }}
          />
        </div>

        <Group justify="space-between">
          <Title order={3}
            style={{
              fontFamily: 'BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
              color: '#008a87',
              fontSize: '1.5rem',
              fontWeight: 700,
            }}
          >{event.title}</Title>
          <Badge size="lg" color={event.is_active ? 'green' : 'gray'}>{event.is_active ? 'Đang hoạt động' : 'Đã ẩn'}</Badge>
        </Group>

        <Group align="center" wrap="nowrap">
          <ActionIcon variant="gradient" gradient={{ deg: 45, from: '#088e8b', to: '#33b8b4' }} size="lg">
            <IconCalendar size={18} />
          </ActionIcon>
          <div>
            <Text fw={500}>Thời gian diễn ra</Text>
            <Text size="sm" c="dimmed">
              {formatDateRange(event.start_time, event.end_time)}
            </Text>
          </div>
        </Group>

        <Group align="center" wrap="nowrap">
          <ActionIcon variant="gradient" gradient={{ deg: 45, from: '#088e8b', to: '#33b8b4' }} size="lg">
            <IconMapPin size={18} />
          </ActionIcon>
          <div>
            <Text fw={500}>Địa điểm</Text>
            <Text size="sm" c="dimmed">{event.location}</Text>
          </div>
        </Group>

        <Text size="sl" my="0px" dangerouslySetInnerHTML={{ __html: event.description || 'Chưa có mô tả' }} />
      </Stack>
{ canEdit && (
      <Group justify="flex-end" gap="sm">
        <Button variant="default" onClick={() => onEdit(event)}>Sửa</Button>
        <Button color="red" onClick={handleDelete}>Xóa</Button>
      </Group>
)}
    </Stack>
  );
}