// utils/supabaseFnError.ts
import {
  FunctionsHttpError,
  FunctionsRelayError,
  FunctionsFetchError,
} from '@supabase/supabase-js';

export async function getSupabaseFnError(error: unknown): Promise<string> {
  // Trường hợp mới: error là instance của các lớp lỗi supabase
  if (error instanceof FunctionsHttpError) {
    try {
      const payload = await error.context.json(); // Response -> JSON
      return payload?.error || payload?.message || error.message;
    } catch {
      try {
        const text = await error.context.text();  // fallback nếu không phải JSON
        return text || error.message;
      } catch {
        return error.message;
      }
    }
  }
  if (error instanceof FunctionsRelayError || error instanceof FunctionsFetchError) {
    return error.message;
  }

  // Trường hợp cũ: error.context.body là string JSON
  const anyErr = error as any;
  if (anyErr?.context?.body && typeof anyErr.context.body === 'string') {
    try {
      const parsed = JSON.parse(anyErr.context.body);
      return parsed?.error || parsed?.message || anyErr.message || 'Đã có lỗi xảy ra.';
    } catch {
      return anyErr.message || 'Đã có lỗi xảy ra.';
    }
  }

  return (anyErr?.message as string) || 'Đã có lỗi xảy ra.';
}
