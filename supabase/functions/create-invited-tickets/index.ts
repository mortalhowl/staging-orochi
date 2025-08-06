import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import nodemailer from 'npm:nodemailer'
import qrcode from 'npm:qrcode'

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

    // Lấy thông tin chung cần thiết (sự kiện, loại vé, mẫu email) một lần duy nhất để tối ưu
    const eventPromise = supabaseAdmin.from('events').select('title').eq('id', eventId).single();
    const ticketTypePromise = supabaseAdmin.from('ticket_types').select('name').eq('id', ticketTypeId).single();
    const templatePromise = supabaseAdmin.from('email_templates').select('*').eq('type', 'invitation_ticket').single();
    const emailConfigPromise = supabaseAdmin.from('email_configs').select('*').single();

    const [eventRes, ticketTypeRes, templateRes, emailConfigRes] = await Promise.all([eventPromise, ticketTypePromise, templatePromise, emailConfigPromise]);

    if (eventRes.error) throw new Error(`Event not found for ID: ${eventId}`);
    if (ticketTypeRes.error) throw new Error(`Ticket type not found for ID: ${ticketTypeId}`);
    if (templateRes.error || !templateRes.data) throw new Error('Invitation email template not found in database.');
    if (emailConfigRes.error || !emailConfigRes.data) throw new Error('Email config not found in database.');
    
    const event = eventRes.data;
    const ticketType = ticketTypeRes.data;
    const template = templateRes.data;
    const emailConfig = emailConfigRes.data;
    console.log('[LOG] Fetched common data successfully.');

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
      const { data: issuedTickets, error: issuedTicketsError } = await supabaseAdmin.from('issued_tickets').insert(ticketsToInsert).select('id');
      if (issuedTicketsError) throw issuedTicketsError;
      console.log(`[LOG] Inserted ${issuedTickets.length} tickets for ${guest.email}`);

      // 5. Cập nhật số lượng đã bán
      const { error: updateQtyError } = await supabaseAdmin.rpc('increment_quantity_sold', {
        p_ticket_type_id: ticketTypeId,
        p_quantity: guest.quantity
      });
      if (updateQtyError) throw updateQtyError;
      console.log(`[LOG] Updated quantity_sold for ticket type ${ticketTypeId}`);

      // 6. Gửi Email
      const generateTicketHtml = async (issuedTicket: { id: string }, index: number, total: number) => {
        const qrCodeDataURL = await qrcode.toDataURL(issuedTicket.id, { errorCorrectionLevel: 'H' });
        const cid = `qr_${issuedTicket.id}`;
        
        const html = `
          <div style="padding: 15px; border: 1px solid #ddd; border-radius: 8px; font-family: Arial, sans-serif; margin-bottom: 20px;">
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse: collapse;">
              <tr>
                <td style="padding: 0; vertical-align: top; width: 65%;">
                  <h3 style="margin: 0 0 10px 0; font-size: 18px; color: #088e8b;">${event.title}</h3>
                  <p style="margin: 4px 0; font-size: 14px;"><strong>Khách hàng:</strong></p>
                  <p style="margin: 0 0 8px 0; font-size: 14px;">${guest.fullName}</p>
                  <p style="margin: 4px 0; font-size: 14px;"><strong>Loại vé:</strong></p>
                  <p style="margin: 0 0 8px 0; font-size: 14px;">${ticketType.name}</p>
                  <p style="margin: 4px 0; font-size: 14px;"><strong>Mã vé:</strong></p>
                  <p style="margin: 0 0 8px 0; font-size: 12px;"><span style="color: #088e8b; font-family: monospace;">${issuedTicket.id}</span></p>
                </td>
                <td style="position: relative; width: 1px; padding: 0 15px;">
                  <div style="position: absolute; top: 10px; bottom: 10px; left: 50%; transform: translateX(-50%); border-left: 1px dashed #ccc;"></div>
                </td>
                <td align="center" style="padding: 0; vertical-align: top; width: 35%;">
                  <p style="font-size: 8px; color: #555; margin: 0 0 5px 0;"><strong>${index + 1} / ${total}</strong></p>
                  <img src="cid:${cid}" alt="QR Code" width="120" height="120" style="display: block; margin: 0 auto;" />
                  <p style="font-size: 8px; color: #555; margin-top: 5px;">Quét mã này tại cổng</p>
                </td>
              </tr>
            </table>
          </div>`;
        return { html, attachment: { path: qrCodeDataURL, cid } };
      };
      
      const ticketPromises = issuedTickets.map((ticket, index) => generateTicketHtml(ticket, index, issuedTickets.length));
      const generatedTickets = await Promise.all(ticketPromises);
      const allTicketsHtml = generatedTickets.map(t => t.html).join('');
      const attachments = generatedTickets.map(t => t.attachment);

      let content = template.content.replaceAll('{{danh_sach_ve}}', allTicketsHtml);
      let subject = template.subject.replaceAll('{{ten_su_kien}}', event.title);
      content = content.replaceAll('{{ten_khach_hang}}', guest.fullName);
      subject = subject.replaceAll('{{ten_khach_hang}}', guest.fullName);
      
      const finalHtml = `<div style="max-width: 600px; margin: 0 auto; padding: 15px; border: 1px solid #ddd; border-radius: 8px; font-family: Arial, sans-serif;">${content}</div>`;

      const transporter = nodemailer.createTransport({
        host: emailConfig.smtp_host,
        port: emailConfig.smtp_port,
        secure: emailConfig.smtp_port === 465,
        auth: { user: emailConfig.sender_email, pass: Deno.env.get('GMAIL_APP_PASSWORD') },
      });

      await transporter.sendMail({
        from: `"${event.title}" <${emailConfig.sender_email}>`,
        to: guest.email,
        subject: subject,
        html: finalHtml,
        attachments: attachments,
      });
      console.log(`[LOG] Email sent successfully to ${guest.email}`);
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    console.error('--- ERROR IN FUNCTION ---', error);
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
  }
})
