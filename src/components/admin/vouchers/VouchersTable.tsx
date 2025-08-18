import { Table, LoadingOverlay, Text, Badge } from '@mantine/core';
import type { Voucher } from '../../../types';
import { formatDateTime } from '../../../utils/formatters';

interface VouchersTableProps {
  vouchers: Voucher[];
  loading: boolean;
  onRowClick: (voucher: Voucher) => void; // Thay đổi để truyền cả object
}

const formatDiscount = (voucher: Voucher) => {
    if (voucher.discount_type === 'percentage') {
        let text = `${voucher.discount_value}%`;
        if (voucher.max_discount_amount) {
            text += ` (tối đa ${voucher.max_discount_amount.toLocaleString('vi-VN')}đ)`;
        }
        return text;
    }
    return `${voucher.discount_value.toLocaleString('vi-VN')}đ`;
};

export function VouchersTable({ vouchers, loading, onRowClick }: VouchersTableProps) {
  const rows = vouchers.map((voucher) => (
    <Table.Tr key={voucher.id} onClick={() => onRowClick(voucher)} style={{ cursor: 'pointer' }}>
      <Table.Td><Text fw={700} c="blue">{voucher.code}</Text></Table.Td>
      <Table.Td>{formatDiscount(voucher)}</Table.Td>
      <Table.Td>{voucher.usage_count} / {voucher.usage_limit}</Table.Td>
      <Table.Td>{formatDateTime(voucher.valid_from)} - {formatDateTime(voucher.valid_until)}</Table.Td>
      <Table.Td>
        <Badge color={voucher.is_active ? 'green' : 'gray'}>
          {voucher.is_active ? 'Kích hoạt' : 'Vô hiệu'}
        </Badge>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <div style={{ position: 'relative' }}>
      <LoadingOverlay visible={loading} />
      <Table striped highlightOnHover withTableBorder>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Mã Voucher</Table.Th>
            <Table.Th>Giá trị giảm</Table.Th>
            <Table.Th>Lượt sử dụng</Table.Th>
            <Table.Th>Thời gian hiệu lực</Table.Th>
            <Table.Th>Trạng thái</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.length > 0 ? rows : <Table.Tr><Table.Td colSpan={5} align="center">Chưa có voucher nào.</Table.Td></Table.Tr>}
        </Table.Tbody>
      </Table>
    </div>
  );
}
