import { Table, LoadingOverlay, Text, Badge, Group, ActionIcon, Tooltip } from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { IconCopy } from '@tabler/icons-react';

// Định nghĩa một kiểu dữ liệu tạm thời cho giao dịch sau khi JOIN
export interface TransactionWithDetails {
  id: string;
  total_amount: number;
  status: string;
  created_at: string;
  users: { email: string } | null;
  events: { title: string } | null;
}

interface TransactionsTableProps {
  transactions: TransactionWithDetails[];
  loading: boolean;
  onRowClick: (transactionId: string) => void;
}

const formatDate = (dateString: string) => new Date(dateString).toLocaleString('vi-VN');

const statusMapping: { [key: string]: { label: string; color: string } } = {
  pending: { label: 'Chờ xác nhận', color: 'yellow' },
  paid: { label: 'Đã thanh toán', color: 'green' },
  failed: { label: 'Thất bại', color: 'red' },
  expired: { label: 'Hết hạn', color: 'gray' },
};

export function TransactionsTable({ transactions, loading, onRowClick }: TransactionsTableProps) {
  const clipboard = useClipboard();

  const rows = transactions.map((trans) => (
    <Table.Tr key={trans.id} onClick={() => onRowClick(trans.id)} style={{ cursor: 'pointer' }}>
      <Table.Td>
        <Group gap="xs" wrap="nowrap">
          <Text truncate maw={100}>{trans.id}</Text>
          <Tooltip label="Sao chép Mã ĐH">
            <ActionIcon variant="transparent" color="gray" onClick={(e) => { e.stopPropagation(); clipboard.copy(trans.id); }}>
              <IconCopy size={14} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Table.Td>
      <Table.Td>{trans.users?.email || 'N/A'}</Table.Td>
      <Table.Td>{trans.events?.title || 'N/A'}</Table.Td>
      <Table.Td>{trans.total_amount.toLocaleString('vi-VN')}đ</Table.Td>
      <Table.Td>
        <Badge color={statusMapping[trans.status]?.color || 'gray'}>
          {statusMapping[trans.status]?.label || trans.status}
        </Badge>
      </Table.Td>
      <Table.Td>{formatDate(trans.created_at)}</Table.Td>
    </Table.Tr>
  ));

  return (
    <div style={{ position: 'relative' }}>
      <LoadingOverlay visible={loading} zIndex={10} overlayProps={{ radius: 'sm', blur: 2 }} />
      <Table striped highlightOnHover withTableBorder>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Mã ĐH</Table.Th>
            <Table.Th>Khách hàng</Table.Th>
            <Table.Th>Sự kiện</Table.Th>
            <Table.Th>Tổng tiền</Table.Th>
            <Table.Th>Trạng thái</Table.Th>
            <Table.Th>Ngày tạo</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.length > 0 ? rows : <Table.Tr><Table.Td colSpan={6} align="center">Không có giao dịch nào.</Table.Td></Table.Tr>}
        </Table.Tbody>
      </Table>
    </div>
  );
}