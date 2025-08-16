import { Drawer, LoadingOverlay, Title, Text, Image, Stack, Group, Button, Badge } from '@mantine/core';
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
  canEdit: boolean;
}

export function ArticleDetailDrawer({ articleId, opened, onClose, onSuccess, onEdit, canEdit }: ArticleDetailDrawerProps) {
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
    <Drawer opened={opened} onClose={onClose} title="Chi tiết bài viết" position="right" size="md">
      <div style={{ position: 'relative', height: '100%' }}>
        <LoadingOverlay visible={loading} />
        {article && (
          <Stack justify="space-between" h="calc(100vh - 100px)">
            <Stack>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  margin: '16px 0'
                }}
              >
                <Image
                  src={article.image_url || '/placeholder-image.jpg'}
                  radius="md"
                  style={{
                    maxHeight: '350px',
                    maxWidth: '100%',
                    height: 'auto',
                    width: 'auto',
                    objectFit: 'contain'
                  }}
                />
              </div>

              <Group justify="space-between">
                <Title order={3}
                  style={{
                    fontFamily: 'BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
                    color: '#008a87',
                    fontSize: '1.5rem',
                    fontWeight: 700,
                  }}>{article.title}
                </Title>
                <Badge color={article.status === 'public' ? 'green' : 'red'}>
                  {article.status === 'public' ? 'Công khai' : 'Ẩn'}
                </Badge>
              </Group>
              <div style={{ marginBottom: 16 }}>
                <Text size="sm" c="dimmed">
                  Ngày tạo: {new Date(article.created_at).toLocaleDateString('vi-VN')} | Sự kiện: {article.events?.title || 'Không có'}
                </Text>
                <Text size="sl" my="0px" dangerouslySetInnerHTML={{ __html: article.content }} />
              </div>
            </Stack>
            {canEdit && (
            <Group justify="flex-end" gap="sm" >
              <Button variant="default" onClick={() => onEdit(article)}>Sửa</Button>
              <Button color="red" onClick={handleDelete}>Xóa</Button>
            </Group>
            )}
          </Stack>
        )}
      </div>
    </Drawer>
  );
}