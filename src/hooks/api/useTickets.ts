// src/hooks/api/useTickets.ts
import { useState, useEffect, useCallback } from 'react';
import { notifications } from '@mantine/notifications';
import { useDebounce } from 'use-debounce';
import { TicketsApi } from '@/services/api/tickets';
import type { FullTicketDetails } from '@/types';

const ITEMS_PER_PAGE = 20;

// Định nghĩa kiểu cho state thống kê
interface TicketStats {
  total_tickets: number;
  checked_in_count: number;
  not_checked_in_count: number;
  active_count: number;
  disabled_count: number;
}

export function useTickets() {
  const [tickets, setTickets] = useState<FullTicketDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0);
  const [activePage, setPage] = useState(1);
  const [stats, setStats] = useState<TicketStats | null>(null);

  const [filters, setFilters] = useState({
    search: '',
    eventId: null as string | null,
    isInvite: null as string | null,
    isUsed: null as string | null,
    status: null as string | null,
  });
  const [debouncedSearch] = useDebounce(filters.search, 400);

  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  useEffect(() => {
    const fetchTickets = async () => {
      setLoading(true);
      try {
        const result = await TicketsApi.getTickets({
          page: activePage,
          limit: ITEMS_PER_PAGE,
          searchTerm: debouncedSearch,
          eventId: filters.eventId,
          isInvite: filters.isInvite,
          isUsed: filters.isUsed,
          status: filters.status,
        });
        setTickets(result.data);
        setTotalItems(result.count);
        setStats(result.stats);
      } catch (error) {
        notifications.show({
          title: 'Lỗi',
          message: error instanceof Error ? error.message : 'Không thể tải danh sách vé.',
          color: 'red',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchTickets();
  }, [activePage, debouncedSearch, filters.eventId, filters.isInvite, filters.isUsed, filters.status, refreshKey]);

  return {
    tickets,
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