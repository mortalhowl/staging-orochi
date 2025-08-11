import { useState, useEffect } from 'react';
import { Container, Title, Paper, Loader, Center, Text, Accordion, Stack, Group, Image, Tabs, Table, Badge } from '@mantine/core';
import { supabase } from '../services/supabaseClient';
import { useOutletContext, useNavigate } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import qrcode from 'qrcode';
import { formatDateTime } from '../utils/formatters';
import { notifications } from '@mantine/notifications';
import { IconTicket, IconHistory } from '@tabler/icons-react';

// --- TYPE DEFINITIONS ---
interface AuthContextType { session: Session; }

interface UserTicket {
  event_id: string;
  event_name: string;
  event_start_time: string;
  location: string;
  ticket_id: string;
  ticket_type_name: string;
}

interface GroupedTickets {
  [eventId: string]: {
    eventName: string;
    eventStartTime: string;
    tickets: {
      id: string;
      typeName: string;
      qrCodeUrl: string;
    }[];
  };
}

interface TransactionHistoryItem {
  id: string;
  total_amount: number;
  status: string;
  type: 'sale' | 'invitation';
  created_at: string;
  event_name: string;
}

// --- CHILD COMPONENTS FOR TABS ---

// Component con cho Tab "Vé của tôi"
function MyTicketsTab({ session }: { session: Session }) {
  const [groupedTickets, setGroupedTickets] = useState<GroupedTickets>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAndProcessTickets = async () => {
      if (!session.user) return;
      setLoading(true);

      try {
        const { data, error } = await supabase.rpc('get_user_tickets_detailed', {
          p_user_id: session.user.id,
        });

        if (error) throw error;
        
        const ticketsData = data as UserTicket[];
        const groups: GroupedTickets = {};

        for (const ticket of ticketsData) {
          if (!groups[ticket.event_id]) {
            groups[ticket.event_id] = {
              eventName: ticket.event_name,
              eventStartTime: ticket.event_start_time,
              tickets: [],
            };
          }
          
          const qrCodeUrl = await qrcode.toDataURL(ticket.ticket_id, { errorCorrectionLevel: 'H' });
          
          groups[ticket.event_id].tickets.push({
            id: ticket.ticket_id,
            typeName: ticket.ticket_type_name,
            qrCodeUrl: qrCodeUrl,
          });
        }

        setGroupedTickets(groups);
      } catch (error: any) {
        console.error("Error fetching tickets:", error);
        notifications.show({ title: 'Lỗi', message: 'Không thể tải danh sách vé của bạn.', color: 'red' });
      } finally {
        setLoading(false);
      }
    };

    fetchAndProcessTickets();
  }, [session.user]);

  if (loading) {
    return <Center p="xl"><Loader /></Center>;
  }

  return Object.keys(groupedTickets).length > 0 ? (
    <Accordion variant="separated">
      {Object.entries(groupedTickets).map(([eventId, group]) => (
        <Accordion.Item key={eventId} value={group.eventName}>
          <Accordion.Control>
            <Title order={4}>{group.eventName}</Title>
            <Text size="sm" c="dimmed">{formatDateTime(group.eventStartTime)}</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack>
              {group.tickets.map(ticket => (
                <Paper key={ticket.id} withBorder p="md" radius="md">
                  <Group justify="space-between">
                    <Stack gap="xs">
                      <Text fw={500}>{ticket.typeName}</Text>
                      <Text size="xs" c="dimmed" style={{ wordBreak: 'break-all' }}>Mã vé: {ticket.id}</Text>
                    </Stack>
                    <Image src={ticket.qrCodeUrl} w={100} h={100} alt={`QR Code for ticket ${ticket.id}`} />
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
  );
}

// Component con cho Tab "Lịch sử Giao dịch"
function TransactionHistoryTab({ session }: { session: Session }) {
  const [transactions, setTransactions] = useState<TransactionHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchHistory = async () => {
      if (!session.user) return;
      setLoading(true);
      try {
        const { data, error } = await supabase.rpc('get_user_transactions', { p_user_id: session.user.id });
        if (error) throw error;
        setTransactions(data as TransactionHistoryItem[]);
      } catch (err: any) {
        notifications.show({ title: 'Lỗi', message: 'Không thể tải lịch sử giao dịch.', color: 'red' });
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [session.user]);

  if (loading) return <Center p="xl"><Loader /></Center>;
  
  const statusMapping: { [key: string]: { label: string; color: string } } = {
    pending: { label: 'Chờ thanh toán', color: 'yellow' },
    paid: { label: 'Thành công', color: 'green' },
    failed: { label: 'Thất bại', color: 'red' },
    expired: { label: 'Hết hạn', color: 'gray' },
  };

  const rows = transactions.map((trans) => (
    <Table.Tr 
      key={trans.id} 
      onClick={() => {
        if (trans.status === 'pending') navigate(`/payment/${trans.id}`);
      }}
      style={{ cursor: trans.status === 'pending' ? 'pointer' : 'default' }}
    >
      <Table.Td>{trans.id.split('-')[0].toUpperCase()}</Table.Td>
      <Table.Td>{trans.event_name}</Table.Td>
      <Table.Td>{formatDateTime(trans.created_at)}</Table.Td>
      <Table.Td>{trans.total_amount > 0 ? `${trans.total_amount.toLocaleString('vi-VN')}đ` : 'Miễn phí'}</Table.Td>
      <Table.Td>
        <Badge color={statusMapping[trans.status]?.color || 'gray'}>
          {statusMapping[trans.status]?.label || trans.status}
        </Badge>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <Table striped highlightOnHover withTableBorder>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Mã GD</Table.Th>
          <Table.Th>Sự kiện</Table.Th>
          <Table.Th>Ngày tạo</Table.Th>
          <Table.Th>Tổng tiền</Table.Th>
          <Table.Th>Trạng thái</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {rows.length > 0 ? rows : <Table.Tr><Table.Td colSpan={5} align="center">Bạn chưa có giao dịch nào.</Table.Td></Table.Tr>}
      </Table.Tbody>
    </Table>
  );
}

// --- MAIN PAGE COMPONENT ---

export function MyTicketsPage() {
  const { session } = useOutletContext<AuthContextType>();

  return (
    <Container my="xl">
      <Title order={2} mb="xl">Tài khoản của tôi</Title>
      <Tabs defaultValue="tickets" variant="pills">
        <Tabs.List>
          <Tabs.Tab value="tickets" leftSection={<IconTicket size={16}/>}>Vé của tôi</Tabs.Tab>
          <Tabs.Tab value="history" leftSection={<IconHistory size={16}/>}>Lịch sử giao dịch</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="tickets" pt="md">
          <MyTicketsTab session={session} />
        </Tabs.Panel>

        <Tabs.Panel value="history" pt="md">
          <TransactionHistoryTab session={session} />
        </Tabs.Panel>
      </Tabs>
    </Container>
  );
}
