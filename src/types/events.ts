// src/types/events.ts
import type { TicketType } from './tickets';
import type { Article } from './articles';

export interface Event {
  id: string;
  title: string;
  slug: string;
  description: string;
  location: string;
  start_time: string;
  end_time: string;
  cover_image_url: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  sale_start_time: string | null;
  sale_end_time: string | null;
}

export interface EventWithDetails extends Event {
  ticket_types: TicketType[];
  articles: Article[];
}