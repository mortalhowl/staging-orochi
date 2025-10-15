// src/types/transactions.ts
export interface TransactionWithDetails {
  id: string;
  total_amount: number;
  type: 'sale' | 'invitation'; 
  status: string;
  created_at: string;
  users: {
    email: string;
    full_name: string | null;
    phone: string | null;
    avatar_url: string | null;

  } | null;
  events: {
    title: string;
  } | null;
}