import { createClient } from '@supabase/supabase-js';

// Lấy URL và Key từ file .env.local mà chúng ta đã cấu hình
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Kiểm tra để chắc chắn rằng các biến môi trường đã được cung cấp
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and Anon Key must be provided in .env.local');
}

// Tạo và export một instance của Supabase client để sử dụng trong toàn bộ ứng dụng
export const supabase = createClient(supabaseUrl, supabaseAnonKey);