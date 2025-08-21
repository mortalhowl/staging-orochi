import { useState, useEffect } from 'react';
import { Container, Title, Paper, Loader, Center, Text, Stack, Tabs, Badge, Group, Flex, ScrollArea } from '@mantine/core';
import { supabase } from '../services/supabaseClient';
import { useOutletContext, useNavigate, } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import qrcode from 'qrcode';
import { formatDateTime } from '../utils/formatters';
import { notifications } from '@mantine/notifications';
import { IconTicket, IconHistory } from '@tabler/icons-react';
import { DownloadableTicket } from '../components/public/DownloadableTicket';

// --- TYPE DEFINITIONS ---
interface AuthContextType { session: Session; }

interface UserTicket {
  event_id: string;
  event_name: string;
  event_start_time: string;
  event_end_time: string;
  location: string;
  ticket_id: string;
  ticket_type_name: string;
  price: number;
}

interface GroupedTickets {
  [eventId: string]: {
    eventName: string;
    eventStartTime: string;
    eventEndTime: string;
    location: string;
    tickets: {
      id: string;
      typeName: string;
      price: number;
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
              eventEndTime: ticket.event_end_time,
              location: ticket.location, // Lưu lại địa điểm
              tickets: [],
            };
          }

          const qrCodeUrl = await qrcode.toDataURL(ticket.ticket_id, { errorCorrectionLevel: 'H' });

          groups[ticket.event_id].tickets.push({
            id: ticket.ticket_id,
            typeName: ticket.ticket_type_name,
            qrCodeUrl: qrCodeUrl,
            price: ticket.price, // Lưu lại giá vé
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
    // SỬA LỖI Ở ĐÂY: Mảng rỗng `[]` để useEffect chỉ chạy 1 lần duy nhất
  }, []);

  if (loading) {
    return <Center p="xl"><Loader /></Center>;
  }

  return Object.keys(groupedTickets).length > 0 ? (
    <Container size="xs" maw={650}>
      {Object.entries(groupedTickets).map(([eventId, group]) => (
        <Stack key={eventId}>
          {/* Tiêu đề sự kiện */}
          <Group justify="space-between" align="center">
            <Stack gap={0}>
              <Title order={4} c="#008a87">Sự kiện {group.eventName}</Title>
              {/* <Text size="sm" c="dimmed">
                {formatDateTime(group.eventStartTime)}
              </Text> */}
            </Stack>
          </Group>
          <ScrollArea>
            {/* Danh sách vé */}
            {group.tickets.map((ticket, index) => (
              <DownloadableTicket 
                key={ticket.id} 
                ticket={ticket} 
                group={group} 
                index={index} 
                total={group.tickets.length} 
              />
            ))}
          </ScrollArea>
        </Stack>
      ))}
    </Container>
  ) : (
    <Container h="calc(80vh)">
      <Center h="100%">
        <Text ta="center">Bạn chưa có vé nào.</Text>
      </Center>
    </Container>

  );

}

// Component con cho Tab "Lịch sử Giao dịch"
function TransactionHistoryTab({ session }: { session: Session }) {
  const [transactions, setTransactions] = useState<TransactionHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  // const clipboard = useClipboard();

  useEffect(() => {
    const fetchHistory = async () => {
      if (!session.user) return;
      setLoading(true);
      try {
        const { data, error } = await supabase.rpc("get_user_transactions", {
          p_user_id: session.user.id,
        });
        if (error) throw error;
        setTransactions(data as TransactionHistoryItem[]);
      } catch (err: any) {
        notifications.show({
          title: "Lỗi",
          message: "Không thể tải lịch sử giao dịch.",
          color: "red",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  if (loading)
    return (
      <Center p="xl">
        <Loader />
      </Center>
    );

  const statusMapping: { [key: string]: { label: string; color: string } } = {
    pending: { label: "Chờ xác nhận", color: "yellow" },
    paid: { label: "Thành công", color: "green" },
    failed: { label: "Thất bại", color: "red" },
  };

  return transactions.length > 0 ? (
    <Stack gap="md">
      {transactions.map((trans) => (
        <Paper
          key={trans.id}
          withBorder
          p="xs"
          radius="xs"
          // onClick={() => {
          //   if (trans.status === "pending") navigate(`/payment/${trans.id}`);
          // }}
          onClick={() => {
            navigate(`/payment/${trans.id}`);
          }}
          style={{
            cursor: "pointer"
          }}
          // style={{
          //   cursor: trans.status === "pending" ? "pointer" : "default",
          // }}
        >
          {/* Header: Tên sự kiện + trạng thái */}
          <Group justify="space-between" mb="xs">
            <Text fw={600}>{trans.event_name}</Text>
            <Badge color={statusMapping[trans.status]?.color || "gray"}>
              {statusMapping[trans.status]?.label || trans.status}
            </Badge>
          </Group>

          {/* Nội dung chi tiết */}
          <Flex
            direction={{ base: "column", sm: "row" }} // mobile = column, desktop = row
            justify="space-between"
            align="flex-start"
            wrap="wrap"
          >
            <Text size="sm" c="dimmed" truncate>
              Mã GD:{" "}
              <Text span fw={500} c="#008a87">
                {trans.id}
              </Text>
            </Text>
            {/* <Group gap="xs" wrap="nowrap">
              <Tooltip label={trans.id}>
                <Text size="sm" c="dimmed" truncate>
                  Mã GD:{" "}
                  <Text span fw={500} c="#008a87">
                    {trans.id}
                  </Text>
                </Text>
              </Tooltip>
              <Tooltip label="Sao chép Mã ĐH">
                <ActionIcon variant="transparent" color="gray" onClick={(e) => { e.stopPropagation(); clipboard.copy(trans.id); }}>
                  <IconCopy size={14} />
                </ActionIcon>
              </Tooltip>
            </Group> */}

            <Text size="sm" c="dimmed">
              Ngày tạo:{" "}
              <Text span fw={500} c="#008a87">
                {formatDateTime(trans.created_at)}
              </Text>
            </Text>

            <Text size="sm" c="dimmed">
              Tổng tiền:{" "}
              <Text span fw={700} c="#008a87">
                {trans.total_amount > 0
                  ? `${trans.total_amount.toLocaleString("vi-VN")}đ`
                  : "Miễn phí"}
              </Text>
            </Text>
          </Flex>
        </Paper>
      ))}
    </Stack>
  ) : (
    <Container h="calc(80vh)">
      <Center h="100%">
        <Text ta="center">Bạn chưa có giao dịch nào.</Text>
      </Center>
    </Container>
  );
}

// --- MAIN PAGE COMPONENT ---

export function MyTicketsPage() {
  const { session } = useOutletContext<AuthContextType>();

  return (
    <Container my="xl">
      <Tabs defaultValue="tickets" variant="pills" radius="md">
        <Tabs.List justify="center" h='100%'>
          <Tabs.Tab value="tickets" leftSection={<IconTicket size={16} />}>Vé của tôi</Tabs.Tab>
          <Tabs.Tab value="history" leftSection={<IconHistory size={16} />}>Lịch sử giao dịch</Tabs.Tab>
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
