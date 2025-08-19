import { useState, useEffect } from 'react';
import { 
  Container, Title, Paper, Loader, Center, Text, Accordion, 
  Stack, Group, Image, Tabs, Table, Badge,  
  ScrollArea, useMantineTheme, SimpleGrid 
} from '@mantine/core';
import { supabase } from '../services/supabaseClient';
import { useOutletContext, useNavigate } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import qrcode from 'qrcode';
import { formatDateTime } from '../utils/formatters';
import { notifications } from '@mantine/notifications';
import { IconTicket, IconHistory, IconCalendar, IconMapPin, IconQrcode } from '@tabler/icons-react';

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
    location: string;
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
  const theme = useMantineTheme();
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
              location: ticket.location,
              tickets: [],
            };
          }
          
          const qrCodeUrl = await qrcode.toDataURL(ticket.ticket_id, { 
            errorCorrectionLevel: 'H',
            width: 200,
            margin: 1
          });
          
          groups[ticket.event_id].tickets.push({
            id: ticket.ticket_id,
            typeName: ticket.ticket_type_name,
            qrCodeUrl: qrCodeUrl,
          });
        }

        setGroupedTickets(groups);
      } catch (error: any) {
        console.error("Error fetching tickets:", error);
        notifications.show({ 
          title: 'Lỗi', 
          message: 'Không thể tải danh sách vé của bạn.', 
          color: 'red' 
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAndProcessTickets();
  }, [session.user]);

  if (loading) {
    return (
      <Center p="xl">
        <Loader size="lg" />
      </Center>
    );
  }

  if (Object.keys(groupedTickets).length === 0) {
    return (
      <Paper p="xl" radius="md" withBorder>
        <Text ta="center" c="dimmed" fz="lg">
          Bạn chưa có vé nào. Hãy tham gia sự kiện để nhận vé nhé!
        </Text>
      </Paper>
    );
  }

  return (
    <Accordion variant="separated" radius="md" chevronPosition="right">
      {Object.entries(groupedTickets).map(([eventId, group]) => (
        <Accordion.Item key={eventId} value={eventId}>
          <Accordion.Control>
            <Group wrap="nowrap">
              <div>
                <Title order={4} mb={4}>
                  {group.eventName}
                </Title>
                <Group gap="sm" c="dimmed" fz="sm">
                  <Group gap={4}>
                    <IconCalendar size={14} />
                    <Text>{formatDateTime(group.eventStartTime)}</Text>
                  </Group>
                  <Group gap={4}>
                    <IconMapPin size={14} />
                    <Text lineClamp={1}>{group.location}</Text>
                  </Group>
                </Group>
              </div>
              <Badge variant="light" color="blue">
                {group.tickets.length} vé
              </Badge>
            </Group>
          </Accordion.Control>
          <Accordion.Panel>
            <SimpleGrid
              cols={{ base: 1, sm: 2, md: 3 }}
              spacing="md"
              verticalSpacing="md"
            >
              {group.tickets.map(ticket => (
                <Paper 
                  key={ticket.id} 
                  withBorder 
                  p="md" 
                  radius="md"
                  shadow="sm"
                >
                  <Stack gap="sm">
                    <Badge variant="filled" color={theme.primaryColor}>
                      {ticket.typeName}
                    </Badge>
                    
                    <Group justify="space-between" wrap="nowrap">
                      <Text fz="sm" c="dimmed" truncate>
                        ID: {ticket.id}
                      </Text>
                      <Group gap={4} c="blue">
                        <IconQrcode size={16} />
                        <Text fz="sm">QR Code</Text>
                      </Group>
                    </Group>
                    
                    <Center mt="sm">
                      <Image 
                        src={ticket.qrCodeUrl} 
                        w={140} 
                        h={140} 
                        alt={`QR Code for ticket ${ticket.id}`} 
                        style={{ border: `1px solid ${theme.colors.gray[3]}` }}
                      />
                    </Center>
                  </Stack>
                </Paper>
              ))}
            </SimpleGrid>
          </Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion>
  );
}

// Component con cho Tab "Lịch sử Giao dịch"
function TransactionHistoryTab({ session }: { session: Session }) {
  const theme = useMantineTheme();
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
        notifications.show({ 
          title: 'Lỗi', 
          message: 'Không thể tải lịch sử giao dịch.', 
          color: 'red' 
        });
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [session.user]);

  if (loading) return (
    <Center p="xl">
      <Loader size="lg" />
    </Center>
  );
  
  const statusMapping: Record<string, { label: string; color: string }> = {
    pending: { label: 'Chờ thanh toán', color: 'yellow' },
    paid: { label: 'Thành công', color: 'green' },
    failed: { label: 'Thất bại', color: 'red' },
    expired: { label: 'Hết hạn', color: 'gray' },
  };

  const rows = transactions.map((trans) => (
    <Table.Tr 
      key={trans.id} 
      onClick={() => trans.status === 'pending' && navigate(`/payment/${trans.id}`)}
      style={{ 
        cursor: trans.status === 'pending' ? 'pointer' : 'default',
        backgroundColor: trans.status === 'pending' ? theme.colors.yellow[0] : 'transparent'
      }}
    >
      <Table.Td fw={500}>{trans.id.split('-')[0].toUpperCase()}</Table.Td>
      <Table.Td>{trans.event_name || 'Không xác định'}</Table.Td>
      <Table.Td>{formatDateTime(trans.created_at)}</Table.Td>
      <Table.Td fw={600}>
        {trans.total_amount > 0 ? 
          `${trans.total_amount.toLocaleString('vi-VN')}₫` : 
          <Badge variant="light" color="green">Miễn phí</Badge>
        }
      </Table.Td>
      <Table.Td>
        <Badge 
          variant="light" 
          color={statusMapping[trans.status]?.color || 'gray'}
          radius="sm"
        >
          {statusMapping[trans.status]?.label || trans.status}
        </Badge>
      </Table.Td>
    </Table.Tr>
  ));

  return transactions.length > 0 ? (
    <ScrollArea type="auto">
      <Table 
        striped 
        highlightOnHover 
        withTableBorder 
        withColumnBorders
        verticalSpacing="sm"
        horizontalSpacing="md"
      >
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Mã GD</Table.Th>
            <Table.Th>Sự kiện</Table.Th>
            <Table.Th>Ngày tạo</Table.Th>
            <Table.Th>Tổng tiền</Table.Th>
            <Table.Th>Trạng thái</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>{rows}</Table.Tbody>
      </Table>
    </ScrollArea>
  ) : (
    <Paper p="xl" radius="md" withBorder>
      <Text ta="center" c="dimmed" fz="lg">
        Bạn chưa có giao dịch nào
      </Text>
    </Paper>
  );
}

// --- MAIN PAGE COMPONENT ---

export function MyTicketsPage() {
  const { session } = useOutletContext<AuthContextType>();

  return (
    <Container size="lg" py="xl" px={{ base: 'sm', sm: 'md', md: 'xl' }}>
      <Title order={2} mb="xl" ta="center">Tài khoản của tôi</Title>
      
      <Tabs 
        defaultValue="tickets" 
        variant="pills"
        radius="md"
      >
        <Tabs.List justify="center" mb="xl">
          <Tabs.Tab 
            value="tickets" 
            leftSection={<IconTicket size={18}/>}
            fz={{ base: 'sm', sm: 'md' }}
          >
            Vé của tôi
          </Tabs.Tab>
          <Tabs.Tab 
            value="history" 
            leftSection={<IconHistory size={18}/>}
            fz={{ base: 'sm', sm: 'md' }}
          >
            Lịch sử giao dịch
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="tickets">
          <MyTicketsTab session={session} />
        </Tabs.Panel>

        <Tabs.Panel value="history">
          <TransactionHistoryTab session={session} />
        </Tabs.Panel>
      </Tabs>
    </Container>
  );
}