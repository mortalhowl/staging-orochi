import { useState, useEffect } from 'react';
import { Paper, Text, Center, Loader, Table, SimpleGrid, Stack, Badge, ScrollArea, Group, Tooltip, ActionIcon } from '@mantine/core';
import { IconCopy } from '@tabler/icons-react';
import { useClipboard } from '@mantine/hooks';
import { supabase } from '../../../services/supabaseClient';
import { formatDateTime } from '../../../utils/formatters';

interface TransactionAnalyticsTabProps {
  dateRange: [Date | null, Date | null];
}

const statusMapping: { [key: string]: { label: string; color: string } } = {
  pending: { label: 'Chờ xác nhận', color: 'yellow' },
  paid: { label: 'Đã thanh toán', color: 'green' },
  failed: { label: 'Thất bại', color: 'red' },
  expired: { label: 'Hết hạn', color: 'gray' },
};

export function TransactionAnalyticsTab({ dateRange }: TransactionAnalyticsTabProps) {
  const [stats, setStats] = useState<any>(null);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const clipboard = useClipboard();

  useEffect(() => {
    const fetchData = async () => {
      if (!dateRange || !dateRange[0] || !dateRange[1]) return;
      setLoading(true);

      const startDate = new Date(dateRange[0]);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(dateRange[1]);
      endDate.setHours(23, 59, 59, 999);

      const rpcParams = {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      };

      const statsPromise = supabase.rpc('get_transaction_analytics', rpcParams);
      const recentTransPromise = supabase
        .from('transactions')
        .select('id, total_amount, status, created_at, users(full_name)')
        .order('created_at', { ascending: false })
        .limit(10);

      const [statsRes, recentTransRes] = await Promise.all([statsPromise, recentTransPromise]);

      if (statsRes.data) setStats(statsRes.data[0]);
      if (recentTransRes.data) setRecentTransactions(recentTransRes.data);

      setLoading(false);
    };

    fetchData();
  }, [dateRange]);

  if (loading) {
    return <Center h={400}><Loader /></Center>;
  }

  return (
    <Stack>
      <SimpleGrid cols={{ base: 1, sm: 3 }}>
        <Paper withBorder radius="md" p="md">
          <Text size="xl" fw={700}>{stats?.average_order_value?.toLocaleString('vi-VN')}đ</Text>
          <Text c="dimmed" size="sm">Giá trị đơn hàng trung bình</Text>
        </Paper>
        <Paper withBorder radius="md" p="md">
          <Text size="xl" fw={700}>{stats?.sale_transactions_count?.toLocaleString('vi-VN')}</Text>
          <Text c="dimmed" size="sm">Giao dịch bán</Text>
        </Paper>
        <Paper withBorder radius="md" p="md">
          <Text size="xl" fw={700}>{stats?.invitation_transactions_count?.toLocaleString('vi-VN')}</Text>
          <Text c="dimmed" size="sm">Giao dịch vé mời</Text>
        </Paper>
      </SimpleGrid>

      <Paper withBorder radius="md" p="md">
        <Text fw={500} mb="md">Các giao dịch gần đây</Text>
        <ScrollArea>
          <Table striped highlightOnHover withTableBorder miw={800}>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Mã GD</Table.Th>
                <Table.Th>Khách hàng</Table.Th>
                <Table.Th>Tổng tiền</Table.Th>
                <Table.Th>Trạng thái</Table.Th>
                <Table.Th>Thời gian</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {recentTransactions.map(row => (
                <Table.Tr key={row.id}>
                  <Table.Td>

                    <Group gap="xs" wrap="nowrap">
                      <Tooltip label={row.id}>
                        <Text truncate maw={200}>{row.id}</Text>
                      </Tooltip>
                      <Tooltip label="Sao chép Mã ĐH">
                        <ActionIcon variant="transparent" color="gray" onClick={(e) => { e.stopPropagation(); clipboard.copy(row.id); }}>
                          <IconCopy size={14} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Table.Td>
                  <Table.Td>{row.users?.full_name || 'N/A'}</Table.Td>
                  <Table.Td>{row.total_amount.toLocaleString('vi-VN')}đ</Table.Td>
                  <Table.Td>
                    <Badge color={statusMapping[row.status]?.color || 'gray'}>
                      {statusMapping[row.status]?.label || row.status}
                    </Badge>
                  </Table.Td>
                  <Table.Td>{formatDateTime(row.created_at)}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Paper>
    </Stack>
  );
}
