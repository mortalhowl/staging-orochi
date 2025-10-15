// src/hooks/api/useUsers.ts
import { useState, useEffect, useCallback } from 'react';
import { notifications } from '@mantine/notifications';
import { useDebounce } from 'use-debounce';
import { UsersApi } from '@/services/api/users';
import type { UserProfile, UserRole } from '@/types';

const ITEMS_PER_PAGE = 20;

export function useUsers() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0);
  const [activePage, setPage] = useState(1);

  const [filters, setFilters] = useState({
    search: '',
    role: null as UserRole | null,
  });
  const [debouncedSearch] = useDebounce(filters.search, 400);

  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const result = await UsersApi.getUsers({
          page: activePage,
          limit: ITEMS_PER_PAGE,
          searchTerm: debouncedSearch,
          role: filters.role,
        });
        setUsers(result.data);
        setTotalItems(result.count);
      } catch (error) {
        notifications.show({
          title: 'Lỗi',
          message: error instanceof Error ? error.message : 'Không thể tải danh sách người dùng.',
          color: 'red',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [activePage, debouncedSearch, filters.role, refreshKey]);

  return {
    users,
    loading,
    totalItems,
    activePage,
    setPage,
    filters,
    setFilters,
    refresh,
    itemsPerPage: ITEMS_PER_PAGE,
  };
}