// src/hooks/api/useTransactions.ts
import { useState, useEffect, useCallback } from 'react';
import { notifications } from '@mantine/notifications';
import { useDebounce } from 'use-debounce';
import { TransactionsApi } from '@/services/api/transactions';
import type { TransactionWithDetails } from '@/types';

const ITEMS_PER_PAGE = 15;

// Định nghĩa kiểu cho state thống kê
interface TransactionStats {
    total_transactions: number;
    paid_count: number;
    pending_count: number;
    total_revenue: number;
}

export function useTransactions() {
  const [transactions, setTransactions] = useState<TransactionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0);
  const [activePage, setPage] = useState(1);
  const [stats, setStats] = useState<TransactionStats | null>(null);

  const [filters, setFilters] = useState({
    search: '',
    eventId: null as string | null,
    status: null as string | null,
    dateRange: [null, null] as [Date | null, Date | null],
    type: null as 'sale' | 'invitation' | null
  });
  const [debouncedSearch] = useDebounce(filters.search, 400);

  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true);
      try {
        const result = await TransactionsApi.getTransactions({
          page: activePage,
          limit: ITEMS_PER_PAGE,
          searchTerm: debouncedSearch,
          status: filters.status,
          eventId: filters.eventId,
          dateRange: filters.dateRange,
          type: filters.type
        });
        setTransactions(result.data);
        setTotalItems(result.count);
        setStats(result.stats);
      } catch (error) {
        notifications.show({
          title: 'Lỗi',
          message: error instanceof Error ? error.message : 'Không thể tải danh sách giao dịch.',
          color: 'red',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [activePage, debouncedSearch, filters.status, filters.eventId, filters.dateRange, filters.type, refreshKey]);

  return {
    transactions,
    loading,
    totalItems,
    stats,
    activePage,
    setPage,
    filters,
    setFilters,
    refresh,
    itemsPerPage: ITEMS_PER_PAGE,
  };
}