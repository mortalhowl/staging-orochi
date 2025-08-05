import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { transactionIds } = await req.json()
    if (!transactionIds || !Array.isArray(transactionIds) || transactionIds.length === 0) {
      throw new Error('transactionIds is required and must be a non-empty array.')
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Bước 1: Cập nhật trạng thái hàng loạt
    const { error: updateError } = await supabaseAdmin
      .from('transactions')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .in('id', transactionIds)
      .eq('status', 'pending') // Chỉ cập nhật những giao dịch thực sự đang pending

    if (updateError) throw updateError

    // Bước 2: Tuần tự gọi function gửi email cho từng giao dịch
    for (const transactionId of transactionIds) {
      // Không cần await, để các lệnh gọi chạy ngầm
      supabaseAdmin.functions.invoke('send-ticket-email', {
        body: { transactionId },
      })
      // Thêm một khoảng trễ nhỏ để tránh quá tải
      await new Promise(resolve => setTimeout(resolve, 200)) 
    }

    return new Response(JSON.stringify({ success: true, message: `${transactionIds.length} transactions confirmed.` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})