// supabase/functions/resend-ticket/index.ts

// --- Triple-Slash Directives for Deno types ---
/// <reference types="https://deno.land/x/deno/cli/types/v1.36.0/index.d.ts" />
/// <reference lib="deno.ns" />

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts'; //
import nodemailer from 'npm:nodemailer';
import qrcode from 'npm:qrcode';

console.log(`[LOG] Function Initializing: resend-ticket (v1.1 using Storage URL)`); // Update version

// --- Interfaces (Giữ nguyên như send-ticket-email) ---
interface TicketTypeInfo { name: string; }
interface IssuedTicketInfo { id: string; ticket_types: TicketTypeInfo | null; }
interface UserInfo { email: string; full_name: string | null; }
interface EventInfo { title: string; }
interface TransactionInfo { id: string; total_amount: number; type: 'sale' | 'invitation'; users: UserInfo; events: EventInfo; issued_tickets: IssuedTicketInfo[]; }
interface EmailConfig { provider: 'smtp' | 'resend' | null; sender_email: string | null; smtp_host: string | null; smtp_port: number | null; }
interface EmailTemplate { subject: string; content: string; }

// --- Helper Function for Logging (Giữ nguyên) ---
async function logEmailSend(
    supabaseAdmin: SupabaseClient,
    details: {
        functionName: string;
        transactionId?: string | null;
        recipientEmail: string;
        subject: string;
        status: 'success' | 'failed';
        provider: 'smtp' | 'resend';
        errorMessage?: string | null;
        messageId?: string | null;
    }
) {
     try {
        const { error: logError } = await supabaseAdmin.from('email_send_logs').insert({ /* ... log data ... */
            function_name: details.functionName,
            transaction_id: details.transactionId,
            recipient_email: details.recipientEmail,
            subject: details.subject,
            status: details.status,
            provider: details.provider,
            error_message: details.errorMessage,
            message_id: details.messageId,
         });
        if (logError) { console.error('[ERROR] Failed to insert email send log:', logError); }
        else { console.log(`[LOG] Email send log created: Status ${details.status} for ${details.recipientEmail}`); }
    } catch (e) { console.error('[ERROR] Exception during logging:', e); }
}

// --- Function to convert Data URL to Blob (Giữ nguyên) ---
async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
    const res = await fetch(dataUrl);
    if (!res.ok) { throw new Error(`Failed to fetch data URL: ${res.status} ${res.statusText}`); }
    return await res.blob();
}

