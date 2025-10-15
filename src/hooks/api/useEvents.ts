// src/hooks/api/useEvents.ts
import { useState, useEffect, useCallback } from 'react';
import { notifications } from '@mantine/notifications';
import { useDebounce } from 'use-debounce';
import { EventsApi } from '@/services/api/events';
import type { Event, Sorting } from '@/types';

const ITEMS_PER_PAGE = 10;

export function useEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0);
  const [activePage, setPage] = useState(1);

  const [filters, setFilters] = useState({
    searchTerm: '',
    status: 'all',
  });
  const [debouncedSearchTerm] = useDebounce(filters.searchTerm, 400);

  const [sorting, setSorting] = useState<Sorting>({ column: 'created_at', direction: 'desc' });

  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const result = await EventsApi.getEvents({
          page: activePage,
          limit: ITEMS_PER_PAGE,
          searchTerm: debouncedSearchTerm,
          status: filters.status,
          sorting,
        });
        setEvents(result.data);
        setTotalItems(result.count);
      } catch (error) {
        notifications.show({
          title: 'Lỗi',
          message: error instanceof Error ? error.message : 'Không thể tải danh sách sự kiện.',
          color: 'red',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [activePage, debouncedSearchTerm, filters.status, sorting, refreshKey]);

  return {
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
    itemsPerPage: ITEMS_PER_PAGE,
  };
}