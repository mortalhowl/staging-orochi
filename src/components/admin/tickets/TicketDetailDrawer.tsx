import { useState, useEffect } from 'react';
import { Drawer, Loader, Center, Text, Stack, Group, Image, Paper, Title, Badge, Button, Divider } from '@mantine/core';
import { supabase } from '../../../services/supabaseClient';
import qrcode from 'qrcode';
import { formatDateTime } from '../../../utils/formatters';
import type { FullTicketDetails } from '../../../types'; // Đảm bảo import từ types.ts
import { notifications } from '@mantine/notifications';

interface TicketDetailDrawerProps {
  ticketId: string | null;
  opened: boolean;
  onClose: () => void;
  onSuccess: () => void; // Thêm callback để refresh
}

export function TicketDetailDrawer({ ticketId, opened, onClose, onSuccess }: TicketDetailDrawerProps) {
  const [ticket, setTicket] = useState<FullTicketDetails | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchAndGenerateQr = async () => {
    if (!ticketId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .rpc('search_issued_tickets', { search_term: ticketId })
        .limit(1)
        .single();
      
      if (error) throw error;
      
      setTicket(data as FullTicketDetails);
      const ticketData = data as FullTicketDetails;
      const qrUrl = await qrcode.toDataURL(ticketData.id, { errorCorrectionLevel: 'H', width: 200 });
      setQrCodeUrl(qrUrl);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (opened) {
      fetchAndGenerateQr();
    }
  }, [ticketId, opened]);

  const handleUpdateStatus = async (newStatus: 'active' | 'disabled') => {
    setActionLoading(true);
    try {
        const { error } = await supabase.functions.invoke('update-ticket-status', {
            body: { ticketId, newStatus }
        });
        if (error) throw error;

        notifications.show({
            title: 'Thành công',
            message: `Đã ${newStatus === 'active' ? 'kích hoạt' : 'vô hiệu hóa'} vé thành công.`,
            color: 'green'
        });
        fetchAndGenerateQr(); // Tải lại dữ liệu trong drawer
        onSuccess(); // Báo cho trang cha biết để refresh bảng
    } catch (err: any) {
        notifications.show({ title: 'Lỗi', message: err.message, color: 'red' });
    } finally {
        setActionLoading(false);
    }
  };

  return (
    <Drawer opened={opened} onClose={onClose} title="Chi tiết vé" position="right" size="md">
      {loading && <Center><Loader /></Center>}
      {!loading && ticket && (
        <Stack justify="space-between" h="100%">
          <Stack>
            <Paper withBorder p="xl" radius="md">
              <Stack align="center">
                {qrCodeUrl && <Image src={qrCodeUrl} w={200} h={200} />}
                <Text c="dimmed" size="sm" style={{ wordBreak: 'break-all' }}>Mã vé: {ticket.id}</Text>
              </Stack>
            </Paper>
            <Stack mt="md" gap="xs">
              <Title order={4}>{ticket.event_name}</Title>
              <Text><b>Loại vé:</b> {ticket.ticket_type_name}</Text>
              <Text><b>Khách hàng:</b> {ticket.customer_name}</Text>
              <Text><b>Email:</b> {ticket.customer_email}</Text>
              <Group><Text><b>Nguồn gốc:</b></Text><Badge color={ticket.is_invite ? 'violet' : 'blue'}>{ticket.is_invite ? 'Vé mời' : 'Vé bán'}</Badge></Group>
              <Group><Text><b>Check-in:</b></Text><Badge color={ticket.is_used ? 'green' : 'gray'}>{ticket.is_used ? 'Đã dùng' : 'Chưa dùng'}</Badge></Group>
              <Group><Text><b>Trạng thái vé:</b></Text><Badge color={ticket.status === 'active' ? 'teal' : 'red'}>{ticket.status === 'active' ? 'Hoạt động' : 'Vô hiệu hóa'}</Badge></Group>
              {ticket.is_used && (
                  <Text><b>Thời gian check-in:</b> {formatDateTime(ticket.used_at)} {ticket.checked_in_by_name && ` bởi ${ticket.checked_in_by_name}`}</Text>
              )}
            </Stack>
          </Stack>
          <Stack>
            <Divider my="xs" />
            {ticket.status === 'active' ? (
                <Button color="orange" onClick={() => handleUpdateStatus('disabled')} loading={actionLoading}>Vô hiệu hóa vé</Button>
            ) : (
                <Button color="teal" onClick={() => handleUpdateStatus('active')} loading={actionLoading}>Kích hoạt lại vé</Button>
            )}
          </Stack>
        </Stack>
      )}
    </Drawer>
  );
}