// --- Main Function Logic ---
Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    let transactionId: string | undefined;
    let recipientEmail = '';
    let emailSubject = 'Orochi Ticket Email - Gửi lại'; // Cập nhật Subject mặc định
    let providerUsed: 'smtp' | 'resend' = 'smtp';
    const functionName = 'resend-ticket'; // Cập nhật tên function

    // Ghi lại thời điểm bắt đầu để query log sau này
    const invocationStartTime = new Date();

    const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    try {
        console.log('[LOG] Invocation started.');
        const body = await req.json();
        transactionId = body.transactionId;
        console.log('[LOG] Input Data:', body);

        if (!transactionId) {
            throw new Error('Transaction ID is required.');
        }

        console.log('[LOG] Supabase admin client created.');

        // --- Fetch Configuration and Secrets (Giữ nguyên) ---
        console.log('[LOG] Fetching email config...');
        const { data: emailConfigData, error: configError } = await supabaseAdmin.from('email_configs').select('*').single();
        if (configError || !emailConfigData) { throw new Error(`Email configuration not found or failed to load: ${configError?.message}`); }
        const emailConfig = emailConfigData as EmailConfig;
        providerUsed = emailConfig.provider || 'smtp';
        console.log(`[LOG] Email config loaded. Provider: ${providerUsed}`);
        const resendApiKey = Deno.env.get('RESEND_API_KEY');
        const gmailAppPassword = Deno.env.get('GMAIL_APP_PASSWORD');

        // --- Fetch Transaction, User, Event, Tickets, Template ---
        console.log('[LOG] Fetching transaction details...');
        const { data: transactionData, error: transactionError } = await supabaseAdmin
            .from('transactions')
            .select('*, users!inner(*), events!inner(*), issued_tickets!inner(id, ticket_types!inner(name))')
            .eq('id', transactionId)
            .single();
        if (transactionError || !transactionData) { throw new Error(`Failed to fetch complete transaction details for ${transactionId}: ${transactionError?.message || 'Data missing'}`); }
        const transaction = transactionData as TransactionInfo;
        if (!transaction.users || !transaction.events || !transaction.issued_tickets) { throw new Error(`Incomplete transaction data for ${transactionId} despite inner joins.`); }
        recipientEmail = transaction.users.email;
        console.log(`[LOG] Fetched transaction details successfully for ${recipientEmail}.`);

        // *** SỬ DỤNG TEMPLATE 'resend_ticket' ***
        const templateType = 'resend_ticket';
        console.log(`[LOG] Fetching email template: ${templateType}`);
        const { data: templateData, error: templateError } = await supabaseAdmin
            .from('email_templates')
            .select('*')
            .eq('type', templateType)
            .single();
        if (templateError || !templateData) { throw new Error(`Email template "${templateType}" not found or failed to load: ${templateError?.message}`); }
        const template = templateData as EmailTemplate;
        emailSubject = template.subject;
        console.log('[LOG] Fetched email template successfully.');

        // --- Generate Ticket HTML with Storage URLs (Giống send-ticket-email) ---
        console.log(`[LOG] Generating ${transaction.issued_tickets.length} tickets with Storage URLs...`);
        const generatedTicketsData = await Promise.all(
            transaction.issued_tickets.map(async (issuedTicket: IssuedTicketInfo, index: number) => {
                const total = transaction.issued_tickets.length;
                const ticketTypeName = issuedTicket.ticket_types?.name ?? 'Không xác định';
                const qrCodeDataURL = await qrcode.toDataURL(issuedTicket.id);
                const qrBlob = await dataUrlToBlob(qrCodeDataURL);
                const filePath = `tickets/${issuedTicket.id}.png`;
                const { error: uploadError } = await supabaseAdmin.storage.from('qr-codes').upload(filePath, qrBlob, { contentType: 'image/png', upsert: true });
                if (uploadError) { console.error(`[ERROR] Failed to upload QR for ticket ${issuedTicket.id}:`, uploadError); }
                const { data: publicUrlData } = supabaseAdmin.storage.from('qr-codes').getPublicUrl(filePath);
                const qrPublicUrl = publicUrlData?.publicUrl;
                if (!qrPublicUrl) { console.error(`[ERROR] Failed to get public URL for ticket ${issuedTicket.id}. Using placeholder.`); }
                const imgSrc = qrPublicUrl || 'URL_TO_PLACEHOLDER_IMAGE';

                const html = `
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse: collapse;">
                      <tr>
                        <td style="padding: 0; vertical-align: top; width: 65%;">
                          <h3 style="margin: 0 0 10px 0; font-size: 18px; color: #088e8b;">${transaction.events.title}</h3>
                          <p style="margin: 4px 0; font-size: 14px;"><strong>Khách hàng:</strong></p>
                          <p style="margin: 0 0 8px 0; font-size: 14px;">${transaction.users.full_name || recipientEmail}</p>
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
                          <img src="${imgSrc}" alt="QR Code" width="120" height="120" style="display: block; margin: 0 auto; border: 1px solid #eee;" />
                          <p style="font-size: 8px; color: #555; margin-top: 5px;">Quét mã này tại cổng</p>
                        </td>
                      </tr>
                    </table>`;
                return html;
            })
        );
        const validTicketHtmls = generatedTicketsData.filter(html => typeof html === 'string');
        const allTicketsHtml = validTicketHtmls.join('<hr style="border: none; border-top: 1px dashed #ccc; margin: 15px 0;">');
        console.log('[LOG] All ticket HTML generated with Storage URLs.');

        // --- Prepare Email Content (Giữ nguyên) ---
        let content = template.content;
        let subject = template.subject; // Sử dụng subject từ template 'resend_ticket'
        const replacements = {
            '{{ten_khach_hang}}': transaction.users.full_name || recipientEmail,
            '{{ten_su_kien}}': transaction.events.title,
            '{{ma_don_hang}}': transactionId.split('-')[0].toUpperCase(),
            '{{tong_tien}}': transaction.total_amount.toLocaleString('vi-VN') + 'đ', // Vẫn hiển thị dù là gửi lại
            '{{danh_sach_ve}}': allTicketsHtml,
         };
        for (const [key, value] of Object.entries(replacements)) {
            content = content.replaceAll(key, value || '');
            subject = subject.replaceAll(key, value || '');
        }
        const finalHtml = `<div style="max-width: 600px; margin: 0 auto; padding: 15px; border: 1px solid #ddd; border-radius: 8px; font-family: Arial, sans-serif;">${content}</div>`;
        emailSubject = subject;
        console.log('[LOG] Placeholders replaced. Final subject:', emailSubject);

        // --- Send Email ---
        let messageId: string | undefined;
        let sendError: Error | null = null;

        try {
            const fromAddress = `"${transaction.events.title}" <${emailConfig.sender_email}>`;
            if (providerUsed === 'resend') {
                 console.log('[LOG] Sending via Resend...');
                 if (!resendApiKey) throw new Error('Resend API Key is not configured.');
                 const resendResponse = await fetch('https://api.resend.com/emails', { 
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        from: fromAddress,
                        to: recipientEmail,
                        subject: emailSubject,
                        html: finalHtml,
                    }),
                  });
                 if (!resendResponse.ok) { const errorData = await resendResponse.json(); throw new Error(`Resend API Error: ${errorData.message || resendResponse.statusText}`); }
                 const responseData = await resendResponse.json();
                 messageId = responseData.id;
                 console.log('[LOG] Email sent via Resend. Message ID:', messageId);
            } else { /* ... logic gửi SMTP giống send-ticket-email ... */
                 console.log('[LOG] Sending via SMTP...');
                 if (!gmailAppPassword) throw new Error('Gmail App Password not configured.');
                 if (!emailConfig.smtp_host || !emailConfig.smtp_port || !emailConfig.sender_email) throw new Error('SMTP configuration incomplete.');
                 const transporter: any = nodemailer.createTransport({ /* ... auth ... */
                    host: emailConfig.smtp_host,
                    port: emailConfig.smtp_port,
                    secure: emailConfig.smtp_port === 465,
                    auth: { user: emailConfig.sender_email, pass: gmailAppPassword },
                  });
                 const mailOptions = { from: fromAddress, to: recipientEmail, subject: emailSubject, html: finalHtml };
                 const info = await transporter.sendMail(mailOptions);
                 messageId = info.messageId;
                 console.log('[LOG] Email sent via SMTP. Message ID:', messageId);
                 await transporter.close();
             }
        } catch (err) {
            sendError = err instanceof Error ? err : new Error(String(err));
            console.error('[ERROR] Email sending failed:', sendError);
        }

        // --- Log Result (Giữ nguyên) ---
        await logEmailSend(supabaseAdmin, {
            functionName: functionName,
            transactionId: transactionId,
            recipientEmail: recipientEmail,
            subject: emailSubject,
            status: sendError ? 'failed' : 'success',
            provider: providerUsed,
            errorMessage: sendError ? sendError.message : null,
            messageId: messageId,
        });

        // --- *** KIỂM TRA LOG TRƯỚC KHI TRẢ VỀ (Đặc biệt cho resend-ticket) *** ---
        console.log('[LOG] Checking email send log for final status...');
        // Đợi một chút để đảm bảo log đã được ghi
        await new Promise(resolve => setTimeout(resolve, 500));

        const { data: logEntry, error: logQueryError } = await supabaseAdmin
            .from('email_send_logs')
            .select('status, error_message')
            .eq('transaction_id', transactionId)
            .eq('function_name', functionName) // Lọc theo function này
            .gte('created_at', invocationStartTime.toISOString()) // Lọc theo thời gian bắt đầu
            .order('created_at', { ascending: false }) // Lấy log mới nhất
            .limit(1)
            .single();

        if (logQueryError) {
            console.error('[ERROR] Failed to query email send log:', logQueryError);
            // Nếu không query được log, dựa vào sendError ban đầu (có thể không chính xác)
            if (sendError) {
                 throw sendError; // Ném lỗi gửi email ban đầu nếu không đọc được log
            }
        } else if (logEntry?.status === 'failed') {
             console.log('[LOG] Log indicates sending failed.');
             // Ném lỗi dựa trên thông tin trong log
             throw new Error(logEntry.error_message || 'Gửi lại email thất bại (kiểm tra log).');
        } else if (logEntry?.status === 'success') {
             console.log('[LOG] Log indicates sending succeeded.');
             // Tiếp tục trả về thành công
        } else {
             console.warn('[WARN] Could not find matching log entry or status is unexpected.');
             // Nếu không tìm thấy log hoặc status lạ, dựa vào sendError ban đầu
             if (sendError) {
                 throw sendError;
             }
        }

        // --- Return Success Response (Chỉ trả về nếu log báo success hoặc không có lỗi ban đầu) ---
        return new Response(JSON.stringify({ success: true, messageId: messageId }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error) { // Catch fatal errors HOẶC lỗi gửi email được throw lại sau khi kiểm tra log
        console.error(`--- ERROR in ${functionName} ---`, error);
        const errorMessage = error instanceof Error ? error.message : String(error);

        // Ghi log lỗi (nếu chưa được ghi bởi bước gửi email)
        // Cần kiểm tra xem có phải lỗi gửi mail không để tránh ghi log trùng lặp
        if (!errorMessage.startsWith('Resend API Error') && !errorMessage.includes('nodemailer')) {
             await logEmailSend(supabaseAdmin, {
                 functionName: functionName,
                 transactionId: transactionId,
                 recipientEmail: recipientEmail || 'unknown',
                 subject: emailSubject,
                 status: 'failed',
                 provider: providerUsed,
                 errorMessage: `Fatal Error or Log Check Failed: ${errorMessage}`,
                 messageId: null,
             });
        }

        // Trả về lỗi cho client (quan trọng cho resend-ticket)
        return new Response(JSON.stringify({ error: errorMessage }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            // Trả về 400 nếu lỗi liên quan đến gửi email, 500 nếu lỗi nghiêm trọng khác
            status: errorMessage.startsWith('Resend API Error') || errorMessage.includes('nodemailer') || errorMessage.includes('Gửi lại email thất bại') ? 400 : 500,
        });
    }
}); // End Deno.serve