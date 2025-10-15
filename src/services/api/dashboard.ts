// src/services/api/dashboard.ts
import { ApiService } from './base';

// Định nghĩa kiểu dữ liệu cho các tham số đầu vào
interface DateRangeParams {
  start_date: string;
  end_date: string;
}

/**
 * Lớp dịch vụ để lấy dữ liệu thống kê cho Dashboard.
 */
export class DashboardApiService extends ApiService {
  /**
   * Lấy dữ liệu thống kê tổng quan.
   * @param params Khoảng thời gian để lấy dữ liệu.
   */
  public async getOverviewStats(params: DateRangeParams) {
    try {
      const { data, error } = await this.client.rpc('get_dashboard_overview_stats', params);
      if (error) throw error;
      return data[0]; // RPC này trả về một mảng chứa một object
    } catch (error) {
      throw this.handleError(error, 'lấy dữ liệu thống kê tổng quan');
    }
  }

  /**
   * Lấy dữ liệu phân tích hiệu suất của các sự kiện.
   * @param params Khoảng thời gian để lấy dữ liệu.
   */
  public async getEventAnalytics(params: DateRangeParams) {
    try {
      const { data, error } = await this.client.rpc('get_event_analytics', params);
      if (error) throw error;
      return data;
    } catch (error) {
      throw this.handleError(error, 'lấy dữ liệu phân tích sự kiện');
    }
  }

  /**
   * Lấy dữ liệu phân tích các giao dịch.
   * @param params Khoảng thời gian để lấy dữ liệu.
   */
  public async getTransactionAnalytics(params: DateRangeParams) {
    try {
       const { data: statsData, error: statsError } = await this.client.rpc('get_transaction_analytics', params);
        if (statsError) throw statsError;

        // Lấy thêm các giao dịch gần đây để hiển thị
        const { data: recentTransData, error: recentTransError } = await this.client
            .from('transactions')
            .select('id, total_amount, status, created_at, users(full_name)')
            .order('created_at', { ascending: false })
            .limit(10);
        if (recentTransError) throw recentTransError;

        return {
            stats: statsData[0],
            recentTransactions: recentTransData
        };
    } catch (error) {
      throw this.handleError(error, 'lấy dữ liệu phân tích giao dịch');
    }
  }
}

export const DashboardApi = new DashboardApiService();