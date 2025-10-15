// src/services/api/vouchers.ts
import { ApiService } from './base';
import type { Voucher } from '@/types';

interface VoucherFilters {
  page?: number;
  limit?: number;
  searchTerm?: string;
  isActive?: string | null;
}

/**
 * Lớp dịch vụ để quản lý các hoạt động liên quan đến vouchers.
 */
export class VouchersApiService extends ApiService {
  /**
   * Lấy danh sách vouchers đã phân trang và lọc.
   * @param filters Các tùy chọn lọc và phân trang.
   * @returns Một object chứa danh sách vouchers và tổng số lượng.
   */
  public async getVouchers(filters: VoucherFilters = {}): Promise<{ data: Voucher[], count: number }> {
    const {
      page = 1,
      limit = 20,
      searchTerm = '',
      isActive = null,
    } = filters;

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    try {
      const rpcParams = {
        search_term: searchTerm,
        p_is_active: isActive === null ? null : isActive === 'true',
      };

      const dataPromise = this.client.rpc('search_vouchers', rpcParams).range(from, to);
      const countPromise = this.client.rpc('count_vouchers', rpcParams);

      const [dataRes, countRes] = await Promise.all([dataPromise, countPromise]);

      if (dataRes.error) throw dataRes.error;
      if (countRes.error) throw countRes.error;

      return {
        data: dataRes.data as Voucher[],
        count: countRes.data ?? 0,
      };
    } catch (error) {
      throw this.handleError(error, 'lấy danh sách vouchers');
    }
  }
}

export const VouchersApi = new VouchersApiService();