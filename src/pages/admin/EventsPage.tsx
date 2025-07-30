import { useState, useEffect } from 'react';
import { Title, Button, Group, Paper, TextInput, Select, Pagination, SimpleGrid } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconPlus, IconSearch } from '@tabler/icons-react';
import { supabase } from '../../services/supabaseClient';
import { EventsTable } from '../../components/admin/events/EventsTable';
import { EventFormModal } from '../../components/admin/events/EventFormModal';
import { EventDetailDrawer } from '../../components/admin/events/EventDetailDrawer';
import { EventsToolbar } from '../../components/admin/events/EventsToolbar';
import type { Event, Sorting } from '../../types';
import { useDebounce  } from 'use-debounce';

const ITEMS_PER_PAGE = 10;

export function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selection, setSelection] = useState<string[]>([]);
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  const [drawerOpened, { open: openDrawer, close: closeDrawer }] = useDisclosure(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [eventToEdit, setEventToEdit] = useState<Event | null>(null);
  const [refreshKey, setRefreshKey] = useState(0); 
  const [activePage, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>('all');
  const [sorting, setSorting] = useState<Sorting>({ column: 'created_at', direction: 'desc' });
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);

  const fetchEvents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching events:', error);
    } else {
      setEvents(data as Event[]);
      setRefreshKey((prevKey) => prevKey + 1); // 2. Thay đổi key mỗi khi fetch thành công
    }
    setLoading(false);
  };

useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      setSelection([]); // Reset lựa chọn khi filter thay đổi

      const from = (activePage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      let query = supabase.from('events').select('*', { count: 'exact' });

      if (debouncedSearchTerm) {
        query = query.ilike('title', `%${debouncedSearchTerm}%`);
      }
      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('is_active', statusFilter === 'active');
      }
      
      query = query.order(sorting.column, { ascending: sorting.direction === 'asc' });
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching events:', error);
      } else {
        setEvents(data as Event[]);
        setTotalItems(count ?? 0);
      }
      setLoading(false);
    };

    fetchEvents();
  }, [activePage, debouncedSearchTerm, statusFilter, sorting, refreshKey]);

  const handleRowClick = (eventId: string) => {
    setSelectedEventId(eventId);
    openDrawer();
  };

  const handleAddNew = () => {
    setEventToEdit(null);
    openModal();
  };

  const handleEdit = (event: Event) => {
    setEventToEdit(event);
    closeDrawer();
    openModal();
  };
  
  const handleCloseModal = () => {
    closeModal();
    setEventToEdit(null);
  }

  return (
    <>
      <Group justify="space-between" mb="lg">
        <Title order={2}>Quản lý Sự kiện</Title>
        <Button onClick={handleAddNew} leftSection={<IconPlus size={16} />}>
          Thêm sự kiện
        </Button>
      </Group>

      <Paper withBorder p="md" radius="md">
        <SimpleGrid cols={{ base: 1, sm: 2 }} mb="md">
          <TextInput
            placeholder="Tìm kiếm theo tên sự kiện..."
            leftSection={<IconSearch size={16} />}
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.currentTarget.value)}
          />
          <Select
            placeholder="Lọc theo trạng thái"
            data={[
              { value: 'all', label: 'Tất cả trạng thái' },
              { value: 'active', label: 'Đang hoạt động' },
              { value: 'inactive', label: 'Đã ẩn' },
            ]}
            value={statusFilter}
            onChange={setStatusFilter}
            clearable
            style={{maxWidth: '200px'}}

          />
        </SimpleGrid>

        {selection.length > 0 && (
          <EventsToolbar
            selection={selection}
            onSuccess={fetchEvents}
            clearSelection={() => setSelection([])}
          />
        )}

        <EventsTable
          events={events}
          loading={loading}
          selection={selection}
          setSelection={setSelection}
          onRowClick={handleRowClick}
          sorting={sorting}
          setSorting={setSorting}
        />

        <Group justify="right" mt="md">
          <Pagination
            total={Math.ceil(totalItems / ITEMS_PER_PAGE)}
            value={activePage}
            onChange={setPage}
          />
        </Group>
      </Paper>

      <EventFormModal
        opened={modalOpened}
        onClose={handleCloseModal}
        onSuccess={fetchEvents} // fetchEvents sẽ tự động cập nhật refreshKey
        eventToEdit={eventToEdit}
      />

      <EventDetailDrawer
        eventId={selectedEventId}
        opened={drawerOpened}
        onClose={closeDrawer}
        onSuccess={fetchEvents} // fetchEvents sẽ tự động cập nhật refreshKey
        onEdit={handleEdit}
        refreshKey={refreshKey} // 3. Truyền key xuống cho Drawer
      />
    </>
  );
}