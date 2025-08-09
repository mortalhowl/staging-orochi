import { useState, useEffect } from 'react';
import { Container, Title, Paper, Loader, Center, Text, Accordion, Stack, Group, Image } from '@mantine/core';
import { supabase } from '../services/supabaseClient';
import { useOutletContext } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
// import qrcode from 'qrcode';
import { formatDateTime } from '../utils/formatters';
import { notifications } from '@mantine/notifications';

// Định nghĩa kiểu dữ liệu cho context và vé
interface AuthContextType { session: Session; }
interface GroupedTicket {
  event_name: string;
  event_start_time: string;
  location: string;
  tickets: {
    id: string;
    ticket_type_name: string;
    qr_code_url: string;
  }[];
}

export function MyTicketsPage() {
  const { session } = useOutletContext<AuthContextType>();
  const [groupedTickets, setGroupedTickets] = useState<GroupedTicket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTickets = async () => {
      if (!session.user) return;

      setLoading(true);
      
      try {
        // SỬA LỖI Ở ĐÂY: Tách thành 2 query riêng biệt
        const selectQuery = `
          id,
          email,
          events ( id, title, start_time, location ),
          ticket_types ( name )
        `;

        // Query 1: Lấy vé mua (qua user_id trong transactions)
        const purchasedTicketsPromise = supabase
          .from('issued_tickets')
          .select(selectQuery)
          .eq('transactions.user_id', session.user.id);

        // Query 2: Lấy vé mời (qua email trực tiếp trong issued_tickets)
        const invitedTicketsPromise = supabase
          .from('issued_tickets')
          .select(selectQuery)
          .eq('email', session.user.email);

        const [purchasedRes, invitedRes] = await Promise.all([purchasedTicketsPromise, invitedTicketsPromise]);

        if (purchasedRes.error) throw purchasedRes.error;
        if (invitedRes.error) throw invitedRes.error;

        // Gộp và loại bỏ các vé trùng lặp
        const allTickets = [...purchasedRes.data, ...invitedRes.data];
        const uniqueTickets = Array.from(new Map(allTickets.map(ticket => [ticket.id, ticket])).values());
        
        // Nhóm các vé theo sự kiện
        const groups: { [key: string]: GroupedTicket } = {};
        for (const ticket of uniqueTickets) {
          const eventInfo = Array.isArray(ticket.events) ? ticket.events[0] : ticket.events;
          const ticketTypeInfo = Array.isArray(ticket.ticket_types) ? ticket.ticket_types[0] : ticket.ticket_types;

          if (!eventInfo) continue;
          
          const eventId = eventInfo.id;
          if (!groups[eventId]) {
            groups[eventId] = {
              event_name: eventInfo.title,
              event_start_time: eventInfo.start_time,
              location: eventInfo.location,
              tickets: [],
            };
          }

          // const qrCodeUrl = await qrcode.toDataURL(ticket.id, { errorCorrectionLevel: 'H' });

          // groups[eventId].tickets.push({
          //   id: ticket.id,
          //   ticket_type_name: ticketTypeInfo?.name || 'N/A',
          //   qr_code_url: qrCodeUrl,
          // });
        }

        setGroupedTickets(Object.values(groups));
      } catch (error: any) {
        console.error("Error fetching tickets:", error);
        notifications.show({ title: 'Lỗi', message: 'Không thể tải danh sách vé của bạn.', color: 'red' });
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, [session.user]);

  if (loading) {
    return <Center h="50vh"><Loader /></Center>;
  }

  return (
    <Container my="xl">
      <Title order={2} mb="xl">Vé của tôi</Title>
      {groupedTickets.length > 0 ? (
        <Accordion variant="separated">
          {groupedTickets.map((group) => (
            <Accordion.Item key={group.event_name} value={group.event_name}>
              <Accordion.Control>
                <Title order={4}>{group.event_name}</Title>
                <Text size="sm" c="dimmed">{formatDateTime(group.event_start_time)}</Text>
              </Accordion.Control>
              <Accordion.Panel>
                <Stack>
                  {group.tickets.map(ticket => (
                    <Paper key={ticket.id} withBorder p="md" radius="md">
                      <Group justify="space-between">
                        <Stack gap="xs">
                          <Text fw={500}>{ticket.ticket_type_name}</Text>
                          <Text size="xs" c="dimmed" style={{ wordBreak: 'break-all' }}>Mã vé: {ticket.id}</Text>
                        </Stack>
                        <Image src={ticket.qr_code_url} w={100} h={100} />
                      </Group>
                    </Paper>
                  ))}
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
      ) : (
        <Text>Bạn chưa có vé nào.</Text>
      )}
    </Container>
  );
}
