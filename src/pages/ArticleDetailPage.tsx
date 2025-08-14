import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import type { Article } from '../types';
import { Container, Loader, Center, Alert, Image, Title, Text, Paper, Anchor } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { formatDateTime } from '../utils/formatters';

export function ArticleDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchArticleDetails = async () => {
      if (!slug) return;
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('articles')
        .select('*, events(title, slug)')
        .eq('slug', slug)
        .single();

      if (fetchError) {
        console.error('Error fetching article details:', fetchError);
        setError('Không tìm thấy bài viết hoặc đã có lỗi xảy ra.');
      } else {
        setArticle(data as Article);
      }
      setLoading(false);
    };

    fetchArticleDetails();
  }, [slug]);

  if (loading) {
    return <Center h="80vh"><Loader /></Center>;
  }

  if (error) {
    return (
      <Container py="xl">
        <Alert icon={<IconAlertCircle size="1rem" />} title="Lỗi!" color="red">{error}</Alert>
      </Container>
    );
  }

  if (!article) return null;

  return (
    <Container size="md" my="xl">
      <Paper>
        {/* <Breadcrumbs mb="xl">{breadcrumbs}</Breadcrumbs> */}
        <Title order={1}
          style={{
            fontFamily: 'BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
            color: '#008a87',
            fontSize: '2rem',
            fontWeight: 700,
          }}>{article.title}</Title>
        <Text c="dimmed" size="sm" my="md">
          Đăng ngày: {formatDateTime(article.created_at)}
          {article.events && (
            <> | Thuộc sự kiện: <Anchor component={Link} to={`/events/${article.events.slug}`}>{article.events.title}</Anchor></>
          )}
        </Text>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            margin: '16px 0'
          }}
        >
          <Image
            src={article.image_url}
            radius="md"
            style={{
              maxHeight: '350px',
              maxWidth: '100%',
              height: 'auto',
              width: 'auto',
              objectFit: 'contain' // giữ nguyên tỉ lệ, không cắt
            }}
          />
        </div>

        <div dangerouslySetInnerHTML={{ __html: article.content }} />
      </Paper>
    </Container>
  );
}
