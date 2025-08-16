import { Table, LoadingOverlay, Text, Badge, Tooltip, ActionIcon, Group, Avatar, Box } from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { IconCopy } from '@tabler/icons-react';
// import { formatDateTime } from '../../../utils/formatters';

export interface FullTicketDetails {
  id: string;
  is_invite: boolean;
  is_used: boolean;
  used_at: string;
  created_at: string;
  customer_name: string;
  customer_email: string;
  event_name: string;
  ticket_type_name: string;
}

interface TicketsTableProps {
  tickets: FullTicketDetails[];
  loading: boolean;
  onRowClick: (ticketId: string) => void; // Thêm prop onRowClick
}

export function TicketsTable({ tickets, loading, onRowClick }: TicketsTableProps) {
  const clipboard = useClipboard();
  const rows = tickets.map((ticket) => (
    <Table.Tr key={ticket.id} onClick={() => onRowClick(ticket.id)} style={{ cursor: 'pointer' }}>
      <Table.Td>
        <Group gap="xs" wrap="nowrap">
          <Tooltip label={ticket.id} withArrow>
            <Text truncate maw={250}>{ticket.id}</Text>
          </Tooltip>
          <Tooltip label="Sao chép Mã ĐH">
            <ActionIcon variant="transparent" color="gray" onClick={(e) => { e.stopPropagation(); clipboard.copy(ticket.id); }}>
              <IconCopy size={14} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Table.Td>
      <Table.Td>
        <Group align="center" gap="xs" wrap="nowrap">
          <Tooltip label={ticket.customer_email}>
            <Group wrap='nowrap' gap="xs">
              <Avatar radius="xl" />
              <Box w={150}>
                <Text truncate maw={150} size="sm" fw={500}>{ticket.customer_name}</Text>
                <Text truncate maw={150} size="xs" c="dimmed">{ticket.customer_email}</Text>
              </Box>
            </Group>
          </Tooltip>
          <Tooltip label="Sao chép Email">
            <ActionIcon variant="transparent" color="gray" onClick={(e) => {
              e.stopPropagation();
              clipboard.copy(ticket.customer_email);
            }}>
              <IconCopy size={14} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Table.Td>
      <Table.Td>{ticket.event_name}</Table.Td>
      <Table.Td>{ticket.ticket_type_name}</Table.Td>
      <Table.Td>
        <Badge color={ticket.is_invite ? 'violet' : 'blue'}>
          {ticket.is_invite ? 'Vé mời' : 'Vé bán'}
        </Badge>
      </Table.Td>
      <Table.Td>
        <Badge color={ticket.is_used ? 'green' : 'gray'}>
          {ticket.is_used ? `Đã dùng ` : 'Chưa dùng'}
          {/* (${formatDateTime(ticket.used_at)}) */}
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
            <Table.Th>Mã vé</Table.Th>
            <Table.Th>Khách hàng</Table.Th>
            <Table.Th>Sự kiện</Table.Th>
            <Table.Th>Loại vé</Table.Th>
            <Table.Th>Nguồn gốc</Table.Th>
            <Table.Th>Trạng thái</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.length > 0 ? rows : <Table.Tr><Table.Td colSpan={7} align="center">Không tìm thấy vé nào.</Table.Td></Table.Tr>}
        </Table.Tbody>
      </Table>
    </div>
  );
}
