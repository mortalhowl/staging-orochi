import { useState, useEffect } from 'react';
import { Title, Button, Group, Paper, Pagination } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { supabase } from '../../services/supabaseClient';
import type { UserProfile } from '../../types';
import { UsersTable } from '../../components/admin/users/UsersTable';
import { AddStaffModal } from '../../components/admin/users/AddStaffModal';
import { useDisclosure } from '@mantine/hooks';

const ITEMS_PER_PAGE = 20;

export function UsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePage, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  const [refreshKey, setRefreshKey] = useState(0); // State để trigger việc tải lại dữ liệu

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      const from = (activePage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      const { data, error, count } = await supabase
        .from('users')
        .select('*', { count: 'exact' })
        .order('role')
        .range(from, to);

      if (error) {
        console.error("Error fetching users:", error);
      } else {
        setUsers(data as UserProfile[]);
        setTotalItems(count ?? 0);
      }
      setLoading(false);
    };

    fetchUsers();
  }, [activePage, refreshKey]); // `useEffect` sẽ chạy lại khi `refreshKey` thay đổi

  const handleSuccess = () => {
    setRefreshKey(k => k + 1); // Hàm này sẽ thay đổi `refreshKey`
  };

  return (
    <>
      <Group justify="space-between" mb="xl">
        <Title order={2}>Quản lý Người dùng</Title>
        <Button onClick={openModal} leftSection={<IconPlus size={16} />}>
          Thêm nhân viên
        </Button>
      </Group>

      <Paper withBorder p="md" radius="md">
        <UsersTable users={users} loading={loading} />
        <Group justify="center" mt="md">
          <Pagination
            total={Math.ceil(totalItems / ITEMS_PER_PAGE)}
            value={activePage}
            onChange={setPage}
            withEdges
          />
        </Group>
      </Paper>
      
      {/* SỬA LỖI Ở ĐÂY: Gọi `handleSuccess` thay vì `fetchUsers` */}
      <AddStaffModal opened={modalOpened} onClose={closeModal} onSuccess={handleSuccess} />
    </>
  );
}
