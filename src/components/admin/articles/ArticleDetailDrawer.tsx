import { Drawer, LoadingOverlay, Title, Text, Image, Stack, Group, Button, Divider, Paper } from '@mantine/core';
import { useEffect, useState } from 'react';
import type { Article } from '../../../types';
import { supabase } from '../../../services/supabaseClient';
import { notifications } from '@mantine/notifications';
import { modals } from '@mantine/modals';

interface ArticleDetailDrawerProps {
  articleId: string | null;
  opened: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onEdit: (article: Article) => void;
}

export function ArticleDetailDrawer({ articleId, opened, onClose, onSuccess, onEdit }: ArticleDetailDrawerProps) {
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchArticleDetail = async () => {
      if (!articleId) return;
      setLoading(true);
      try {
        const { data, error } = await supabase.from('articles').select('*, events(id, title)').eq('id', articleId).single();
        if (error) throw error;
        setArticle(data as Article);
      } catch (err: any) {
        notifications.show({ title: 'Lỗi', message: 'Không thể lấy dữ liệu chi tiết.', color: 'red' });
      } finally {
        setLoading(false);
      }
    };
    if (opened) fetchArticleDetail();
  }, [articleId, opened]);

  const handleDelete = () => {
    if (!article) return;
    modals.openConfirmModal({
      title: 'Xác nhận xóa bài viết',
      children: <Text size="sm">Bạn có chắc muốn xóa bài viết "<b>{article.title}</b>"?</Text>,
      labels: { confirm: 'Xóa', cancel: 'Hủy' },
      onConfirm: async () => {
        const { error } = await supabase.from('articles').delete().eq('id', article.id);
        if (error) {
          notifications.show({ title: 'Lỗi', message: 'Xóa bài viết thất bại.', color: 'red' });
        } else {
          notifications.show({ title: 'Thành công', message: 'Đã xóa bài viết.' });
          onSuccess();
          onClose();
        }
      },
    });
  };

  return (
    <Drawer opened={opened} onClose={onClose} title="Chi tiết bài viết" position="right" size="lg">
      <div style={{ position: 'relative', height: '100%' }}>
        <LoadingOverlay visible={loading} />
        {article && (
          <Stack justify="space-between" h="100%">
            <Stack>
              <Image radius="md" src={article.image_url || undefined} alt="Ảnh bìa" height={200} fallbackSrc="https://via.placeholder.com/400x200?text=No+Image" />
              <Title order={3}>{article.title}</Title>
              <Text c="dimmed">Sự kiện: {article.events?.title || 'Không có'}</Text>
              <Divider my="sm" />
              <Paper withBorder p="md" radius="sm" style={{ maxHeight: '40vh', overflowY: 'auto' }}>
                <div dangerouslySetInnerHTML={{ __html: article.content }} />
              </Paper>
            </Stack>
            <Group grow>
              <Button variant="default" onClick={() => onEdit(article)}>Sửa bài viết</Button>
              <Button color="red" onClick={handleDelete}>Xóa bài viết</Button>
            </Group>
          </Stack>
        )}
      </div>
    </Drawer>
  );
}