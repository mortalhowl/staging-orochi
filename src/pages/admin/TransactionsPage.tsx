import { useState, useEffect } from 'react';
import { Title, Grid, Paper, Pagination, Group, Text, Badge } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { supabase } from '../../services/supabaseClient';
import { TransactionsTable } from '../../components/admin/transactions/TransactionsTable';
import type { TransactionWithDetails } from '../../components/admin/transactions/TransactionsTable';
import { TransactionDetailDrawer } from '../../components/admin/transactions/TransactionDetailDrawer';
import { TransactionsToolbar } from '../../components/admin/transactions/TransactionsToolbar';
import { useDebounce } from 'use-debounce';

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

  const [filters, setFilters] = useState({
    search: '',
    eventId: null as string | null,
    status: null as string | null,
    dateRange: [null, null] as [Date | null, Date | null],
  });
  const [debouncedSearch] = useDebounce(filters.search, 400);

  // Hàm lấy dữ liệu chính, được gọi lại mỗi khi filter, page... thay đổi
  const fetchTransactions = async () => {
    setLoading(true);
    const from = (activePage - 1) * ITEMS_PER_PAGE;
    const to = from + ITEMS_PER_PAGE - 1;

    let query = supabase
      .from('transactions')
      .select('*, users(email, full_name), events(title)', { count: 'exact' });

    // Áp dụng bộ lọc tìm kiếm (hiện chỉ tìm theo Mã ĐH cho đơn giản)
    if (debouncedSearch) {
      // Để tìm kiếm theo email của user (bảng quan hệ), cần tạo RPC function trong Supabase.
      // Trước mắt, chúng ta sẽ tìm theo ID giao dịch.
      query = query.ilike('id', `%${debouncedSearch}%`);
    }
    // Áp dụng bộ lọc sự kiện
    if (filters.eventId) {
      query = query.eq('event_id', filters.eventId);
    }
    // Áp dụng bộ lọc trạng thái
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    // Áp dụng bộ lọc khoảng ngày
    if (filters.dateRange[0]) {
      query = query.gte('created_at', filters.dateRange[0].toISOString());
    }
    if (filters.dateRange[1]) {
      const endDate = new Date(filters.dateRange[1]);
      endDate.setHours(23, 59, 59, 999); // Đảm bảo lấy hết ngày
      query = query.lte('created_at', endDate.toISOString());
    }

    query = query.order('created_at', { ascending: false }).range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching transactions:', error);
    } else {
      setTransactions(data as any);
      setTotalItems(count ?? 0);
    }
    setLoading(false);
  };
  
  // Hàm lấy dữ liệu thống kê
  const fetchStats = async () => {
    const { count: total } = await supabase.from('transactions').select('*', { count: 'exact', head: true });
    const { count: paid } = await supabase.from('transactions').select('*', { count: 'exact', head: true }).eq('status', 'paid');
    setStats({ total: total ?? 0, paid: paid ?? 0 });
  };

  useEffect(() => {
    fetchTransactions();
  }, [refreshKey, activePage, debouncedSearch, filters.eventId, filters.status, filters.dateRange]);

  useEffect(() => {
    fetchStats();
  }, [refreshKey]);


  const handleSuccess = () => {
    setRefreshKey(prev => prev + 1);
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
        <TransactionsTable
          transactions={transactions}
          loading={loading}
          onRowClick={handleRowClick}
        />
        <Group justify="center" mt="md">
          <Pagination
            total={Math.ceil(totalItems / ITEMS_PER_PAGE)}
            value={activePage}
            onChange={(page) => {
                setPage(page);
                setSelectedTransactionId(null); // Reset chi tiết khi chuyển trang
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