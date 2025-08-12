import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { ticketId, newStatus } = await req.json()
    if (!ticketId || !newStatus) {
      throw new Error('Ticket ID and new status are required.')
    }
    if (newStatus !== 'active' && newStatus !== 'disabled') {
      throw new Error('Invalid status provided.')
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data, error } = await supabaseAdmin
      .from('issued_tickets')
      .update({ status: newStatus })
      .eq('id', ticketId)
      .select()
      .single()

    if (error) throw error

    return new Response(JSON.stringify({ success: true, updatedTicket: data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
