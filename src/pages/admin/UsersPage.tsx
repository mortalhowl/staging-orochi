import { useState, useEffect } from 'react';
import { Title, Button, Group, Paper, Pagination, Container } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { supabase } from '../../services/supabaseClient';
import type { UserProfile, UserRole } from '../../types';
import { UsersTable } from '../../components/admin/users/UsersTable';
import { AddStaffModal } from '../../components/admin/users/AddStaffModal';
import { useDisclosure } from '@mantine/hooks';
import { UsersToolbar } from '../../components/admin/users/UsersToolbar';
import { useDebounce } from 'use-debounce';
import { useAuthStore } from '../../store/authStore';

const ITEMS_PER_PAGE = 20;

export function UsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePage, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [filters, setFilters] = useState({ search: '', role: null as UserRole | null });
  const [debouncedSearch] = useDebounce(filters.search, 400);
  const { hasEditPermission } = useAuthStore();
  const canEditUsers = hasEditPermission('users');

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      const from = (activePage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      const rpcParams = { search_term: debouncedSearch, p_role: filters.role };

      const dataPromise = supabase.rpc('search_users', rpcParams).range(from, to);
      const countPromise = supabase.rpc('count_users', rpcParams);

      const [dataRes, countRes] = await Promise.all([dataPromise, countPromise]);

      if (dataRes.error || countRes.error) {
        console.error("Error fetching users:", dataRes.error || countRes.error);
      } else {
        setUsers(dataRes.data as UserProfile[]);
        setTotalItems(countRes.data ?? 0);
      }
      setLoading(false);
    };

    fetchUsers();
  }, [activePage, refreshKey, debouncedSearch, filters.role]);

  const handleSuccess = () => setRefreshKey(k => k + 1);

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
          <Pagination total={Math.ceil(totalItems / ITEMS_PER_PAGE)} value={activePage} onChange={setPage} withEdges />
        </Group>
      </Paper>

      <AddStaffModal opened={modalOpened} onClose={closeModal} onSuccess={handleSuccess} />
    </Container>
  );
}
