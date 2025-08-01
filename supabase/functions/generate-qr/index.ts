import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  // Xử lý CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { transactionId } = await req.json();
    if (!transactionId) {
      throw new Error('Transaction ID is required');
    }

    // Tạo Supabase client với quyền admin để truy vấn an toàn
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Lấy thông tin giao dịch để biết số tiền
    const { data: transaction, error: transError } = await supabaseAdmin
      .from('transactions')
      .select('total_amount')
      .eq('id', transactionId)
      .single();
    if (transError) throw transError;

    // 2. Lấy thông tin ngân hàng đã cấu hình
    const { data: bankConfig, error: bankError } = await supabaseAdmin
      .from('bank_configs')
      .select('*')
      .limit(1)
      .single();
    if (bankError) throw bankError;

    // 3. Chuẩn bị dữ liệu và gọi API VietQR
    const vietQRBody = {
      accountNo: bankConfig.account_number,
      accountName: bankConfig.account_name,
      acqId: bankConfig.bank_bin,
      amount: transaction.total_amount,
      addInfo: transactionId, // Nội dung chuyển khoản chính là ID giao dịch
      template: bankConfig.qr_template,
    };

    const vietQRResponse = await fetch('https://api.vietqr.io/v2/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(vietQRBody),
    });

    if (!vietQRResponse.ok) {
      throw new Error('Failed to generate QR code from VietQR API');
    }

    const qrData = await vietQRResponse.json();

    // 4. Trả về dữ liệu QR cho frontend
    return new Response(JSON.stringify({ qrDataURL: qrData.data.qrDataURL }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});