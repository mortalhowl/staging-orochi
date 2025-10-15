// src/components/admin/dashboard/TransactionAnalyticsTab.tsx
import { Paper, Text, Center, Loader, Table, SimpleGrid, Stack, Badge, ScrollArea, Group, Tooltip, ActionIcon } from '@mantine/core';
import { IconCopy } from '@tabler/icons-react';
import { useClipboard } from '@mantine/hooks';
import { formatDateTime } from '../../../utils/formatters';

interface TransactionAnalyticsTabProps {
  data: any;
  loading: boolean;
}

const statusMapping: { [key: string]: { label: string; color: string } } = {
  pending: { label: 'Chờ xác nhận', color: 'yellow' },
  paid: { label: 'Đã thanh toán', color: 'green' },
  failed: { label: 'Thất bại', color: 'red' },
  expired: { label: 'Hết hạn', color: 'gray' },
};

export function TransactionAnalyticsTab({ data, loading }: TransactionAnalyticsTabProps) {
  const clipboard = useClipboard();

  if (loading) {
    return <Center h={400}><Loader /></Center>;
  }

  const { stats, recentTransactions } = data || {};

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
              <Table.Tr><Table.Th>Mã GD</Table.Th><Table.Th>Khách hàng</Table.Th><Table.Th>Tổng tiền</Table.Th><Table.Th>Trạng thái</Table.Th><Table.Th>Thời gian</Table.Th></Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {recentTransactions?.map((row: any) => (
                <Table.Tr key={row.id}>
                  <Table.Td>
                    <Group gap="xs" wrap="nowrap">
                      <Tooltip label={row.id}><Text truncate maw={200}>{row.id}</Text></Tooltip>
                      <Tooltip label="Sao chép Mã ĐH">
                        <ActionIcon variant="transparent" color="gray" onClick={() => clipboard.copy(row.id)}><IconCopy size={14} /></ActionIcon>
                      </Tooltip>
                    </Group>
                  </Table.Td>
                  <Table.Td>{row.users?.full_name || 'N/A'}</Table.Td>
                  <Table.Td>{row.total_amount.toLocaleString('vi-VN')}đ</Table.Td>
                  <Table.Td>
                    <Badge color={statusMapping[row.status]?.color || 'gray'}>{statusMapping[row.status]?.label || row.status}</Badge>
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