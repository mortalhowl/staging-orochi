import { Drawer, LoadingOverlay, Title, Tabs, rem } from '@mantine/core';
import { useEffect, useState } from 'react';
import type { Event } from '../../../types';
import { supabase } from '../../../services/supabaseClient';
import { notifications } from '@mantine/notifications';
import { IconInfoCircle, IconTicket } from '@tabler/icons-react';
import { EventDetailsTab } from './EventDetailsTab'
import { TicketTypeList } from './TicketTypeList'; 

interface EventDetailDrawerProps {
  eventId: string | null;
  opened: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onEdit: (event: Event) => void;
  refreshKey: number;
}

export function EventDetailDrawer({ eventId, opened, onClose, onSuccess, onEdit, refreshKey }: EventDetailDrawerProps) {
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchEventDetail = async () => {
      if (!eventId) return;
      setLoading(true);
      try {
        const { data, error } = await supabase.from('events').select('*').eq('id', eventId).single();
        if (error) throw error;
        setEvent(data);
      } catch (err: any) {
        notifications.show({ title: 'Lỗi', message: 'Không thể lấy dữ liệu chi tiết của sự kiện.', color: 'red' });
      } finally {
        setLoading(false);
      }
    };
    if (opened) {
      fetchEventDetail();
    }
  }, [eventId, refreshKey, opened]);

  return (
    <Drawer opened={opened} onClose={onClose} title="Chi tiết" position="right" size="lg">
      <LoadingOverlay visible={loading} />
      {event && (
        <Tabs defaultValue="details">
          <Tabs.List>
            <Tabs.Tab value="details" leftSection={<IconInfoCircle style={{ width: rem(16), height: rem(16) }} />}>
              Chi tiết
            </Tabs.Tab>
            <Tabs.Tab value="tickets" leftSection={<IconTicket style={{ width: rem(16), height: rem(16) }} />}>
              Các loại vé
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="details" pt="xs">
            <EventDetailsTab event={event} onEdit={onEdit} onSuccess={onSuccess} onClose={onClose} />
          </Tabs.Panel>

          <Tabs.Panel value="tickets" pt="xs">
            <TicketTypeList eventId={event.id} />
          </Tabs.Panel>
        </Tabs>
      )}
    </Drawer>
  );
}