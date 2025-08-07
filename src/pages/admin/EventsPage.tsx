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
import { useDebounce } from 'use-debounce';
import { notifications } from '@mantine/notifications';

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
  const [debouncedSearchTerm] = useDebounce(searchTerm, 400);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      setSelection([]);

      const from = (activePage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      // 1. Query để lấy dữ liệu trang hiện tại (bỏ { count: 'exact' })
      let dataQuery = supabase
        .from('events')
        .select('*')
        .order(sorting.column, { ascending: sorting.direction === 'asc' })
        .range(from, to);

      if (debouncedSearchTerm) {
        dataQuery = dataQuery.ilike('title', `%${debouncedSearchTerm}%`);
      }
      if (statusFilter && statusFilter !== 'all') {
        dataQuery = dataQuery.eq('is_active', statusFilter === 'active');
      }
      
      // 2. Query để đếm tổng số lượng bằng RPC
      const countParams = {
        search_term: debouncedSearchTerm,
        p_is_active: statusFilter === null || statusFilter === 'all' ? null : statusFilter === 'active',
      };
      const countPromise = supabase.rpc('count_events', countParams);

      // 3. Chạy cả hai query song song
      const [dataRes, countRes] = await Promise.all([dataQuery, countPromise]);

      if (dataRes.error || countRes.error) {
        notifications.show({ title: 'Lỗi', message: 'Không thể tải danh sách sự kiện.', color: 'red' });
        console.error(dataRes.error || countRes.error);
      } else {
        setEvents(dataRes.data as Event[]);
        // 4. Lấy tổng số lượng từ kết quả của RPC
        setTotalItems(countRes.data ?? 0);
      }
      setLoading(false);
    };

    fetchEvents();
  }, [activePage, debouncedSearchTerm, statusFilter, sorting, refreshKey]);

  const handleSuccess = () => setRefreshKey(prev => prev + 1);
  const handleRowClick = (eventId: string) => { setSelectedEventId(eventId); openDrawer(); };
  const handleAddNew = () => { setEventToEdit(null); openModal(); };
  const handleEdit = (event: Event) => { setEventToEdit(event); closeDrawer(); openModal(); };
  const handleCloseModal = () => { closeModal(); setEventToEdit(null); };

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
          />
        </SimpleGrid>

        {selection.length > 0 && (
          <EventsToolbar
            selection={selection}
            onSuccess={handleSuccess}
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

        <Group justify="center" mt="md">
          <Pagination
            total={Math.ceil(totalItems / ITEMS_PER_PAGE)}
            value={activePage}
            onChange={setPage}
            withEdges
          />
        </Group>
      </Paper>

      <EventFormModal
        opened={modalOpened}
        onClose={handleCloseModal}
        onSuccess={handleSuccess}
        eventToEdit={eventToEdit}
      />

      <EventDetailDrawer
        eventId={selectedEventId}
        opened={drawerOpened}
        onClose={closeDrawer}
        onSuccess={handleSuccess}
        onEdit={handleEdit}
        refreshKey={refreshKey}
      />
    </>
  );
}
