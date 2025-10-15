// src/pages/admin/UsersPage.tsx
import { Title, Button, Group, Paper, Pagination, Container } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconPlus } from '@tabler/icons-react';

// Import các components và hooks đã được tái cấu trúc
import { UsersTable } from '../../components/admin/users/UsersTable';
import { AddStaffModal } from '../../components/admin/users/AddStaffModal';
import { UsersToolbar } from '../../components/admin/users/UsersToolbar';
import { useAuthStore } from '../../store/authStore';
import { useUsers } from '../../hooks/api/useUsers'; // <-- SỬ DỤNG CUSTOM HOOK

export function UsersPage() {
  // Toàn bộ logic về state và fetching người dùng được đóng gói trong hook này
  const {
    users,
    loading,
    totalItems,
    activePage,
    setPage,
    filters,
    setFilters,
    refresh,
    itemsPerPage,
  } = useUsers();

  // State cho UI vẫn giữ lại ở component
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  const { hasEditPermission } = useAuthStore();
  const canEditUsers = hasEditPermission('users');

  const handleSuccess = () => {
    refresh();
  };

  return (
    <Container size="xl" mt="md">
      <Group justify="space-between" mb="xl">
        <Title order={2}>Người dùng</Title>
        {canEditUsers && (
          <Button onClick={openModal} leftSection={<IconPlus size={16} />}>
            Thêm nhân viên
          </Button>
        )}
      </Group>

      <UsersToolbar filters={filters} setFilters={setFilters} />

      <Paper withBorder p="md" radius="md">
        <UsersTable users={users} loading={loading} />
        <Group justify="center" mt="md">
          <Pagination
            total={Math.ceil(totalItems / itemsPerPage)}
            value={activePage}
            onChange={setPage}
            withEdges
          />
        </Group>
      </Paper>

      <AddStaffModal opened={modalOpened} onClose={closeModal} onSuccess={handleSuccess} />
    </Container>
  );
}