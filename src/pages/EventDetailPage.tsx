// src/pages/EventDetailPage.tsx
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import type { EventWithDetails } from '../types';
import { Container, Loader, Center, Alert, Image, Title, Text, Grid, Stack, Divider, Group, ActionIcon } from '@mantine/core';
import { IconAlertCircle, IconCalendar, IconMapPin, IconClock } from '@tabler/icons-react';
import { TicketSelection } from '../components/public/TicketSelection';
import { ArticleGrid } from '../components/public/ArticleGrid';
import { formatDate } from '../utils/formatters';

const formatDateRange = (start: string, end: string) => {
  const startDate = new Date(start).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const endDate = new Date(end).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  return `${startDate} - ${endDate}`;
};

export function EventDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [event, setEvent] = useState<EventWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEventDetails = async () => {
      if (!slug) return;

      setLoading(true);
      setError(null);

      // Query mạnh mẽ của Supabase:
      // - Lấy tất cả cột (*) từ bảng 'events'
      // - Đồng thời lấy tất cả cột (*) từ bảng 'ticket_types' liên quan
      // - Và tất cả cột (*) từ bảng 'articles' liên quan
      // - Lọc theo cột 'slug'
      // - .single() để chỉ trả về 1 đối tượng, không phải mảng
      const { data, error: fetchError } = await supabase
        .from('events')
        .select('*, ticket_types(*), articles(*)')
        .eq('slug', slug)
        .single();

      if (fetchError) {
        console.error('Error fetching event details:', fetchError);
        setError('Không tìm thấy sự kiện hoặc đã có lỗi xảy ra.');
      } else {
        setEvent(data as EventWithDetails);
      }
      setLoading(false);
    };

    fetchEventDetails();
  }, [slug]);

  if (loading) return <Center h="80vh"><Loader /></Center>;
  if (error) return <Container py="xl"><Alert icon={<IconAlertCircle size="1rem" />} title="Lỗi!" color="red">{error}</Alert></Container>;
  if (!event) return null;

  return (
    <>
      <Container size="lg" my="xl">
        <Image src={event.cover_image_url} w="100%" h="auto" mb="xl" style={{ borderRadius: "5px" }} />
        <Grid>
          <Grid.Col span={{ base: 12, md: 8 }}>
            <Stack>
              <Title order={2} style={{
                background: 'linear-gradient(45deg, #088e8b, #33b8b4)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontWeight: 700
              }}>
                {event.title}
              </Title>
              {/* <Stack gap="xs" align='stretch' justify='flex-start'>
                <Group><IconCalendar /><Text>{formatDateRange(event.start_time, event.end_time)}</Text></Group>
                <Group><IconMapPin /><Text>{event.location}</Text></Group>
                {event.sale_start_time && event.sale_end_time && (
                  <Group><IconClock /><Text>Thời gian bán vé: {formatDateRange(event.sale_start_time, event.sale_end_time)}</Text></Group>
                )}
              </Stack> */}

              <Stack mt="md" gap="xs">
                <Group align="center" wrap="nowrap">
                  <ActionIcon variant="gradient" gradient={{ deg: 45, from: '#088e8b', to: '#33b8b4' }} size="lg">
                    <IconCalendar size={18} />
                  </ActionIcon>
                  <div>
                    <Text fw={500}>Thời gian diễn ra</Text>
                    <Text size="sm" c="dimmed">
                      {formatDate(event.start_time)} - {formatDate(event.end_time)}
                    </Text>
                  </div>
                </Group>

                <Group align="center" wrap="nowrap">
                  <ActionIcon variant="gradient" gradient={{ deg: 45, from: '#088e8b', to: '#33b8b4' }} size="lg">
                    <IconMapPin size={18} />
                  </ActionIcon>
                  <div>
                    <Text fw={500}>Địa điểm</Text>
                    <Text size="sm" c="dimmed">{event.location}</Text>
                  </div>
                </Group>
                {event.sale_start_time && event.sale_end_time && (
                  <Group align="center" wrap="nowrap">
                    <ActionIcon variant="gradient" gradient={{ deg: 45, from: '#088e8b', to: '#33b8b4' }} size="lg">
                      <IconClock size={18} />
                    </ActionIcon>
                    <div>
                      <Text fw={500}>Thời gian bán vé</Text>
                      <Text size="sm" c="dimmed">
                        {/* {formatDate(event.sale_start_time)} - {formatDate(event.sale_end_time)} */}
                        {formatDateRange(event.sale_start_time, event.sale_end_time)}
                      </Text>
                    </div>
                  </Group>
                )}
              </Stack>
              <Divider my="md" />
              <div dangerouslySetInnerHTML={{ __html: event.description }} />
            </Stack>
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 4 }}>
            <TicketSelection event={event} />
          </Grid.Col>
        </Grid>
      </Container>
      <ArticleGrid articles={event.articles} />
    </>
  );
}