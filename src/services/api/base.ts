// src/services/api/base.ts
import { supabase } from '../supabaseClient';
import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Lớp dịch vụ cơ sở để tương tác với Supabase.
 * Cung cấp một client Supabase và một phương thức xử lý lỗi tập trung.
 */
export abstract class ApiService {
  protected readonly client: SupabaseClient;

  constructor() {
    this.client = supabase;
  }

  /**
   * Xử lý lỗi từ Supabase và trả về một đối tượng Error.
   * @param error Lỗi gốc từ Supabase.
   * @param context Một thông điệp ngữ cảnh để giúp debug.
   * @returns Một đối tượng Error với thông điệp đã được định dạng.
   */
  protected handleError(error: any, context: string): Error {
    // Trong tương lai, bạn có thể thêm logic gửi lỗi tới một dịch vụ giám sát như Sentry ở đây.
    console.error(`[ApiService Error: ${context}]`, error);
    return new Error(error?.message || `Đã xảy ra lỗi trong quá trình ${context.toLowerCase()}.`);
  }
}