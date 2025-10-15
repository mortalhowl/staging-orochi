// src/hooks/api/useArticles.ts
import { useState, useEffect, useCallback } from 'react';
import { notifications } from '@mantine/notifications';
import { useDebounce } from 'use-debounce';
import { ArticlesApi } from '@/services/api/articles';
import type { Article } from '@/types';

const ITEMS_PER_PAGE = 10;

export function useArticles() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0);
  const [activePage, setPage] = useState(1);

  const [filters, setFilters] = useState({
    searchTerm: '',
    eventId: null as string | null,
  });
  const [debouncedSearchTerm] = useDebounce(filters.searchTerm, 400);

  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  useEffect(() => {
    const fetchArticles = async () => {
      setLoading(true);
      try {
        const result = await ArticlesApi.getArticles({
          page: activePage,
          limit: ITEMS_PER_PAGE,
          searchTerm: debouncedSearchTerm,
          eventId: filters.eventId,
        });
        setArticles(result.data);
        setTotalItems(result.count);
      } catch (error) {
        notifications.show({
          title: 'Lỗi',
          message: error instanceof Error ? error.message : 'Không thể tải danh sách bài viết.',
          color: 'red',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchArticles();
  }, [activePage, debouncedSearchTerm, filters.eventId, refreshKey]);

  return {
    articles,
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