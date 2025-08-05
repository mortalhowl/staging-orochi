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

export interface Sorting {
  column: keyof Event | 'created_at';
  direction: 'asc' | 'desc';
}

export type TicketStatus = 'public' | 'hidden' | 'invited';

export interface TicketType {
  id: string;
  event_id: string;
  name: string;
  price: number;
  quantity_total: number | null; // Cho phép null
  quantity_sold: number;
  description: string;
  status: TicketStatus;
  created_at: string;
  updated_at: string;
}

export interface EventWithDetails extends Event {
  ticket_types: TicketType[];
  articles: Article[];
}

export type ArticleStatus = 'public' | 'hidden';
export interface Article {
  id: string;
  event_id: string | null;
  slug: string;
  title: string;
  content: string;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  status: ArticleStatus;
  events: {
    id: string;
    title: string;
    slug: string;
  } | null;
}

export interface TransactionWithDetails {
  id: string;
  total_amount: number;
  status: string;
  created_at: string;
  users: {
    email: string;
    full_name: string | null;
  } | null;
  events: {
    title: string;
  } | null;
}