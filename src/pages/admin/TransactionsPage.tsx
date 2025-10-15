// src/pages/admin/TransactionsPage.tsx
import { useState } from 'react';
import { Title, Paper, Pagination, Group, Text, Button, Container, SimpleGrid, Stack, Center, Loader } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconDownload } from '@tabler/icons-react';

// Import các components, hooks và services đã tái cấu trúc
import { TransactionsTable } from '../../components/admin/transactions/TransactionsTable';
import { TransactionDetailDrawer } from '../../components/admin/transactions/TransactionDetailDrawer';
import { TransactionsToolbar } from '../../components/admin/transactions/TransactionsToolbar';
import { TransactionsToolbarBulk } from '../../components/admin/transactions/TransactionsToolbarBulk';
import { useAuthStore } from '../../store/authStore';
import { useTransactions } from '../../hooks/api/useTransactions'; // <-- SỬ DỤNG CUSTOM HOOK MỚI
import { TransactionsApi } from '../../services/api/transactions';
import { exportTransactionsToExcel } from '../../utils/exporters/transactionExporter';


// Component con cho khu vực tổng quan, không thay đổi
function TransactionsStats({ stats, loading }: { stats: any, loading: boolean }) {
    if (loading || !stats) {
        return (
            <Paper withBorder p="md" radius="md" mb="md">
                <Center h={58}><Loader size="sm" /></Center>
            </Paper>
        );
    }
    const { total_transactions = 0, paid_count = 0, pending_count = 0, total_revenue = 0 } = stats;
    return (
        <Paper withBorder p="md" radius="md" mb="md">
            <SimpleGrid cols={{ base: 2, sm: 4 }}>
                <Stack align="center" gap={0}><Text size="xl" fw={700}>{total_transactions}</Text><Text size="xs" c="dimmed">Tổng đơn</Text></Stack>
                <Stack align="center" gap={0}><Text size="xl" fw={700} c="green">{paid_count}</Text><Text size="xs" c="dimmed">Đã xác nhận</Text></Stack>
                <Stack align="center" gap={0}><Text size="xl" fw={700} c="yellow">{pending_count}</Text><Text size="xs" c="dimmed">Chờ xử lý</Text></Stack>
                <Stack align="center" gap={0}><Text size="xl" fw={700} c="blue">{total_revenue.toLocaleString('vi-VN')}đ</Text><Text size="xs" c="dimmed">Doanh thu</Text></Stack>
            </SimpleGrid>
        </Paper>
    );
}

export function TransactionsPage() {
  const {
    transactions,
    loading,
    totalItems,
    stats,
    activePage,
    setPage,
    filters,
    setFilters,
    refresh,
    itemsPerPage,
  } = useTransactions();

  const [selection, setSelection] = useState<string[]>([]);
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);
  const [drawerOpened, { open: openDrawer, close: closeDrawer }] = useDisclosure(false);
  const [exporting, setExporting] = useState(false);
  
  const { hasEditPermission } = useAuthStore();
  const canEditTransactions = hasEditPermission('transactions');

  const handleSuccess = () => {
    refresh();
    setSelection([]);
  };

  const handleRowClick = (transactionId: string) => {
    setSelectedTransactionId(transactionId);
    openDrawer();
  };
  
 const handleExport = async () => {
    setExporting(true);
    try {
      const dataToExport = await TransactionsApi.getAllTransactionsForExport(filters);
      exportTransactionsToExcel(dataToExport);
    } catch (error) {
      // Lỗi đã được xử lý và thông báo bởi ApiService và exporter,
      // nhưng chúng ta vẫn log lại để debug nếu cần.
      console.error(error);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Container size="xl" py="md">
      <Group justify="space-between" mb="xl">
        <Title order={2}>Giao dịch</Title>
        <Button onClick={handleExport} loading={exporting} leftSection={<IconDownload size={16} />}>
          Xuất Excel
        </Button>
      </Group>

      <TransactionsStats stats={stats} loading={loading && transactions.length === 0} />
      <TransactionsToolbar filters={filters} setFilters={setFilters} />

      <Paper withBorder p="md" radius="md">
        {canEditTransactions && selection.length > 0 && (
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
          canEdit={canEditTransactions}
        />
        <Group justify="center" mt="md">
          <Pagination
            total={Math.ceil(totalItems / itemsPerPage)}
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
        canEdit={canEditTransactions}
      />
    </Container>
  );
}