import { Stack, Image, Group, Title, Badge, Divider, Text, Button, ActionIcon } from '@mantine/core';
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
        <Divider />
        {/* <Group wrap='nowrap'><IconCalendar size={20} /><Text>{formatDate(event.start_time)} - {formatDate(event.end_time)}</Text></Group> */}
        {/* <Group wrap='nowrap'><IconMapPin size={20} /><Text>{event.location || 'Chưa có địa điểm'}</Text></Group> */}

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

        <Divider />
        {/* <Text c="dimmed" size="sm" fw="600">Mô tả:</Text> */}
        <Text>{event.description || 'Chưa có mô tả'}</Text>
      </Stack>
      <Group justify="flex-end" gap="sm">
        <Button variant="default" onClick={() => onEdit(event)}>Sửa thông tin</Button>
        <Button color="red" onClick={handleDelete}>Xóa sự kiện</Button>
      </Group>
    </Stack>
  );
}