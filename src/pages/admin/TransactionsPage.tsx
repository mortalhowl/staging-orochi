import { useState, useEffect } from 'react';
import { Title, Paper, Pagination, Group, Text, Badge, Button } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { supabase } from '../../services/supabaseClient';
import { TransactionsTable } from '../../components/admin/transactions/TransactionsTable';
import { TransactionDetailDrawer } from '../../components/admin/transactions/TransactionDetailDrawer';
import { TransactionsToolbar } from '../../components/admin/transactions/TransactionsToolbar';
import { TransactionsToolbarBulk } from '../../components/admin/transactions/TransactionsToolbarBulk';
import { useDebounce } from 'use-debounce';
import type { TransactionWithDetails } from '../../types';
import { notifications } from '@mantine/notifications';
import { IconDownload } from '@tabler/icons-react';
import * as XLSX from 'xlsx';

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
  const [exporting, setExporting] = useState(false);

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
      setSelection([]);
      const from = (activePage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      const rpcParams = {
        search_term: debouncedSearch,
        p_status: filters.status,
        p_event_id: filters.eventId,
        p_start_date: filters.dateRange[0] ? new Date(filters.dateRange[0]).toISOString() : null,
        p_end_date: filters.dateRange[1] ? (() => {
          const endDate = new Date(filters.dateRange[1]!);
          endDate.setHours(23, 59, 59, 999);
          return endDate.toISOString();
        })() : null,
      };

      // 1. Query để lấy dữ liệu trang hiện tại
      const dataPromise = supabase
        .rpc('search_transactions', rpcParams)
        .select('*, users(email, full_name), events(title)')
        .order('created_at', { ascending: false })
        .range(from, to);
      
      // 2. Query để đếm tổng số lượng
      const countPromise = supabase.rpc('count_transactions', rpcParams);

      const [dataRes, countRes] = await Promise.all([dataPromise, countPromise]);

      if (dataRes.error || countRes.error) {
        console.error('Error fetching transactions:', dataRes.error || countRes.error);
        notifications.show({ title: 'Lỗi', message: 'Không thể tải danh sách đơn hàng.', color: 'red' });
      } else {
        setTransactions(dataRes.data as any);
        // 3. Lấy tổng số lượng từ kết quả của RPC đếm
        setTotalItems(countRes.data ?? 0);
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

  const handleExport = async () => {
    setExporting(true);
    notifications.show({ id: 'export-start', loading: true, title: 'Đang xuất dữ liệu', message: 'Vui lòng chờ...', autoClose: false });

    try {
      // Logic xuất Excel giờ đây cũng nên dùng RPC để đảm bảo dữ liệu nhất quán
      const rpcParams = {
        search_term: debouncedSearch,
        p_status: filters.status,
        p_event_id: filters.eventId,
        p_start_date: filters.dateRange[0] ? new Date(filters.dateRange[0]).toISOString() : null,
        p_end_date: filters.dateRange[1] ? (() => {
            const endDate = new Date(filters.dateRange[1]!);
            endDate.setHours(23, 59, 59, 999);
            return endDate.toISOString();
        })() : null,
      };
      
      const { data, error } = await supabase
        .rpc('search_transactions', rpcParams)
        .select('*, users(full_name, email), events(title), transaction_items(*, ticket_types(name, price))')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!data || data.length === 0) {
        notifications.update({ id: 'export-start', color: 'yellow', title: 'Không có dữ liệu', message: 'Không tìm thấy giao dịch nào để xuất.', autoClose: 3000 });
        setExporting(false);
        return;
      }

      const flattenedData = data.flatMap((transaction: any) => 
        transaction.transaction_items.map((item: any) => ({
          'Mã GD': transaction.id.split('-')[0].toUpperCase(),
          'Tên khách hàng': transaction.users?.full_name || '',
          'Email': transaction.users?.email || '',
          'Sự kiện': transaction.events?.title || '',
          'Loại vé đã đặt': item.ticket_types?.name || '',
          'Số lượng': item.quantity,
          'Giá vé': item.price,
          'Thành tiền': item.quantity * item.price,
          'Thời gian mua': new Date(transaction.created_at).toLocaleString('vi-VN'),
          'Thời gian xác nhận': transaction.paid_at ? new Date(transaction.paid_at).toLocaleString('vi-VN') : 'Chưa xác nhận',
        }))
      );
      
      const totalAmount = flattenedData.reduce((sum, row) => sum + row['Thành tiền'], 0);

      const worksheet = XLSX.utils.json_to_sheet(flattenedData);
      XLSX.utils.sheet_add_aoa(worksheet, [['', '', '', '', '', '', '', 'TỔNG CỘNG', totalAmount]], { origin: -1 });
      
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'GiaoDich');
      XLSX.writeFile(workbook, `GiaoDich_${new Date().toISOString().split('T')[0]}.xlsx`);

      notifications.update({ id: 'export-start', color: 'green', title: 'Thành công', message: `Đã xuất ${data.length} giao dịch.`, autoClose: 3000 });
    } catch (err: any) {
      notifications.update({ id: 'export-start', color: 'red', title: 'Thất bại', message: 'Xuất dữ liệu thất bại.', autoClose: 3000 });
      console.error(err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <Group justify="space-between" mb="xl">
        <Title order={2}>Quản lý Đơn hàng</Title>
        <Button onClick={handleExport} loading={exporting} leftSection={<IconDownload size={16} />}>
          Xuất Excel
        </Button>
      </Group>

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
              setSelection([]);
            }}
            withEdges
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
