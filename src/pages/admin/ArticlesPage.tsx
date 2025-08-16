import { useState, useEffect } from 'react';
import { Title, Button, Group, Paper, TextInput, Select, Pagination, SimpleGrid, Container } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconPlus, IconSearch } from '@tabler/icons-react';
import { supabase } from '../../services/supabaseClient';
import { ArticlesTable } from '../../components/admin/articles/ArticlesTable';
import { ArticleFormModal } from '../../components/admin/articles/ArticleFormModal';
import { ArticleDetailDrawer } from '../../components/admin/articles/ArticleDetailDrawer';
import { ArticlesToolbar } from '../../components/admin/articles/ArticlesToolbar';
import type { Article } from '../../types';
import { useDebounce } from 'use-debounce';
import { notifications } from '@mantine/notifications';
import { useAuthStore } from '../../store/authStore';

const ITEMS_PER_PAGE = 10;
interface EventSelectItem { value: string; label: string; }

export function ArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<EventSelectItem[]>([]);
  const [selection, setSelection] = useState<string[]>([]);
  const [activePage, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [eventFilter, setEventFilter] = useState<string | null>(null);
  const [debouncedSearchTerm] = useDebounce(searchTerm, 400);

  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  const [drawerOpened, { open: openDrawer, close: closeDrawer }] = useDisclosure(false);
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [articleToEdit, setArticleToEdit] = useState<Article | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const { hasEditPermission } = useAuthStore(); 
  const canEditArticles = hasEditPermission('articles');

  useEffect(() => {
    const fetchPageData = async () => {
      setLoading(true);
      setSelection([]);

      const from = (activePage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      // 1. Query để lấy dữ liệu trang hiện tại (bỏ { count: 'exact' })
      let dataQuery = supabase
        .from('articles')
        .select('*, events(id, title)')
        .order('created_at', { ascending: false })
        .range(from, to);

      if (debouncedSearchTerm) {
        dataQuery = dataQuery.ilike('title', `%${debouncedSearchTerm}%`);
      }
      if (eventFilter) {
        dataQuery = dataQuery.eq('event_id', eventFilter);
      }
      
      // 2. Query để đếm tổng số lượng, sử dụng RPC
      const countParams = {
        search_term: debouncedSearchTerm,
        p_event_id: eventFilter,
      };
      const countPromise = supabase.rpc('count_articles', countParams);

      // 3. Chạy cả hai query song song
      const [dataRes, countRes] = await Promise.all([dataQuery, countPromise]);

      if (dataRes.error || countRes.error) {
        notifications.show({ title: 'Lỗi', message: 'Không thể tải danh sách bài viết.', color: 'red' });
        console.error(dataRes.error || countRes.error);
      } else {
        setArticles(dataRes.data as Article[]);
        // 4. Lấy tổng số lượng từ kết quả của RPC
        setTotalItems(countRes.data ?? 0);
      }
      setLoading(false);
    };

    fetchPageData();
  }, [activePage, debouncedSearchTerm, eventFilter, refreshKey]);
  
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

  const handleSuccess = () => setRefreshKey((prev) => prev + 1);
  const handleRowClick = (articleId: string) => { setSelectedArticleId(articleId); openDrawer(); };
  const handleAddNew = () => { setArticleToEdit(null); openModal(); };
  const handleEdit = (article: Article) => { setArticleToEdit(article); closeDrawer(); openModal(); };
  const handleCloseModal = () => { closeModal(); setArticleToEdit(null); };

  return (
    <Container size="xl">
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
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.currentTarget.value)}
          />
          <Select
            placeholder="Lọc theo sự kiện"
            data={events}
            value={eventFilter}
            onChange={setEventFilter}
            searchable
            clearable
          />
        </SimpleGrid>

        {selection.length > 0 && (
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
            total={Math.ceil(totalItems / ITEMS_PER_PAGE)}
            value={activePage}
            onChange={setPage}
            withEdges // Thêm withEdges cho nhất quán
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
