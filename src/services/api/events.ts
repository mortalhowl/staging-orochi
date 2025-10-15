// src/services/api/events.ts
import { ApiService } from './base';
import type { Event, Sorting, EventWithDetails } from '@/types'; // Chút nữa chúng ta sẽ tạo file type này

// Định nghĩa các bộ lọc có thể áp dụng khi lấy danh sách sự kiện
interface EventFilters {
  page?: number;
  limit?: number;
  searchTerm?: string;
  status?: string | null;
  sorting?: Sorting;
}

/**
 * Lớp dịch vụ để quản lý các hoạt động liên quan đến sự kiện.
 */
export class EventsApiService extends ApiService {
  /**
   * Lấy danh sách sự kiện đã phân trang và lọc.
   * @param filters Các tùy chọn lọc và phân trang.
   * @returns Một object chứa danh sách sự kiện và tổng số lượng.
   */
  public async getEvents(filters: EventFilters = {}): Promise<{ data: Event[], count: number }> {
    const {
      page = 1,
      limit = 10,
      searchTerm = '',
      status = null,
      sorting = { column: 'created_at', direction: 'desc' }
    } = filters;

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    try {
      // Query để lấy dữ liệu
      let dataQuery = this.client
        .from('events')
        .select('*')
        .order(sorting.column, { ascending: sorting.direction === 'asc' })
        .range(from, to);

      if (searchTerm) {
        dataQuery = dataQuery.ilike('title', `%${searchTerm}%`);
      }
      if (status && status !== 'all') {
        dataQuery = dataQuery.eq('is_active', status === 'active');
      }

      // Query để đếm tổng số lượng
      const countParams = {
        search_term: searchTerm,
        p_is_active: status === null || status === 'all' ? null : status === 'active',
      };
      const countQuery = this.client.rpc('count_events', countParams);

      // Chạy cả hai query song song
      const [dataRes, countRes] = await Promise.all([dataQuery, countQuery]);

      if (dataRes.error) throw dataRes.error;
      if (countRes.error) throw countRes.error;

      return {
        data: dataRes.data as Event[],
        count: countRes.data ?? 0,
      };
    } catch (error) {
      throw this.handleError(error, 'lấy danh sách sự kiện');
    }
  }

    /**
   * Lấy chi tiết một sự kiện bằng slug.
   * @param slug Slug của sự kiện.
   * @returns Chi tiết sự kiện bao gồm cả loại vé và bài viết liên quan.
   */
  public async getEventBySlug(slug: string): Promise<EventWithDetails | null> {
    try {
        const { data, error } = await this.client
            .from('events')
            .select('*, ticket_types(*), articles(*)')
            .eq('slug', slug)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null; // Không tìm thấy, trả về null
            throw error;
        }
        return data as EventWithDetails;
    } catch (error) {
        throw this.handleError(error, `lấy chi tiết sự kiện "${slug}"`);
    }
  }

  // Các phương thức khác như createEvent, updateEvent, deleteEvent sẽ được thêm vào đây sau.
}

// Xuất ra một instance duy nhất để sử dụng trong toàn bộ ứng dụng (Singleton Pattern)
export const EventsApi = new EventsApiService();