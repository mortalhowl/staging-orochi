// src/pages/HomePages.tsx
import { useState, useEffect } from 'react';
import { Container, Title, Loader, Center, Text, Grid, Image, Button, Paper, Badge, Box } from '@mantine/core';
import { supabase } from '../services/supabaseClient';
import type { Event, Article } from '../types';
import { Carousel } from '@mantine/carousel';
import { Link } from 'react-router-dom';

// Component con cho một slide sự kiện trong Carousel
function EventSlide({ event }: { event: Event }) {
  return (
    <Paper radius="md" style={{ overflow: 'hidden' }}>
      <Grid gutter="xl" align="center" my="xs">
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Box
            style={{
              borderRadius: '1.3rem',
              padding: '4px',
              background: 'linear-gradient(45deg, #088e8b, #A0E9FF, #FFB5E8)',
            }}
          >
            <Image
              src={event.cover_image_url || '/placeholder-image.jpg'}
              radius="lg"
            />
          </Box>
          {/* <Image 
            src={event.cover_image_url || '/placeholder-image.jpg'} 
            height="auto"
            fit="contain"
            style={{ backgroundColor: '#f8f9fa' }}
          /> */}
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 4 }} p="xl" style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}>
          <Title order={1} c="#008a87" mb="md">
            {event.title.toUpperCase()}
          </Title>
          <Text lineClamp={5} mb="xl">
            {event.description}
          </Text>
          <Button
            component={Link}
            to={`/events/${event.slug}`}
            size="md"
            radius="md"
            style={{ alignSelf: 'flex-start' }}
            bg="#008a87"
          >
            Mua vé
          </Button>
        </Grid.Col>
      </Grid>
    </Paper>
  );
}

// Component con cho một bài viết
function ArticleRow({ article, reverse }: { article: Article; reverse: boolean }) {
  const content = (
    <>
      {article.events && (
        <Badge
          component={Link}
          to={`/events/${article.events.slug}`}
          variant="light"
          mb="sm"
          style={{ alignSelf: 'flex-start' }}
        >
          {article.events.title}
        </Badge>
      )}
      <Title order={2} c="#008a87" mb="md" fw="bold">
        {article.title?.toUpperCase()}
      </Title>
      <Text lineClamp={5}>
        {article.content?.replace(/<[^>]+>/g, '')}
      </Text>
    </>
  );

  const image = (

    <Box
      style={{
        borderRadius: '1.3rem',
        padding: '4px',
        background: 'linear-gradient(45deg, #088e8b, #A0E9FF, #FFB5E8)',
      }}
    >
      <Image
        src={article.image_url || '/placeholder-image.jpg'}
        radius="lg"
      />
    </Box>

    // <Image 
    //   src={article.image_url || '/placeholder-image.jpg'} 
    //   radius="md"
    //   height="auto"
    //   fit="contain"
    //   style={{ backgroundColor: '#f8f9fa' }}
    // />
  );

  return (
    <Grid gutter="xl" align="center" my="xl">
      {reverse ? (
        <>
          <Grid.Col span={{ base: 12, md: 7 }} order={{ base: 2, md: 1 }}>
            {content}
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 5 }} order={{ base: 1, md: 2 }}>
            {image}
          </Grid.Col>
        </>
      ) : (
        <>
          <Grid.Col span={{ base: 12, md: 5 }}>
            {image}
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 7 }}>
            {content}
          </Grid.Col>
        </>
      )}
    </Grid>
  );
}

export function HomePage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHomepageData = async () => {
      setLoading(true);

      const eventsPromise = supabase
        .from('events')
        .select('*')
        .eq('is_active', true)
        .order('start_time', { ascending: true })
        .limit(5);

      const articlesPromise = supabase
        .from('articles')
        .select('*, events(title, slug)')
        .eq('status', 'public')
        .not('event_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(10);

      const [eventsRes, articlesRes] = await Promise.all([eventsPromise, articlesPromise]);

      if (eventsRes.data) setEvents(eventsRes.data as Event[]);
      if (articlesRes.data) {
        const validArticles = (articlesRes.data as Article[]).filter(article => article.events);
        setArticles(validArticles);
      }

      setLoading(false);
    };

    fetchHomepageData();
  }, []);

  if (loading) {
    return <Center h="80vh"><Loader /></Center>;
  }

  return (
    <Container size="lg" py="xl">
      {/* Khu vực Sự kiện */}
      {events.length > 0 && (
        <Carousel
          withIndicators
          height="auto"
          slideSize="100%"
          slideGap="md"
          pb="xl"
          styles={{
            indicators: {
              bottom: 1,
              position: 'absolute',
            },
          }}
        >
          {events.map((event) => (
            <Carousel.Slide key={event.id}>
              <EventSlide event={event} />
            </Carousel.Slide>
          ))}
        </Carousel>
      )}

      {/* Khu vực Bài viết */}
      {articles.length > 0 && (
        <div style={{ marginTop: '3rem' }}>
          <Title order={2} ta="center" mb="xl">
            Khách mời & Tin tức
          </Title>
          {articles.map((article, index) => (
            <ArticleRow
              key={article.id}
              article={article}
              reverse={index % 2 !== 0}
            />
          ))}
        </div>
      )}
    </Container>
  );
}