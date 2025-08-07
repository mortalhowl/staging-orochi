import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

console.log(`[LOG] Function Initializing: create-invited-tickets`);

Deno.serve(async (req) => {
  // Xử lý CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('[LOG] Invocation started.');
    const { eventId, ticketTypeId, guests } = await req.json();
    if (!eventId || !ticketTypeId || !guests || !Array.isArray(guests) || guests.length === 0) {
      throw new Error('Missing or invalid parameters: eventId, ticketTypeId, and guests are required.');
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    console.log('[LOG] Supabase admin client created.');

    // Lặp qua từng khách mời để xử lý
    for (const guest of guests) {
      if (!guest.email || !guest.fullName || !guest.quantity) continue;
      console.log(`[LOG] Processing guest: ${guest.email} with ${guest.quantity} tickets.`);

      // 1. UPSERT USER: Tìm hoặc tạo user mới dựa trên email
      const { data: user, error: userError } = await supabaseAdmin
        .from('users')
        .upsert({ email: guest.email, full_name: guest.fullName }, { onConflict: 'email' })
        .select()
        .single();
      if (userError) throw userError;

      // 2. Tạo giao dịch ảo
      const { data: transaction, error: transError } = await supabaseAdmin
        .from('transactions')
        .insert({ 
            event_id: eventId, 
            user_id: user.id, 
            total_amount: 0, 
            type: 'invitation', 
            status: 'paid', 
            paid_at: new Date().toISOString() 
        })
        .select()
        .single();
      if (transError) throw transError;

      // 3. Tạo mục chi tiết giao dịch
      await supabaseAdmin.from('transaction_items').insert({ 
          transaction_id: transaction.id, 
          ticket_type_id: ticketTypeId, 
          quantity: guest.quantity, 
          price: 0 
      });

      // 4. Tạo vé trong issued_tickets
      const ticketsToInsert = Array.from({ length: guest.quantity }, () => ({
        transaction_id: transaction.id,
        ticket_type_id: ticketTypeId,
      }));
      const { error: issuedTicketsError } = await supabaseAdmin.from('issued_tickets').insert(ticketsToInsert);
      if (issuedTicketsError) throw issuedTicketsError;
      console.log(`[LOG] Inserted tickets for ${guest.email}`);

      // 5. Cập nhật số lượng đã bán
      const { error: updateQtyError } = await supabaseAdmin.rpc('increment_quantity_sold', {
        p_ticket_type_id: ticketTypeId,
        p_quantity: guest.quantity
      });
      if (updateQtyError) throw updateQtyError;
      console.log(`[LOG] Updated quantity_sold for ticket type ${ticketTypeId}`);

      // 6. GỌI FUNCTION GỬI EMAIL (ĐÃ SỬA LẠI)
      // Gửi yêu cầu đi và không cần chờ (fire-and-forget)
      supabaseAdmin.functions.invoke('send-ticket-email', {
        body: { transactionId: transaction.id },
      }).then(({ error: invokeError }) => {
        if (invokeError) {
          // Log lỗi nếu có nhưng không làm dừng toàn bộ quá trình
          console.error(`[ERROR] Failed to invoke email function for invited transaction ${transaction.id}:`, invokeError);
        } else {
          console.log(`[LOG] Successfully invoked send-ticket-email for transaction ${transaction.id}`);
        }
      });
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    console.error('--- ERROR IN FUNCTION ---', error);
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
  }
})
