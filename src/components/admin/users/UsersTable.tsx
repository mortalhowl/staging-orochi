import { Table, LoadingOverlay, Text, Badge, Anchor } from '@mantine/core';
import { Link } from 'react-router-dom';
import type { UserProfile } from '../../../types';
import { formatDateTime } from '../../../utils/formatters';

interface UsersTableProps {
  users: UserProfile[];
  loading: boolean;
}

const roleMapping: { [key in UserProfile['role']]: { label: string; color: string } } = {
  admin: { label: 'Quản trị viên', color: 'red' },
  staff: { label: 'Nhân viên', color: 'blue' },
  viewer: { label: 'Khách hàng', color: 'gray' },
};

export function UsersTable({ users, loading }: UsersTableProps) {
  const rows = users.map((user) => (
    <Table.Tr key={user.id}>
      <Table.Td>
        <Anchor component={Link} to={`/admin/users/${user.id}`}>
          {user.full_name || 'Chưa có tên'}
        </Anchor>
      </Table.Td>
      <Table.Td>{user.email}</Table.Td>
      <Table.Td>
        <Badge color={roleMapping[user.role].color} variant="light">
          {roleMapping[user.role].label}
        </Badge>
      </Table.Td>
      <Table.Td>
        <Text size="sm" color="dimmed">
          {formatDateTime(user.created_at)}
        </Text>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <div style={{ position: 'relative' }}>
      <LoadingOverlay visible={loading} />
      <Table striped highlightOnHover withTableBorder>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Họ và tên</Table.Th>
            <Table.Th>Email</Table.Th>
            <Table.Th>Vai trò</Table.Th>
            <Table.Th>Ngày tạo</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.length > 0 ? rows : <Table.Tr><Table.Td colSpan={3} align="center">Không có người dùng nào.</Table.Td></Table.Tr>}
        </Table.Tbody>
      </Table>
    </div>
  );
}
