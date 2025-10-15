// src/types/articles.ts
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