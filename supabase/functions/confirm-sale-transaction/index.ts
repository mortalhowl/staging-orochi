import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { transactionId } = await req.json();
    if (!transactionId) throw new Error('Transaction ID is required');

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Cập nhật trạng thái giao dịch thành 'paid'
    const { data: transaction, error: updateError } = await supabaseAdmin
      .from('transactions')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', transactionId)
      .select('id, event_id')
      .single();
    if (updateError) throw updateError;
    console.log(`[LOG] Transaction ${transactionId} status updated to 'paid'.`);

    // 2. Lấy các mục chi tiết của giao dịch
    const { data: items, error: itemsError } = await supabaseAdmin
      .from('transaction_items')
      .select('*')
      .eq('transaction_id', transactionId);
    if (itemsError) throw itemsError;

    // 3. Lặp qua từng mục để tạo vé và cập nhật số lượng
    for (const item of items) {
      // Tạo vé trong issued_tickets
      const ticketsToInsert = Array.from({ length: item.quantity }, () => ({
        transaction_id: transaction.id,
        ticket_type_id: item.ticket_type_id,
      }));
      const { error: issuedTicketsError } = await supabaseAdmin.from('issued_tickets').insert(ticketsToInsert);
      if (issuedTicketsError) throw issuedTicketsError;
      console.log(`[LOG] Inserted ${item.quantity} tickets for ticket_type ${item.ticket_type_id}.`);

      // Cập nhật số lượng đã bán
      const { error: updateQtyError } = await supabaseAdmin.rpc('increment_quantity_sold', {
        p_ticket_type_id: item.ticket_type_id,
        p_quantity: item.quantity
      });
      if (updateQtyError) throw updateQtyError;
      console.log(`[LOG] Updated quantity_sold for ticket type ${item.ticket_type_id}.`);
    }

    // 4. Gọi function gửi email (không cần chờ)
    supabaseAdmin.functions.invoke('send-ticket-email', {
      body: { transactionId },
    });
    console.log(`[LOG] Invoked send-ticket-email function for transaction ${transactionId}.`);

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    console.error('--- ERROR IN confirm-sale-transaction ---', error);
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
  }
})