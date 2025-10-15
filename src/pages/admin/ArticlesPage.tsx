// src/pages/admin/ArticlesPage.tsx
import { useState, useEffect } from 'react';
import { Title, Button, Group, Paper, TextInput, Select, Pagination, SimpleGrid, Container } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconPlus, IconSearch } from '@tabler/icons-react';

// Import các components và hooks đã được tái cấu trúc
import { ArticlesTable } from '../../components/admin/articles/ArticlesTable';
import { ArticleFormModal } from '../../components/admin/articles/ArticleFormModal';
import { ArticleDetailDrawer } from '../../components/admin/articles/ArticleDetailDrawer';
import { ArticlesToolbar } from '../../components/admin/articles/ArticlesToolbar';
import { useAuthStore } from '../../store/authStore';
import { useArticles } from '../../hooks/api/useArticles'; // <-- SỬ DỤNG CUSTOM HOOK
import { supabase } from '../../services/supabaseClient'; // Vẫn cần dùng để lấy danh sách events cho filter
import type { Article } from '../../types';

interface EventSelectItem { value: string; label: string; }

export function ArticlesPage() {
  // Toàn bộ logic về state và fetching bài viết được đóng gói trong hook này
  const {
    articles,
    loading,
    totalItems,
    activePage,
    setPage,
    filters,
    setFilters,
    refresh,
    itemsPerPage,
  } = useArticles();

  // State cho UI vẫn giữ lại ở component
  const [events, setEvents] = useState<EventSelectItem[]>([]);
  const [selection, setSelection] = useState<string[]>([]);
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  const [drawerOpened, { open: openDrawer, close: closeDrawer }] = useDisclosure(false);
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [articleToEdit, setArticleToEdit] = useState<Article | null>(null);

  const { hasEditPermission } = useAuthStore();
  const canEditArticles = hasEditPermission('articles');

  // Effect này chỉ để lấy danh sách sự kiện cho dropdown filter
  useEffect(() => {
    const fetchEventsForSelect = async () => {
      const { data } = await supabase.from('events').select('id, title');
      if (data) {
        const eventOptions = data.map((event) => ({
          value: event.id,
          label: event.title,
        }));
        setEvents(eventOptions);
      }
    };
    fetchEventsForSelect();
  }, []);

  const handleSuccess = () => {
    refresh();
    setSelection([]);
  };

  const handleRowClick = (articleId: string) => {
    setSelectedArticleId(articleId);
    openDrawer();
  };

  const handleAddNew = () => {
    setArticleToEdit(null);
    openModal();
  };

  const handleEdit = (article: Article) => {
    setArticleToEdit(article);
    closeDrawer();
    openModal();
  };

  const handleCloseModal = () => {
    closeModal();
    setArticleToEdit(null);
  };
  
  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1); // Reset về trang 1 khi filter
  };

  return (
    <Container size="xl" mt="md">
      <Group justify="space-between" mb="lg">
        <Title order={2}>Bài viết</Title>
        {canEditArticles && (
          <Button onClick={handleAddNew} leftSection={<IconPlus size={16} />}>Thêm bài viết</Button>
        )}
      </Group>

      <Paper withBorder p="md" radius="md">
        <SimpleGrid cols={{ base: 1, sm: 2 }} mb="md">
          <TextInput
            placeholder="Tìm kiếm theo tiêu đề..."
            leftSection={<IconSearch size={16} />}
            value={filters.searchTerm}
            onChange={(event) => handleFilterChange('searchTerm', event.currentTarget.value)}
          />
          <Select
            placeholder="Lọc theo sự kiện"
            data={events}
            value={filters.eventId}
            onChange={(value) => handleFilterChange('eventId', value)}
            searchable
            clearable
          />
        </SimpleGrid>

        {selection.length > 0 && canEditArticles && (
          <ArticlesToolbar
            selection={selection}
            onSuccess={handleSuccess}
            clearSelection={() => setSelection([])}
          />
        )}

        <ArticlesTable
          articles={articles}
          loading={loading}
          selection={selection}
          setSelection={setSelection}
          onRowClick={handleRowClick}
          canEdit={canEditArticles}
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

      <ArticleFormModal
        opened={modalOpened}
        onClose={handleCloseModal}
        onSuccess={handleSuccess}
        events={events}
        articleToEdit={articleToEdit}
      />
      
      <ArticleDetailDrawer
        articleId={selectedArticleId}
        opened={drawerOpened}
        onClose={closeDrawer}
        onSuccess={handleSuccess}
        onEdit={handleEdit}
        canEdit={canEditArticles}
      />
    </Container>
  );
}