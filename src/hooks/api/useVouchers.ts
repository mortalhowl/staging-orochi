// src/hooks/api/useVouchers.ts
import { useState, useEffect, useCallback } from 'react';
import { notifications } from '@mantine/notifications';
import { useDebounce } from 'use-debounce';
import { VouchersApi } from '@/services/api/vouchers';
import type { Voucher } from '@/types';

const ITEMS_PER_PAGE = 20;

export function useVouchers() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0);
  const [activePage, setPage] = useState(1);

  const [filters, setFilters] = useState({
    search: '',
    isActive: null as string | null,
  });
  const [debouncedSearch] = useDebounce(filters.search, 400);

  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  useEffect(() => {
    const fetchVouchers = async () => {
      setLoading(true);
      try {
        const result = await VouchersApi.getVouchers({
          page: activePage,
          limit: ITEMS_PER_PAGE,
          searchTerm: debouncedSearch,
          isActive: filters.isActive,
        });
        setVouchers(result.data);
        setTotalItems(result.count);
      } catch (error) {
        notifications.show({
          title: 'Lỗi',
          message: error instanceof Error ? error.message : 'Không thể tải danh sách voucher.',
          color: 'red',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchVouchers();
  }, [activePage, debouncedSearch, filters.isActive, refreshKey]);

  return {
    vouchers,
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