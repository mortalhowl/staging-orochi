// src/services/api/articles.ts
import { ApiService } from './base';
import type { Article } from '@/types';

interface ArticleFilters {
  page?: number;
  limit?: number;
  searchTerm?: string;
  eventId?: string | null;
}

/**
 * Lớp dịch vụ để quản lý các hoạt động liên quan đến bài viết.
 */
export class ArticlesApiService extends ApiService {
  /**
   * Lấy danh sách bài viết đã phân trang và lọc.
   * @param filters Các tùy chọn lọc và phân trang.
   * @returns Một object chứa danh sách bài viết và tổng số lượng.
   */
  public async getArticles(filters: ArticleFilters = {}): Promise<{ data: Article[], count: number }> {
    const {
      page = 1,
      limit = 10,
      searchTerm = '',
      eventId = null,
    } = filters;

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    try {
      // Query để lấy dữ liệu
      let dataQuery = this.client
        .from('articles')
        .select('*, events(id, title)')
        .order('created_at', { ascending: false })
        .range(from, to);

      if (searchTerm) {
        dataQuery = dataQuery.ilike('title', `%${searchTerm}%`);
      }
      if (eventId) {
        dataQuery = dataQuery.eq('event_id', eventId);
      }

      // Query để đếm
      const countParams = {
        search_term: searchTerm,
        p_event_id: eventId,
      };
      const countQuery = this.client.rpc('count_articles', countParams);

      const [dataRes, countRes] = await Promise.all([dataQuery, countQuery]);

      if (dataRes.error) throw dataRes.error;
      if (countRes.error) throw countRes.error;

      return {
        data: dataRes.data as Article[],
        count: countRes.data ?? 0,
      };
    } catch (error) {
      throw this.handleError(error, 'lấy danh sách bài viết');
    }
  }

    /**
   * Lấy chi tiết một bài viết bằng slug.
   * @param slug Slug của bài viết.
   * @returns Chi tiết bài viết.
   */
    public async getArticleBySlug(slug: string): Promise<Article | null> {
        try {
            const { data, error } = await this.client
                .from('articles')
                .select('*, events(title, slug)')
                .eq('slug', slug)
                .single();

            if (error) {
                if (error.code === 'PGRST116') return null; // Không tìm thấy
                throw error;
            }
            return data as Article;
        } catch (error) {
            throw this.handleError(error, `lấy chi tiết bài viết "${slug}"`);
        }
    }
}

export const ArticlesApi = new ArticlesApiService();