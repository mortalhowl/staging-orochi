// src/components/public/EventCard.tsx
import { Card, Image, Text, Badge, Button, Group } from '@mantine/core';
import { Link } from 'react-router-dom';
import type { Event } from '../../../../types';

interface EventCardProps {
  event: Event;
}

const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('vi-VN', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric' 
  });
};

export function EventCard({ event }: EventCardProps) {
  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder component={Link} to={`/events/${event.slug}`}>
      <Card.Section style={{ backgroundColor: '#f8f9fa' }}>
        <Image
          src={event.cover_image_url || '/placeholder-image.jpg'}
          height={160}
          alt={event.title}
          fit="contain"
        />
      </Card.Section>

      <Group justify="space-between" mt="md" mb="xs">
        <Text fw={500} lineClamp={1}>{event.title}</Text>
        <Badge color="pink">{formatDate(event.start_time)}</Badge>
      </Group>

      <Text size="sm" c="dimmed" lineClamp={1}>
        {event.location || 'Địa điểm chưa xác định'}
      </Text>

      <Button color="blue" fullWidth mt="md" radius="md">
        Xem chi tiết
      </Button>
    </Card>
  );
}