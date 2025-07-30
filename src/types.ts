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