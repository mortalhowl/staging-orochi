// src/services/api/tickets.ts
import { ApiService } from './base';
import type { FullTicketDetails } from '@/types';

// Định nghĩa các bộ lọc có thể áp dụng
interface TicketFilters {
    page?: number;
    limit?: number;
    searchTerm?: string;
    eventId?: string | null;
    isInvite?: string | null;
    isUsed?: string | null;
    status?: string | null;
}

// Định nghĩa kiểu dữ liệu cho phần thống kê vé
interface TicketStats {
    total_tickets: number;
    checked_in_count: number;
    not_checked_in_count: number;
    active_count: number;
    disabled_count: number;
}

/**
 * Lớp dịch vụ để quản lý các hoạt động liên quan đến vé đã phát hành.
 */
export class TicketsApiService extends ApiService {
    /**
     * Lấy danh sách vé đã phân trang, lọc, cùng với các số liệu thống kê.
     * @param filters Các tùy chọn lọc và phân trang.
     * @returns Một object chứa danh sách vé, tổng số lượng và các số liệu thống kê.
     */
    public async getTickets(filters: TicketFilters = {}): Promise<{ data: FullTicketDetails[], count: number, stats: TicketStats | null }> {
        const {
            page = 1,
            limit = 20,
            searchTerm = '',
            eventId = null,
            isInvite = null,
            isUsed = null,
            status = null,
        } = filters;

        const from = (page - 1) * limit;
        const to = from + limit - 1;

        try {
            const rpcParams = {
                search_term: searchTerm,
                p_event_id: eventId,
                p_is_invite: isInvite === null ? null : isInvite === 'true',
                p_is_used: isUsed === null ? null : isUsed === 'true',
                p_status: status,
            };

            // Query để lấy dữ liệu
            const dataPromise = this.client
                .rpc('search_issued_tickets', rpcParams)
                .order('created_at', { ascending: false })
                .range(from, to);

            // Query để đếm
            const countPromise = this.client.rpc('count_issued_tickets', rpcParams);

            // Query để lấy thống kê
            const statsPromise = this.client.rpc('get_issued_tickets_stats', rpcParams).single();

            const [dataRes, countRes, statsRes] = await Promise.all([dataPromise, countPromise, statsPromise]);

            if (dataRes.error) throw dataRes.error;
            if (countRes.error) throw countRes.error;
            if (statsRes.error) throw statsRes.error;

            return {
                data: dataRes.data as FullTicketDetails[],
                count: countRes.data ?? 0,
                stats: statsRes.data as TicketStats,
            };
        } catch (error) {
            throw this.handleError(error, 'lấy danh sách vé');
        }
    }

    /**
       * Lấy TẤT CẢ vé phù hợp với bộ lọc để xuất file Excel.
       * @param filters Các tùy chọn lọc.
       * @returns Một danh sách đầy đủ các vé với chi tiết.
       */
    public async getAllTicketsForExport(filters: Omit<TicketFilters, 'page' | 'limit'>): Promise<FullTicketDetails[]> {
        const {
            searchTerm = '',
            eventId = null,
            isInvite = null,
            isUsed = null,
            status = null,
        } = filters;

        try {
            const rpcParams = {
                search_term: searchTerm,
                p_event_id: eventId,
                p_is_invite: isInvite === null ? null : isInvite === 'true',
                p_is_used: isUsed === null ? null : isUsed === 'true',
                p_status: status,
            };

            const { data, error } = await this.client
                .rpc('search_issued_tickets', rpcParams)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return (data as FullTicketDetails[]) || [];
        } catch (error) {
            throw this.handleError(error, 'xuất dữ liệu vé');
        }
    }
}

export const TicketsApi = new TicketsApiService();