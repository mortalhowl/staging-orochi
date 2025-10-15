// src/services/api/checkin.ts
import { ApiService } from './base';
import { getSupabaseFnError } from '@/utils/supabaseFnError';

interface CheckInPayload {
  ticketId: string;
  eventId: string | null;
  performCheckIn: boolean;
}

/**
 * Lớp dịch vụ để xử lý các hoạt động check-in vé.
 */
export class CheckInApiService extends ApiService {
  /**
   * Tra cứu hoặc thực hiện check-in cho một vé.
   * @param payload Dữ liệu chứa mã vé, sự kiện và hành động cần thực hiện.
   * @returns Kết quả từ Supabase Function.
   */
  public async lookupOrPerformCheckIn(payload: CheckInPayload) {
    try {
      const { data, error } = await this.client.functions.invoke('check-in-ticket', {
        body: payload,
      });

      if (error) {
        // Sử dụng helper để lấy thông điệp lỗi chính xác từ function
        const message = await getSupabaseFnError(error);
        throw new Error(message);
      }

      return data;
    } catch (error) {
      // Ném lại lỗi đã được xử lý để component có thể bắt và hiển thị
      throw error;
    }
  }
}

export const CheckInApi = new CheckInApiService();