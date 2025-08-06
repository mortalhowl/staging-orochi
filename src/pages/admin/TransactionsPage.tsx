import { useState, useEffect } from 'react';
import { Title, Paper, Pagination, Group, Text, Badge } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { supabase } from '../../services/supabaseClient';
import { TransactionsTable } from '../../components/admin/transactions/TransactionsTable';
import { TransactionDetailDrawer } from '../../components/admin/transactions/TransactionDetailDrawer';
import { TransactionsToolbar } from '../../components/admin/transactions/TransactionsToolbar';
import { TransactionsToolbarBulk } from '../../components/admin/transactions/TransactionsToolbarBulk'
import { useDebounce } from 'use-debounce';
import type { TransactionWithDetails } from '../../types';
import { notifications } from '@mantine/notifications';

const ITEMS_PER_PAGE = 15;

export function TransactionsPage() {
  const [transactions, setTransactions] = useState<TransactionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [drawerOpened, { open: openDrawer, close: closeDrawer }] = useDisclosure(false);
  const [activePage, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [stats, setStats] = useState({ total: 0, paid: 0 });
  const [selection, setSelection] = useState<string[]>([]);

  const [filters, setFilters] = useState({
    search: '',
    eventId: null as string | null,
    status: null as string | null,
    dateRange: [null, null] as [Date | null, Date | null],
  });
  const [debouncedSearch] = useDebounce(filters.search, 400);

  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true);
      const from = (activePage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      // Chuẩn bị tham số để gọi RPC
      const rpcParams = {
        search_term: debouncedSearch,
        p_status: filters.status,
        p_event_id: filters.eventId,
        // Bọc trong new Date() để đảm bảo nó luôn là một đối tượng Date
        p_start_date: filters.dateRange[0] ? new Date(filters.dateRange[0]).toISOString() : null,
        p_end_date: filters.dateRange[1] ? (() => {
          const endDate = new Date(filters.dateRange[1]!);
          endDate.setHours(23, 59, 59, 999);
          return endDate.toISOString();
        })() : null,
      };

      const { data, error, count } = await supabase
        .rpc('search_transactions', rpcParams, { count: 'exact' })
        .select('*, users(email, full_name), events(title)')
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        console.error('Error fetching transactions:', error);
        notifications.show({ title: 'Lỗi', message: 'Không thể tải danh sách đơn hàng.', color: 'red' });
      } else {
        setTransactions(data as any);
        setTotalItems(count ?? 0);
      }
      setLoading(false);
    };

    fetchTransactions();
  }, [refreshKey, activePage, debouncedSearch, filters.eventId, filters.status, filters.dateRange]);

  const fetchStats = async () => {
    const { count: total } = await supabase.from('transactions').select('*', { count: 'exact', head: true });
    const { count: paid } = await supabase.from('transactions').select('*', { count: 'exact', head: true }).eq('status', 'paid');
    setStats({ total: total ?? 0, paid: paid ?? 0 });
  };

  // SỬA LỖI: Gọi fetchStats
  useEffect(() => {
    fetchStats();
  }, [refreshKey]);

  const handleSuccess = () => {
    setRefreshKey(prev => prev + 1);
    setSelection([]); // Xóa lựa chọn sau khi thành công
  };

  const handleRowClick = (transactionId: string) => {
    setSelectedTransactionId(transactionId);
    openDrawer();
  };

  return (
    <>
      <Title order={2} mb="xl">Quản lý Đơn hàng</Title>

      <Paper withBorder p="md" radius="md" mb="md">
        <Group>
          <Text fw={500}>Tổng quan:</Text>
          <Badge size="lg">{stats.total} Tổng đơn</Badge>
          <Badge size="lg" color="green">{stats.paid} Đã xác nhận</Badge>
          <Badge size="lg" color="yellow">{stats.total - stats.paid} Chờ xử lý</Badge>
        </Group>
      </Paper>

      <TransactionsToolbar filters={filters} setFilters={setFilters} />

      <Paper withBorder p="md" radius="md">
        {selection.length > 0 && (
          <TransactionsToolbarBulk
            selection={selection}
            onSuccess={handleSuccess}
          />
        )}
        <TransactionsTable
          transactions={transactions}
          loading={loading}
          selection={selection}
          setSelection={setSelection}
          onRowClick={handleRowClick}
        />
        <Group justify="center" mt="md">
          <Pagination
            total={Math.ceil(totalItems / ITEMS_PER_PAGE)}
            value={activePage}
            onChange={(page) => {
              setPage(page);
              setSelection([]); // Xóa lựa chọn khi chuyển trang
            }}
          />
        </Group>
      </Paper>

      <TransactionDetailDrawer
        transactionId={selectedTransactionId}
        opened={drawerOpened}
        onClose={closeDrawer}
        onSuccess={handleSuccess}
      />
    </>
  );
}