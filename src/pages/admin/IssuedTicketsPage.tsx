import { useState, useEffect } from 'react';
import { Title, Paper, Pagination, Group, Button, SimpleGrid, Stack, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { supabase } from '../../services/supabaseClient';
import { TicketsToolbar } from '../../components/admin/tickets/TicketsToolbar';
import { TicketsTable } from '../../components/admin/tickets/TicketsTable';
import type { FullTicketDetails } from '../../types';
import { TicketDetailDrawer } from '../../components/admin/tickets/TicketDetailDrawer';
import { useDebounce } from 'use-debounce';
import { notifications } from '@mantine/notifications';
import { IconDownload } from '@tabler/icons-react';
import * as XLSX from 'xlsx';
import { formatDateTime } from '../../utils/formatters';

const ITEMS_PER_PAGE = 20;

function TicketsStats({ stats }: { stats: any }) {
    if (!stats) return null;
    return (
        <Paper withBorder p="md" radius="md" mb="md">
            <SimpleGrid cols={{ base: 2, sm: 3, lg: 5 }}>
                <Stack align="center" gap={0}>
                    <Text size="xl" fw={700}>{stats.total_tickets}</Text>
                    <Text size="xs" c="dimmed">Tổng số vé</Text>
                </Stack>
                <Stack align="center" gap={0}>
                    <Text size="xl" fw={700} c="green">{stats.checked_in_count}</Text>
                    <Text size="xs" c="dimmed">Đã check-in</Text>
                </Stack>
                <Stack align="center" gap={0}>
                    <Text size="xl" fw={700} c="gray">{stats.not_checked_in_count}</Text>
                    <Text size="xs" c="dimmed">Chưa check-in</Text>
                </Stack>
                <Stack align="center" gap={0}>
                    <Text size="xl" fw={700} c="teal">{stats.active_count}</Text>
                    <Text size="xs" c="dimmed">Hoạt động</Text>
                </Stack>
                <Stack align="center" gap={0}>
                    <Text size="xl" fw={700} c="red">{stats.disabled_count}</Text>
                    <Text size="xs" c="dimmed">Vô hiệu hóa</Text>
                </Stack>
            </SimpleGrid>
        </Paper>
    );
}

export function IssuedTicketsPage() {
  const [tickets, setTickets] = useState<FullTicketDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePage, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [drawerOpened, { open: openDrawer, close: closeDrawer }] = useDisclosure(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [stats, setStats] = useState<any>(null);

  const [filters, setFilters] = useState({
    search: '',
    eventId: null as string | null,
    isInvite: null as string | null,
    isUsed: null as string | null,
  });
  const [debouncedSearch] = useDebounce(filters.search, 400);

  useEffect(() => {
    const fetchPageData = async () => {
      setLoading(true);
      
      const rpcParams = {
        search_term: debouncedSearch,
        p_event_id: filters.eventId,
        p_is_invite: filters.isInvite === null ? null : filters.isInvite === 'true',
        p_is_used: filters.isUsed === null ? null : filters.isUsed === 'true',
      };

      const dataPromise = supabase.rpc('search_issued_tickets', rpcParams)
        .order('created_at', { ascending: false })
        .range((activePage - 1) * ITEMS_PER_PAGE, activePage * ITEMS_PER_PAGE - 1);
      
      const countPromise = supabase.rpc('count_issued_tickets', rpcParams);
      const statsPromise = supabase.rpc('get_issued_tickets_stats', rpcParams).single();

      const [dataRes, countRes, statsRes] = await Promise.all([dataPromise, countPromise, statsPromise]);

      if (dataRes.error || countRes.error || statsRes.error) {
        const error = dataRes.error || countRes.error || statsRes.error;
        notifications.show({ title: 'Lỗi', message: 'Không thể tải dữ liệu.', color: 'red' });
        console.error(error);
      } else {
        setTickets(dataRes.data as any);
        setTotalItems(countRes.data ?? 0);
        setStats(statsRes.data);
      }
      setLoading(false);
    };
    fetchPageData();
  }, [activePage, refreshKey, debouncedSearch, filters.eventId, filters.isInvite, filters.isUsed]);

  const handleRowClick = (ticketId: string) => {
    setSelectedTicketId(ticketId);
    openDrawer();
  };

  const handleSuccess = () => setRefreshKey(prev => prev + 1);

  const handleExport = async () => {
    setExporting(true);
    // const notifId = notifications.show({ 
    //     loading: true, 
    //     title: 'Đang xuất dữ liệu', 
    //     message: 'Vui lòng chờ...', 
    //     autoClose: false,
    //     withCloseButton: false,
    // });
    
    const rpcParams = {
        search_term: debouncedSearch,
        p_event_id: filters.eventId,
        p_is_invite: filters.isInvite === null ? null : filters.isInvite === 'true',
        p_is_used: filters.isUsed === null ? null : filters.isUsed === 'true',
    };

    // Lấy tất cả dữ liệu, không phân trang
    const { data, error } = await supabase.rpc('search_issued_tickets', rpcParams);
    
    if (error || !data) {
        notifications.update({ id: 'export-tickets', color: 'red', title: 'Thất bại', message: 'Xuất dữ liệu thất bại.' });
        setExporting(false);
        return;
    }

    const exportData = data.map((ticket: FullTicketDetails, index: number) => ({
        'STT': index + 1,
        'Mã vé': ticket.id,
        'Khách hàng': ticket.customer_name,
        'Email': ticket.customer_email,
        'Sự kiện': ticket.event_name,
        'Loại vé': ticket.ticket_type_name,
        'Nguồn gốc': ticket.is_invite ? 'Vé mời' : 'Vé bán',
        'Trạng thái': ticket.is_used ? 'Đã check-in' : 'Chưa check-in',
        'Thời gian check-in': ticket.is_used ? formatDateTime(ticket.used_at) : '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'DanhSachVe');
    XLSX.writeFile(workbook, `DanhSachVe_${new Date().toISOString().split('T')[0]}.xlsx`);

    // notifications.update({ id: notifId, color: 'green', title: 'Thành công', message: `Đã xuất ${data.length} vé.` });
    setExporting(false);
  };

  return (
    <>
      <Group justify="space-between" mb="xl">
        <Title order={2}>Quản lý Vé đã phát hành</Title>
        <Button onClick={handleExport} loading={exporting} leftSection={<IconDownload size={16}/>}>
            Xuất Excel
        </Button>
      </Group>
      
      <TicketsStats stats={stats} />
      <TicketsToolbar filters={filters} setFilters={setFilters} />

      <Paper withBorder p="md" radius="md">
        <TicketsTable tickets={tickets} loading={loading} onRowClick={handleRowClick} />
        <Group justify="center" mt="md">
          <Pagination
            total={Math.ceil(totalItems / ITEMS_PER_PAGE)}
            value={activePage}
            onChange={setPage}
            withEdges
          />
        </Group>
      </Paper>

      <TicketDetailDrawer ticketId={selectedTicketId} opened={drawerOpened} onClose={closeDrawer} onSuccess={handleSuccess} />
    </>
  );
}
