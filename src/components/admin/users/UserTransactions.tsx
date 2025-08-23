import { useState, useEffect } from 'react';
import { Table, Loader, Center, Badge, ScrollArea, Group, Tooltip, Text, ActionIcon } from '@mantine/core';
import { IconCopy } from '@tabler/icons-react';
import { useClipboard } from '@mantine/hooks';
import { supabase } from '../../../services/supabaseClient';
import { formatDateTime } from '../../../utils/formatters';

interface UserTransactionsProps {
  userId: string;
}

interface UserTransaction {
  id: string;
  total_amount: number;
  status: string;
  created_at: string;
  events: { title: string } | null;
  transaction_items: { quantity: number }[];
}

const statusMapping: { [key: string]: { label: string; color: string } } = {
  pending: { label: 'Chờ xác nhận', color: 'yellow' },
  paid: { label: 'Đã thanh toán', color: 'green' },
  failed: { label: 'Thất bại', color: 'red' },
  expired: { label: 'Hết hạn', color: 'gray' },
};

export function UserTransactions({ userId }: UserTransactionsProps) {
  const [transactions, setTransactions] = useState<UserTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const clipboard = useClipboard();

  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          id,
          total_amount,
          status,
          created_at,
          events ( title ),
          transaction_items ( quantity )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error fetching user transactions:", error);
      } else {
        setTransactions(data as any);
      }
      setLoading(false);
    };

    fetchTransactions();
  }, [userId]);

  if (loading) {
    return <Center><Loader /></Center>;
  }

  const rows = transactions.map((trans) => {
    const totalQuantity = trans.transaction_items.reduce((sum, item) => sum + item.quantity, 0);
    return (
      <Table.Tr key={trans.id}>
        <Table.Td maw={110}>{trans.events?.title || 'N/A'}</Table.Td>
        <Table.Td>
          <Group gap="xs" wrap="nowrap">
            <Tooltip label={trans.id}>
              <Text truncate maw={160}>{trans.id}</Text>
            </Tooltip>
            <Tooltip label="Sao chép Mã ĐH">
              <ActionIcon variant="transparent" color="gray" onClick={(e) => { e.stopPropagation(); clipboard.copy(trans.id); }}>
                <IconCopy size={14} />
              </ActionIcon>
            </Tooltip>
          </Group>

        </Table.Td>
        <Table.Td>{totalQuantity}</Table.Td>
        <Table.Td>{trans.total_amount.toLocaleString('vi-VN')}đ</Table.Td>
        <Table.Td>
          <Badge color={statusMapping[trans.status]?.color || 'gray'}>
            {statusMapping[trans.status]?.label || trans.status}
          </Badge>
        </Table.Td>
        <Table.Td>{formatDateTime(trans.created_at)}</Table.Td>
      </Table.Tr>
    );
  });

  return (
    <ScrollArea>
      <Table striped highlightOnHover withTableBorder miw={770}>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Sự kiện</Table.Th>
            <Table.Th>Mã GD</Table.Th>
            <Table.Th>SL Vé</Table.Th>
            <Table.Th>Tổng tiền</Table.Th>
            <Table.Th>Trạng thái</Table.Th>
            <Table.Th>Ngày tạo</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.length > 0 ? rows : <Table.Tr  h="75vh"><Table.Td colSpan={6} align="center" h="100%">Người dùng này chưa có giao dịch nào.</Table.Td></Table.Tr>}
        </Table.Tbody>
      </Table>
    </ScrollArea>
  );
}
