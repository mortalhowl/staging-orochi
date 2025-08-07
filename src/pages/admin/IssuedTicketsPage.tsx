import { useState, useEffect } from 'react';
import { Title, Paper, Pagination, Group } from '@mantine/core';
import { supabase } from '../../services/supabaseClient';
import { TicketsToolbar } from '../../components/admin/tickets/TicketsToolbar';
import { TicketsTable } from '../../components/admin/tickets/TicketsTable';
import type { FullTicketDetails } from '../../types'
import { useDebounce } from 'use-debounce';
import { notifications } from '@mantine/notifications';

const ITEMS_PER_PAGE = 20;

export function IssuedTicketsPage() {
  const [tickets, setTickets] = useState<FullTicketDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePage, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

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

      // Gọi song song 2 hàm RPC: một để lấy dữ liệu, một để đếm
      const dataPromise = supabase
        .rpc('search_issued_tickets', rpcParams)
        .order('created_at', { ascending: false })
        .range((activePage - 1) * ITEMS_PER_PAGE, activePage * ITEMS_PER_PAGE - 1);
      
      // SỬA LỖI Ở ĐÂY: Bỏ { count: 'exact' } vì hàm RPC đã tự đếm
      const countPromise = supabase
        .rpc('count_issued_tickets', rpcParams);

      // Chờ cả hai hoàn thành
      const [dataRes, countRes] = await Promise.all([dataPromise, countPromise]);

      if (dataRes.error || countRes.error) {
        const error = dataRes.error || countRes.error;
        console.error('Error fetching tickets:', error);
        notifications.show({ title: 'Lỗi', message: 'Không thể tải danh sách vé.', color: 'red' });
      } else {
        setTickets(dataRes.data as any);
        // SỬA LỖI Ở ĐÂY: Lấy kết quả đếm từ `countRes.data` thay vì `countRes.count`
        setTotalItems(countRes.data ?? 0);
      }
      setLoading(false);
    };

    fetchPageData();
  }, [activePage, debouncedSearch, filters.eventId, filters.isInvite, filters.isUsed]);

  return (
    <>
      <Title order={2} mb="xl">Quản lý Vé đã phát hành</Title>
      
      <TicketsToolbar filters={filters} setFilters={setFilters} />

      <Paper withBorder p="md" radius="md">
        <TicketsTable tickets={tickets} loading={loading} />
        <Group justify="center" mt="md">
          <Pagination
            total={Math.ceil(totalItems / ITEMS_PER_PAGE)}
            value={activePage}
            onChange={setPage}
            withEdges // <<< THÊM THUỘC TÍNH NÀY ĐỂ HIỂN THỊ NÚT ĐẦU/CUỐI
          />
        </Group>
      </Paper>
    </>
  );
}
