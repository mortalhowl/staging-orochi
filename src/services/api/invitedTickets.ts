// src/services/api/invitedTickets.ts
import { ApiService } from './base';
import { getSupabaseFnError } from '@/utils/supabaseFnError';

// Định nghĩa kiểu dữ liệu cho một khách mời
interface Guest {
  email: string;
  fullName: string;
  quantity: number;
}

// Định nghĩa kiểu dữ liệu cho payload gửi đi
interface CreateInvitedTicketsPayload {
  eventId: string;
  ticketTypeId: string;
  guests: Guest[];
}

/**
 * Lớp dịch vụ để xử lý việc tạo vé mời.
 */
export class InvitedTicketsApiService extends ApiService {
  /**
   * Gửi yêu cầu tạo vé mời cho một danh sách khách.
   * @param payload Dữ liệu chứa eventId, ticketTypeId, và danh sách khách mời.
   */
  public async createTickets(payload: CreateInvitedTicketsPayload): Promise<any> {
    try {
      const { data, error } = await this.client.functions.invoke('create-invited-tickets', {
        body: payload,
      });

      if (error) {
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

export const InvitedTicketsApi = new InvitedTicketsApiService();