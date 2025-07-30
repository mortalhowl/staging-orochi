import { useState, useEffect } from 'react';
import { Table, Button, Group, Title, LoadingOverlay, Text, ActionIcon, Tooltip, Badge } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconPlus, IconPencil, IconTrash } from '@tabler/icons-react';
import { supabase } from '../../../services/supabaseClient';
import { TicketTypeFormModal } from './TicketTypeFormModal';
import type { TicketType } from '../../../types';
import { modals } from '@mantine/modals';

interface TicketTypeListProps { eventId: string; }

const statusMapping: { [key in TicketType['status']]: { label: string; color: string } } = {
  public: { label: 'Công khai', color: 'green' },
  hidden: { label: 'Ẩn', color: 'gray' },
  invited: { label: 'Vé mời', color: 'violet' },
};

export function TicketTypeList({ eventId }: TicketTypeListProps) {
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  const [editingTicket, setEditingTicket] = useState<TicketType | null>(null);

    const fetchTicketTypes = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('ticket_types').select('*').eq('event_id', eventId);
    if (error) console.error('Error fetching ticket types');
    else setTicketTypes(data);
    setLoading(false);
  };
  useEffect(() => { fetchTicketTypes(); }, [eventId]);

  const handleAddNew = () => { setEditingTicket(null); openModal(); };
  const handleEdit = (ticket: TicketType) => { setEditingTicket(ticket); openModal(); };
  const handleCloseModal = () => { setEditingTicket(null); closeModal(); };
  
  const handleDelete = (ticket: TicketType) => {
    modals.openConfirmModal({
      title: 'Xác nhận xóa',
      children: <Text size="sm">Bạn có chắc muốn xóa vé "<b>{ticket.name}</b>"?</Text>,
      labels: { confirm: 'Xóa', cancel: 'Hủy' },
      onConfirm: async () => {
        await supabase.from('ticket_types').delete().eq('id', ticket.id);
        fetchTicketTypes();
      },
    });
  };

  const rows = ticketTypes.map((item) => (
    <Table.Tr key={item.id}>
      <Table.Td>
        <Tooltip label={item.name} withArrow>
          <Text truncate="end" style={{ maxWidth: 150 }}>{item.name}</Text>
        </Tooltip>
      </Table.Td>
      <Table.Td>{item.price.toLocaleString('vi-VN')}đ</Table.Td>
      <Table.Td>{item.quantity_sold} / {item.quantity_total === null ? '∞' : item.quantity_total}</Table.Td>
      <Table.Td><Badge color={statusMapping[item.status].color}>{statusMapping[item.status].label}</Badge></Table.Td>
      <Table.Td>
        <Group gap="xs">
          <ActionIcon variant="subtle" onClick={() => handleEdit(item)}><IconPencil size={16} /></ActionIcon>
          <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(item)}><IconTrash size={16} /></ActionIcon>
        </Group>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <>
      <Group justify="space-between" mb="md">
        <Title order={4}>Các loại vé</Title>
        <Button onClick={handleAddNew} size="xs" leftSection={<IconPlus size={16} />}>Thêm loại vé</Button>
      </Group>
      <div style={{ position: 'relative' }}>
        <LoadingOverlay visible={loading} />
        <Table>
          <Table.Thead>
            <Table.Tr><Table.Th>Tên vé</Table.Th><Table.Th>Giá</Table.Th><Table.Th>Đã bán/SL</Table.Th><Table.Th>Trạng thái</Table.Th><Table.Th></Table.Th></Table.Tr>
          </Table.Thead>
          <Table.Tbody>{rows.length > 0 ? rows : <Table.Tr><Table.Td colSpan={5} align="center"><Text>Chưa có loại vé nào</Text></Table.Td></Table.Tr>}</Table.Tbody>
        </Table>
      </div>
      <TicketTypeFormModal opened={modalOpened} onClose={handleCloseModal} onSuccess={fetchTicketTypes} eventId={eventId} ticketTypeToEdit={editingTicket} />
    </>
  );
}