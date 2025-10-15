// src/services/api/transactions.ts
import { ApiService } from './base';
import type { TransactionWithDetails } from '@/types';

// Định nghĩa các bộ lọc có thể áp dụng
interface TransactionFilters {
    page?: number;
    limit?: number;
    searchTerm?: string;
    status?: string | null;
    eventId?: string | null;
    dateRange?: [Date | null, Date | null];
    type?: 'sale' | 'invitation' | null;
}

// Định nghĩa kiểu dữ liệu cho phần thống kê
interface TransactionStats {
    total_transactions: number;
    paid_count: number;
    pending_count: number;
    total_revenue: number;
}

/**
 * Lớp dịch vụ để quản lý các hoạt động liên quan đến giao dịch.
 */
export class TransactionsApiService extends ApiService {
    /**
     * Lấy danh sách giao dịch đã phân trang và lọc, cùng với các số liệu thống kê.
     * @param filters Các tùy chọn lọc và phân trang.
     * @returns Một object chứa danh sách giao dịch, tổng số lượng và các số liệu thống kê.
     */
    public async getTransactions(filters: TransactionFilters = {}): Promise<{ data: TransactionWithDetails[], count: number, stats: TransactionStats | null }> {
        const {
            page = 1,
            limit = 15,
            searchTerm = '',
            status = null,
            eventId = null,
            dateRange = [null, null],
            type = null
        } = filters;

        const from = (page - 1) * limit;
        const to = from + limit - 1;

        try {
            const rpcParams = {
                search_term: searchTerm,
                p_status: status,
                p_event_id: eventId,
                p_start_date: dateRange[0] ? dateRange[0].toISOString() : null,
                p_type: type,
                p_end_date: dateRange[1] ? (() => {
                    const endDate = new Date(dateRange[1]!);
                    endDate.setHours(23, 59, 59, 999);
                    return endDate.toISOString();
                })() : null,
            };

            // Query để lấy dữ liệu
            const dataPromise = this.client
                .rpc('search_transactions', rpcParams)
                .select('*, users(email, phone, full_name, avatar_url), events(title)')
                .order('created_at', { ascending: false })
                .range(from, to);

            // Query để đếm
            const countPromise = this.client.rpc('count_transactions', rpcParams);

            // Query để lấy thống kê
            const statsPromise = this.client.rpc('get_transaction_stats', rpcParams).single();

            const [dataRes, countRes, statsRes] = await Promise.all([dataPromise, countPromise, statsPromise]);

            if (dataRes.error) throw dataRes.error;
            if (countRes.error) throw countRes.error;
            if (statsRes.error) throw statsRes.error;

            return {
                data: dataRes.data as TransactionWithDetails[],
                count: countRes.data ?? 0,
                stats: statsRes.data as TransactionStats,
            };
        } catch (error) {
            throw this.handleError(error, 'lấy danh sách giao dịch');
        }
    }

    /**
       * Lấy TẤT CẢ giao dịch phù hợp với bộ lọc để xuất file Excel.
       * @param filters Các tùy chọn lọc.
       * @returns Một danh sách đầy đủ các giao dịch với chi tiếtรายการ.
       */
    public async getAllTransactionsForExport(filters: Omit<TransactionFilters, 'page' | 'limit'>): Promise<any[]> {
        const {
            searchTerm = '',
            status = null,
            eventId = null,
            dateRange = [null, null],
        } = filters;

        try {
            const rpcParams = {
                search_term: searchTerm,
                p_status: status,
                p_event_id: eventId,
                p_start_date: dateRange[0] ? dateRange[0].toISOString() : null,
                p_end_date: dateRange[1] ? (() => {
                    const endDate = new Date(dateRange[1]!);
                    endDate.setHours(23, 59, 59, 999);
                    return endDate.toISOString();
                })() : null,
            };

            const { data, error } = await this.client
                .rpc('search_transactions', rpcParams)
                .select('*, users(full_name, email), events(title), transaction_items(*, ticket_types(name, price))')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            throw this.handleError(error, 'xuất dữ liệu giao dịch');
        }
    }
}

export const TransactionsApi = new TransactionsApiService();