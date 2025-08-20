import { createClient, SupabaseClient, User } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// Hàm để lấy thông tin người dùng từ JWT
async function getUser(supabaseClient: SupabaseClient, req: Request): Promise<User> {
  const authHeader = req.headers.get('Authorization')!
  const { data: { user } } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''))
  if (!user) throw new Error('User not found')
  return user
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { ticketId, eventId, performCheckIn } = await req.json()
    if (!ticketId || !eventId) throw new Error('Ticket ID and Event ID are required')

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    const staffUser = await getUser(supabaseAdmin, req)
    
    // Đảm bảo nhân viên soát vé tồn tại trong bảng public.users
    await supabaseAdmin.from('users').upsert({ id: staffUser.id, email: staffUser.email, full_name: staffUser.user_metadata.full_name }, { onConflict: 'id' });

    // Lấy thông tin vé
    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from('issued_tickets')
      .select('*, transactions(*, users(*)), ticket_types(name), checked_in_by_user:checked_in_by(full_name)')
      .eq('id', ticketId)
      .single()
    
    if (ticketError) throw new Error('INVALID_TICKET')

    // Kiểm tra vé có thuộc sự kiện đang check-in không
    const ticketEventId = ticket.transactions?.event_id || ticket.event_id;
    if (ticketEventId !== eventId) {
      throw new Error('WRONG_EVENT')
    }

    // KIỂM TRA MỚI: Kiểm tra trạng thái của vé
    if (ticket.status === 'disabled') {
      throw new Error('TICKET_DISABLED');
    }
    
    // Nếu chỉ là kiểm tra (chưa nhấn nút check-in)
    if (!performCheckIn) {
      const status = ticket.is_used ? 'ALREADY_USED' : 'VALID';
      return new Response(JSON.stringify({ status, ticket }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Nếu thực hiện check-in
    const { data: updatedTicket, error: updateError } = await supabaseAdmin
      .from('issued_tickets')
      .update({
        is_used: true,
        used_at: new Date().toISOString(),
        checked_in_by: staffUser.id,
      })
      .eq('id', ticketId)
      .eq('is_used', false)
      .select()
      .single()
    
    if (updateError || !updatedTicket) {
      throw new Error('CHECK_IN_FAILED')
    }

    return new Response(JSON.stringify({ status: 'SUCCESS', ticket: updatedTicket }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    const statusMap: { [key: string]: any } = {
      'INVALID_TICKET': { message: 'Mã vé không hợp lệ.', status: 404 },
      'WRONG_EVENT': { message: 'Vé này không thuộc sự kiện này.', status: 400 },
      'TICKET_DISABLED': { message: 'Vé này đã bị vô hiệu hóa.', status: 403 }, // Thêm lỗi mới
      'ALREADY_USED': { message: 'Vé đã được sử dụng.', status: 409 },
      'CHECK_IN_FAILED': { message: 'Vé vừa được người khác check-in hoặc đã có lỗi xảy ra.', status: 409 },
    }
    const errorResponse = statusMap[error.message] || { message: error.message, status: 500 }

    return new Response(JSON.stringify({ error: errorResponse.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: errorResponse.status,
    })
  }
})

