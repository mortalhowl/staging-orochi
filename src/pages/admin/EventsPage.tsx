// src/pages/admin/EventsPage.tsx
import { useState } from 'react';
import { Title, Button, Group, Paper, TextInput, Select, Pagination, SimpleGrid, Container } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconPlus, IconSearch } from '@tabler/icons-react';

// Import các components và hooks đã được tái cấu trúc
import { EventsTable } from '../../components/admin/events/EventsTable';
import { EventFormModal } from '../../components/admin/events/EventFormModal';
import { EventDetailDrawer } from '../../components/admin/events/EventDetailDrawer';
import { EventsToolbar } from '../../components/admin/events/EventsToolbar';
import { useAuthStore } from '../../store/authStore';
import { useEvents } from '../../hooks/api/useEvents'; // <-- SỬ DỤNG CUSTOM HOOK
import type { Event } from '../../types';

export function EventsPage() {
  // Toàn bộ logic về state và fetching dữ liệu được đóng gói trong hook này
  const {
    events,
    loading,
    totalItems,
    activePage,
    setPage,
    filters,
    setFilters,
    sorting,
    setSorting,
    refresh,
    itemsPerPage,
  } = useEvents();

  const [selection, setSelection] = useState<string[]>([]);
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  const [drawerOpened, { open: openDrawer, close: closeDrawer }] = useDisclosure(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [eventToEdit, setEventToEdit] = useState<Event | null>(null);

  const { hasEditPermission } = useAuthStore();
  const canEditEvents = hasEditPermission('events');

  // Các hàm xử lý sự kiện
  const handleSuccess = () => {
    refresh(); // Gọi hàm refresh từ hook
    setSelection([]);
  };

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
  };

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1); // Reset về trang 1 khi filter thay đổi
  };

  return (
    <Container size="xl" mt="md">
      <Group justify="space-between" mb="lg">
        <Title order={2}>Sự kiện</Title>
        {canEditEvents && (
            <Button onClick={handleAddNew} leftSection={<IconPlus size={16} />}>Thêm</Button>
        )}
      </Group>

      <Paper withBorder p="md" radius="md">
        <SimpleGrid cols={{ base: 1, sm: 2 }} mb="md">
          <TextInput
            placeholder="Tìm kiếm theo tên sự kiện..."
            leftSection={<IconSearch size={16} />}
            value={filters.searchTerm}
            onChange={(event) => handleFilterChange('searchTerm', event.currentTarget.value)}
          />
          <Select
            placeholder="Lọc theo trạng thái"
            data={[
              { value: 'all', label: 'Tất cả trạng thái' },
              { value: 'active', label: 'Đang hoạt động' },
              { value: 'inactive', label: 'Đã ẩn' },
            ]}
            value={filters.status}
            onChange={(value) => handleFilterChange('status', value)}
          />
        </SimpleGrid>

        {selection.length > 0 && canEditEvents && (
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
          canEdit={canEditEvents}
        />

        <Group justify="center" mt="md">
          <Pagination
            total={Math.ceil(totalItems / itemsPerPage)}
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
        refreshKey={0} // Prop này có thể không cần nữa, nhưng giữ lại để tránh lỗi
        canEdit={canEditEvents}
      />
    </Container>
  );
}