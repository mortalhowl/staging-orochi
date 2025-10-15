import { Grid, Card, Image, Text, Title, Container } from '@mantine/core';
import { Link } from 'react-router-dom';
import type { Article } from '../../../types';

interface ArticleGridProps {
  articles: Article[];
}

export function ArticleGrid({ articles }: ArticleGridProps) {
  const publicArticles = articles.filter(article => article.status === 'public').slice(0, 4);

  if (!publicArticles || publicArticles.length === 0) {
    return null;
  }

  return (
    <Container size="lg" py="xl" mt="xl">
      <Title order={3} ta="center" mb="xl"
        style={{
          fontFamily: 'BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
          color: '#008a87',
          fontSize: '1.5rem',
          fontWeight: 700,
        }}
      >
        Bài viết liên quan
      </Title>
      <Grid>
        {publicArticles.map((article) => (
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }} key={article.id}>
            <Card shadow="sm" padding="lg" radius="md" withBorder component={Link} to={`/articles/${article.slug}`}>
              <Card.Section>
                <Image src={article.image_url} height="auto" alt={article.title} />
              </Card.Section>
              <Text fw="bold" mt="md" mb="xs" truncate="end"
                style={{
                  fontFamily: 'BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif',
                  color: '#008a87',
                  fontSize: '1rem',
                  fontWeight: 700,
                }}
              >{article.title}</Text>
              <Text size="sm" c="dimmed" lineClamp={2}>
                {article.content?.replace(/<[^>]+>/g, '')}
              </Text>
            </Card>
          </Grid.Col>
        ))}
      </Grid>
    </Container>
  );
}