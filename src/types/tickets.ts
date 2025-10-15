// src/types/tickets.ts
export type TicketStatus = 'public' | 'hidden' | 'invited';

export interface TicketType {
  id: string;
  event_id: string;
  name: string;
  price: number;
  quantity_total: number | null;
  quantity_sold: number;
  description: string;
  status: TicketStatus;
  created_at: string;
  updated_at: string;
}

export interface FullTicketDetails {
  id: string;
  is_invite: boolean;
  is_used: boolean;
  used_at: string;
  created_at: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  event_name: string;
  ticket_type_name: string;
  checked_in_by_name: string | null;
  status: 'active' | 'disabled';
  transaction_id: string;
}