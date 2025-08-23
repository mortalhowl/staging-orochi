import { Table, LoadingOverlay, Text, Badge, Group, Tooltip, Avatar, Box, ActionIcon, ScrollArea } from '@mantine/core';
import { IconCopy } from '@tabler/icons-react';
import { useClipboard } from '@mantine/hooks';
import { useNavigate } from 'react-router-dom';
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

const statusMapping: { [key in UserProfile['status']]: { label: string; color: string } } = {
  active: { label: 'Hoạt động', color: 'green' },
  disabled: { label: 'Vô hiệu hóa', color: 'red' },
};

export function UsersTable({ users, loading }: UsersTableProps) {
  const clipboard = useClipboard();
  const navigate = useNavigate();

  const rows = users.map((user) => (
    <Table.Tr 
      key={user.id} 
      onClick={() => navigate(`/admin/users/${user.id}`)}
      style={{ cursor: 'pointer' }}
    >
      <Table.Td>
        <Group align="center" gap="xs" wrap="nowrap">
          <Tooltip label={user.email}>
            <Group wrap='nowrap' gap="xs">
              <Avatar src={user.avatar_url} radius="xl" />
              <Box w={150}>
                <Text truncate maw={150} size="sm" fw={500}>{user.full_name}</Text>
                <Text truncate maw={150} size="xs" c="dimmed">{user.email}</Text>
                <Text truncate maw={150} size="xs" c="dimmed">{user.phone || 'N/A'}</Text>
              </Box>
            </Group>
          </Tooltip>
          <Tooltip label="Sao chép Email">
            <ActionIcon 
              variant="transparent" 
              color="gray" 
              onClick={(e) => {
                e.stopPropagation();
                clipboard.copy(user.email);
              }}
            >
              <IconCopy size={14} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Table.Td>
      <Table.Td>
        <Badge color={roleMapping[user.role].color} variant="light">
          {roleMapping[user.role].label}
        </Badge>
      </Table.Td>
      <Table.Td>
        <Badge color={statusMapping[user.status].color} variant="light">
          {statusMapping[user.status].label}
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
      <ScrollArea>
        <Table striped highlightOnHover withTableBorder miw={800}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Người dùng</Table.Th>
              <Table.Th>Vai trò</Table.Th>
              <Table.Th>Trạng thái</Table.Th>
              <Table.Th>Ngày tạo</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {rows.length > 0 ? rows : <Table.Tr><Table.Td colSpan={3} align="center" >Không có người dùng nào.</Table.Td></Table.Tr>}
          </Table.Tbody>
        </Table>
      </ScrollArea>
    </div>
  );
}
