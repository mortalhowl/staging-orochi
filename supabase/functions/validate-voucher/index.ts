import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

console.log(`[LOG] Function Initializing: validate-voucher`);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('[LOG] Invocation started.');
    const { voucherCode, orderAmount, eventId } = await req.json();
    console.log('[LOG] Input Data:', { voucherCode, orderAmount, eventId });

    if (!voucherCode || orderAmount === undefined || !eventId) {
      throw new Error('Voucher code, order amount, and event ID are required.');
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    console.log('[LOG] Supabase admin client created.');

    // Tìm voucher trong database
    console.log(`[LOG] Searching for voucher with code: ${voucherCode.toUpperCase()}`);
    const { data: voucher, error: voucherError } = await supabaseAdmin
      .from('vouchers')
      .select('*')
      .eq('code', voucherCode.toUpperCase())
      .single();

    if (voucherError || !voucher) {
      console.error('[ERROR] Voucher not found in database.', voucherError);
      throw new Error('Mã voucher không hợp lệ.');
    }
    console.log('[LOG] Voucher found:', voucher);

    // --- Bắt đầu kiểm tra các điều kiện ---
    console.log('[LOG] Starting validation checks...');
    if (!voucher.is_active) {
      throw new Error('Voucher này đã bị vô hiệu hóa.');
    }
    console.log('[LOG] Check 1/5: is_active -> PASSED');

    if (voucher.usage_count >= voucher.usage_limit) {
      throw new Error('Voucher đã hết lượt sử dụng.');
    }
    console.log('[LOG] Check 2/5: usage_limit -> PASSED');

    // 🔹 CHUYỂN min_order_amount lên trước
    if (orderAmount < voucher.min_order_amount) {
      throw new Error(
        `Đơn hàng phải có giá trị tối thiểu ${voucher.min_order_amount.toLocaleString('vi-VN')}đ.`
      );
    }
    console.log('[LOG] Check 3/5: min_order_amount -> PASSED');

    // 🔹 Sau đó mới check thời gian hiệu lực
    const now = new Date().getTime();
    const validFrom = new Date(voucher.valid_from).getTime();
    const validUntil = new Date(voucher.valid_until).getTime();

    if (now < validFrom || now > validUntil) {
      throw new Error('Voucher đã hết hạn hoặc chưa đến ngày sử dụng.');
    }
    console.log('[LOG] Check 4/5: date_validity -> PASSED');

    if (voucher.event_id && voucher.event_id !== eventId) {
      throw new Error('Voucher này không áp dụng cho sự kiện hiện tại.');
    }
    console.log('[LOG] Check 5/5: event_specific -> PASSED');

    // --- Tính toán số tiền giảm ---
    console.log('[LOG] Calculating discount amount...');
    let discountAmount = 0;
    if (voucher.discount_type === 'fixed') {
      discountAmount = voucher.discount_value;
    } else if (voucher.discount_type === 'percentage') {
      discountAmount = Math.floor((orderAmount * voucher.discount_value) / 100);
      if (voucher.max_discount_amount && discountAmount > voucher.max_discount_amount) {
        discountAmount = voucher.max_discount_amount;
      }
    }

    discountAmount = Math.min(discountAmount, orderAmount);
    const finalAmount = orderAmount - discountAmount;
    console.log('[LOG] Calculation complete:', { discountAmount, finalAmount });

    const responseBody = JSON.stringify({ success: true, voucher, discountAmount, finalAmount });
    console.log('[LOG] Function finished successfully. Sending response:', responseBody);
    return new Response(responseBody, {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('--- ERROR IN FUNCTION ---', error);
    const errorBody = JSON.stringify({ error: error.message });
    console.error('[LOG] Function failed. Sending error response:', errorBody);
    return new Response(errorBody, {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
