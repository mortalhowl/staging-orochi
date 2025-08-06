import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import nodemailer from 'npm:nodemailer';
import qrcode from 'npm:qrcode';

console.log(`[LOG] Function Initializing at ${new Date().toISOString()}`);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log(`[LOG] Invocation started at ${new Date().toISOString()}`);
    
    const body = await req.json();
    const { transactionId } = body;
    console.log('[LOG] Input Data:', body);

    if (!transactionId) {
      throw new Error('Transaction ID is required in the request body.');
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    console.log('[LOG] Supabase admin client created.');

    // 1. Lấy dữ liệu, JOIN trực tiếp ticket_types từ issued_tickets
    console.log('[LOG] Fetching all necessary data...');
    const { data: transaction, error } = await supabaseAdmin
      .from('transactions')
      .select('*, users(*), events(*), issued_tickets(id, ticket_types(name))')
      .eq('id', transactionId)
      .single();
    if (error) throw error;
    console.log('[LOG] Fetched transaction data successfully.');

    const { data: template } = await supabaseAdmin.from('email_templates').select('*').eq('type', 'resend_ticket').single();
    if (!template) throw new Error('Email template "resend_ticket" not found');
    console.log('[LOG] Fetched email template successfully.');
    
    const { data: emailConfig } = await supabaseAdmin.from('email_configs').select('*').single();
    if (!emailConfig) throw new Error('Email config not found');
    console.log('[LOG] Fetched email config successfully.');

    // 2. Hàm để tạo HTML và file đính kèm cho từng vé
    const generateTicketHtml = async (issuedTicket: any, index: number, total: number) => {
      const qrCodeDataURL = await qrcode.toDataURL(issuedTicket.id);
      const cid = `qr_${issuedTicket.id}`;
      const ticketTypeName = issuedTicket.ticket_types?.name || 'Không xác định';

      const html = `
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse: collapse;">
            <tr>
              <td style="padding: 0; vertical-align: top; width: 65%;">
                <h3 style="margin: 0 0 10px 0; font-size: 18px; color: #088e8b;">${transaction.events.title}</h3>
                <p style="margin: 4px 0; font-size: 14px;"><strong>Khách hàng:</strong></p>
                <p style="margin: 0 0 8px 0; font-size: 14px;">${transaction.users.full_name}</p>
                <p style="margin: 4px 0; font-size: 14px;"><strong>Loại vé:</strong></p>
                <p style="margin: 0 0 8px 0; font-size: 14px;">${ticketTypeName}</p>
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
          </table>`;

      return { html, attachment: { path: qrCodeDataURL, cid } };
    };

    // 3. Tạo tất cả vé
    console.log(`[LOG] Generating ${transaction.issued_tickets.length} tickets...`);
    const ticketPromises = transaction.issued_tickets.map((ticket, index) => 
        generateTicketHtml(ticket, index, transaction.issued_tickets.length)
    );
    const generatedTickets = await Promise.all(ticketPromises);
    
    const allTicketsHtml = generatedTickets.map(t => t.html).join('');
    const attachments = generatedTickets.map(t => t.attachment);
    console.log('[LOG] All ticket HTML and attachments generated.');

    // 4. Thay thế placeholder
    let content = template.content;
    let subject = template.subject;
    const replacements = {
        '{{ten_khach_hang}}': transaction.users.full_name,
        '{{ten_su_kien}}': transaction.events.title,
        '{{ma_don_hang}}': transaction.id.split('-')[0].toUpperCase(),
        '{{tong_tien}}': transaction.total_amount.toLocaleString('vi-VN') + 'đ',
        '{{danh_sach_ve}}': allTicketsHtml,
    };

    for (const [key, value] of Object.entries(replacements)) {
        content = content.replaceAll(key, value || '');
        subject = subject.replaceAll(key, value || '');
    }
    console.log('[LOG] Placeholders replaced. Final subject:', subject);

    // 5. Bọc toàn bộ nội dung email vào div chung
    const finalHtml = `<div style="max-width: 600px; margin: 0 auto; padding: 15px; border: 1px solid #ddd; border-radius: 8px; font-family: Arial, sans-serif;">${content}</div>`;

    // 6. Gửi email bằng Nodemailer
    const transporter = nodemailer.createTransport({
      host: emailConfig.smtp_host,
      port: emailConfig.smtp_port,
      secure: emailConfig.smtp_port === 465,
      auth: {
        user: emailConfig.sender_email,
        pass: Deno.env.get('GMAIL_APP_PASSWORD'),
      },
    });

    const mailOptions = {
      from: `"${transaction.events.title}" <${emailConfig.sender_email}>`,
      to: transaction.users.email,
      subject: subject,
      html: finalHtml,
      attachments: attachments, // Nhúng ảnh QR
    };

    console.log('[LOG] Sending email to:', mailOptions.to);
    const info = await transporter.sendMail(mailOptions);
    console.log('[LOG] Email sent successfully! Message ID:', info.messageId);

    await transporter.close();
    
    const responseBody = JSON.stringify({ success: true, messageId: info.messageId });
    return new Response(responseBody, {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
    
  } catch (error) {
    console.error('--- ERROR IN FUNCTION ---', error);
    const errorBody = JSON.stringify({ error: error.message });
    return new Response(errorBody, {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});