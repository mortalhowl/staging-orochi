import { Table, Checkbox, LoadingOverlay, Text, Badge, Group, ActionIcon, Tooltip, Avatar, Box, ScrollArea } from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { IconCopy } from '@tabler/icons-react';
import type { TransactionWithDetails } from '../../../types';
import { formatDateTime } from '../../../utils/formatters';

interface TransactionsTableProps {
  transactions: TransactionWithDetails[];
  loading: boolean;
  selection: string[];
  setSelection: (selection: string[]) => void;
  onRowClick: (transactionId: string) => void;
  canEdit: boolean;
}

const statusMapping: { [key: string]: { label: string; color: string } } = {
  pending: { label: 'Chờ xác nhận', color: 'yellow' },
  paid: { label: 'Đã thanh toán', color: 'green' },
  failed: { label: 'Thất bại', color: 'red' },
  // expired: { label: 'Hết hạn', color: 'gray' },
};

export function TransactionsTable({ transactions, loading, selection, setSelection, onRowClick, canEdit }: TransactionsTableProps) {
  const clipboard = useClipboard();

  // Lọc ra các ID có thể được chọn (chỉ những giao dịch pending)
  const selectableIds = transactions.filter(t => t.status === 'pending').map(t => t.id);

  const handleSelectAll = (checked: boolean) => {
    setSelection(checked ? selectableIds : []);
  };

  const rows = transactions.map((trans) => (
    <Table.Tr key={trans.id} onClick={() => onRowClick(trans.id)} style={{ cursor: 'pointer' }}>
      {canEdit && (<Table.Td onClick={(e) => e.stopPropagation()}>

        <Checkbox
          aria-label="Select row"
          checked={selection.includes(trans.id)}
          disabled={trans.status !== 'pending'} // Vô hiệu hóa nếu không phải pending
          onChange={(e) =>
            setSelection(
              e.currentTarget.checked
                ? [...selection, trans.id]
                : selection.filter((id) => id !== trans.id)
            )
          }
        />
      </Table.Td>)}
      {/* <Table.Td>{trans.users?.email || 'N/A'}</Table.Td> */}
      <Table.Td>
        <Group align="center" gap="xs" wrap="nowrap">
          <Tooltip label={trans.users?.email}>
            <Group wrap='nowrap' gap="xs">
              <Avatar radius="xl" />
              <Box w={150}>
                <Text truncate maw={150} size="sm" fw={500}>{trans.users?.full_name}</Text>
                <Text truncate maw={150} size="xs" c="dimmed">{trans.users?.email}</Text>
                <Text truncate maw={150} size="xs" c="dimmed">{trans.users?.phone}</Text>
              </Box>
            </Group>
          </Tooltip>
          <Tooltip label="Sao chép Email">
            <ActionIcon variant="transparent" color="gray" onClick={(e) => {
              e.stopPropagation();
              clipboard.copy(trans.users?.email);
            }}>
              <IconCopy size={14} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Table.Td>
      <Table.Td>
        <Group gap="xs" wrap="nowrap">
          <Tooltip label={trans.id}>
            <Text truncate maw={200}>{trans.id}</Text>
          </Tooltip>
          <Tooltip label="Sao chép Mã ĐH">
            <ActionIcon variant="transparent" color="gray" onClick={(e) => { e.stopPropagation(); clipboard.copy(trans.id); }}>
              <IconCopy size={14} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Table.Td>
      <Table.Td>{trans.events?.title || 'N/A'}</Table.Td>
      <Table.Td>{trans.total_amount.toLocaleString('vi-VN')}đ</Table.Td>
      <Table.Td>
        <Badge color={statusMapping[trans.status]?.color || 'gray'}>
          {statusMapping[trans.status]?.label || trans.status}
        </Badge>
      </Table.Td>
      <Table.Td>{formatDateTime(trans.created_at)}</Table.Td>
    </Table.Tr>
  ));

  return (
    <div style={{ position: 'relative' }}>
      <LoadingOverlay visible={loading} zIndex={10} overlayProps={{ radius: 'sm', blur: 2 }} />
      <ScrollArea>
        <Table striped highlightOnHover withTableBorder miw={1200}>
          <Table.Thead>
            <Table.Tr>
              {canEdit && (
                <Table.Th style={{ width: 40 }}>
                  <Checkbox
                    aria-label="Select all rows"
                    onChange={(e) => handleSelectAll(e.currentTarget.checked)}
                    checked={selectableIds.length > 0 && selection.length === selectableIds.length}
                    indeterminate={selection.length > 0 && selection.length < selectableIds.length}
                  />
                </Table.Th>)}
              <Table.Th>Khách hàng</Table.Th>
              <Table.Th>Mã ĐH</Table.Th>
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
      </ScrollArea>
    </div>
  );
}