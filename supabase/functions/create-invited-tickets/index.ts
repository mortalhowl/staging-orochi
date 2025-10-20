// supabase/functions/create-invited-tickets/index.ts

// --- Triple-Slash Directives ---
/// <reference types="https://deno.land/x/deno/cli/types/v1.36.0/index.d.ts" />
/// <reference lib="deno.ns" />

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts'; //
import qrcode from 'npm:qrcode';

console.log(`[LOG] Function Initializing: create-invited-tickets (v1.2 fix batch logging)`);

// --- Interfaces ---
interface TicketTypeInfo { name: string; }
interface IssuedTicketInfo { id: string; ticket_types: TicketTypeInfo | null; }
interface UserInfo { id: string; email: string; full_name: string | null; }
interface EventInfo { id: string; title: string; }
interface TransactionInfo { id: string; total_amount: number; type: 'sale' | 'invitation'; users: UserInfo; events: EventInfo; issued_tickets: IssuedTicketInfo[]; }
interface EmailConfig { provider: 'smtp' | 'resend' | null; sender_email: string | null; /* Add other fields if needed */}
interface EmailTemplate { subject: string; content: string; }
interface GuestInput { email: string; fullName: string; quantity: number; }
interface EmailPayload {
    transactionId: string;
    to: string;
    from: string;
    subject: string;
    html: string;
}
interface ResendBatchResult {
    id: string | null;
    error: { message: string; type: string } | null;
}

// --- Function to convert Data URL to Blob ---
async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
    const res = await fetch(dataUrl);
    if (!res.ok) { throw new Error(`Failed to fetch data URL: ${res.status} ${res.statusText}`); }
    return await res.blob();
}

// --- Helper Function for Logging ---
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
        const { error: logError } = await supabaseAdmin.from('email_send_logs').insert({
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


// --- Main Function Logic ---
Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    const emailsToSend: EmailPayload[] = [];
    const functionName = 'create-invited-tickets';
    let providerUsed: 'smtp' | 'resend' = 'smtp';

    const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    try {
        console.log('[LOG] Invocation started.');
        const { eventId, ticketTypeId, guests } = await req.json() as { eventId: string, ticketTypeId: string, guests: GuestInput[] };
        if (!eventId || !ticketTypeId || !guests || !Array.isArray(guests) || guests.length === 0) { throw new Error('Missing or invalid parameters: eventId, ticketTypeId, and guests array are required.'); }
        console.log(`[LOG] Input: ${guests.length} guests for event ${eventId}, ticket type ${ticketTypeId}`);
        console.log('[LOG] Supabase admin client created.');

        // --- Fetch Configs, Secrets, Event Info, Template ONCE ---
        console.log('[LOG] Fetching configurations...');
        const emailConfigPromise = supabaseAdmin.from('email_configs').select('*').single();
        const eventPromise = supabaseAdmin.from('events').select('id, title').eq('id', eventId).single();
        const templatePromise = supabaseAdmin.from('email_templates').select('*').eq('type', 'invitation_ticket').single();
        const [emailConfigResult, eventResult, templateResult] = await Promise.all([emailConfigPromise, eventPromise, templatePromise]);
        if (emailConfigResult.error || !emailConfigResult.data) throw new Error(`Email configuration error: ${emailConfigResult.error?.message}`);
        const emailConfig = emailConfigResult.data as EmailConfig;
        providerUsed = emailConfig.provider || 'smtp';
        if (eventResult.error || !eventResult.data) throw new Error(`Event not found or error: ${eventResult.error?.message}`);
        const eventInfo = eventResult.data as EventInfo;
        if (templateResult.error || !templateResult.data) throw new Error(`Email template 'invitation_ticket' error: ${templateResult.error?.message}`);
        const template = templateResult.data as EmailTemplate;
        const resendApiKey = Deno.env.get('RESEND_API_KEY');
        console.log(`[LOG] Configs loaded. Provider: ${providerUsed}`);


        // --- Process each guest ---
        for (const guest of guests) {
             if (!guest.email || !guest.fullName || !guest.quantity || guest.quantity <= 0) { console.warn(`[WARN] Skipping invalid guest data:`, guest); continue; }
             console.log(`[LOG] Processing guest: ${guest.email} (${guest.quantity} tickets)`);
             // 1. UPSERT USER
             const { data: userData, error: userError } = await supabaseAdmin.from('users').upsert({ email: guest.email, full_name: guest.fullName }, { onConflict: 'email' }).select('id, email, full_name').single();
             if (userError || !userData) throw new Error(`User upsert failed for ${guest.email}: ${userError?.message}`);
             const user = userData as UserInfo;
             // 2. CREATE TRANSACTION
             const { data: transactionData, error: transError } = await supabaseAdmin.from('transactions').insert({ event_id: eventId, user_id: user.id, total_amount: 0, type: 'invitation', status: 'paid', paid_at: new Date().toISOString() }).select('id').single();
             if (transError || !transactionData) throw new Error(`Transaction creation failed for ${guest.email}: ${transError?.message}`);
             const transactionId = transactionData.id;
             // 3. CREATE TRANSACTION ITEM
             const { error: itemError } = await supabaseAdmin.from('transaction_items').insert({ transaction_id: transactionId, ticket_type_id: ticketTypeId, quantity: guest.quantity, price: 0 });
             if (itemError) throw new Error(`Transaction item creation failed for ${guest.email}: ${itemError?.message}`);
             // 4. CREATE ISSUED TICKETS
             const ticketsToInsert = Array.from({ length: guest.quantity }, () => ({ transaction_id: transactionId, ticket_type_id: ticketTypeId }));
             const { data: createdTicketsData, error: issuedTicketsError } = await supabaseAdmin.from('issued_tickets').insert(ticketsToInsert).select('id, ticket_types!inner(name)');
             if (issuedTicketsError || !createdTicketsData) throw new Error(`Issued ticket creation failed for ${guest.email}: ${issuedTicketsError?.message}`);
             const createdTickets = createdTicketsData as IssuedTicketInfo[];
             console.log(`[LOG] Inserted ${createdTickets.length} tickets for ${guest.email}`);
             // 5. UPDATE QUANTITY SOLD
             const { error: updateQtyError } = await supabaseAdmin.rpc('increment_quantity_sold', { p_ticket_type_id: ticketTypeId, p_quantity: guest.quantity });
             if (updateQtyError) throw new Error(`Quantity update failed for ${guest.email}: ${updateQtyError?.message}`);
             console.log(`[LOG] Updated quantity_sold for ticket type ${ticketTypeId}`);

             // --- 6. PREPARE EMAIL DATA ---
             console.log(`[LOG] Preparing email data for ${guest.email}`);
             const generatedTicketsHtml = await Promise.all(
                 createdTickets.map(async (issuedTicket: IssuedTicketInfo, index: number) => {
                     const qrCodeDataURL = await qrcode.toDataURL(issuedTicket.id);
                     const qrBlob = await dataUrlToBlob(qrCodeDataURL);
                     const filePath = `tickets/${issuedTicket.id}.png`;
                     const { error: uploadError } = await supabaseAdmin.storage.from('qr-codes').upload(filePath, qrBlob, { contentType: 'image/png', upsert: true });
                     if (uploadError) { console.error(`[ERROR] Failed to upload QR for ticket ${issuedTicket.id}:`, uploadError); }
                     const { data: publicUrlData } = supabaseAdmin.storage.from('qr-codes').getPublicUrl(filePath);
                     const qrPublicUrl = publicUrlData?.publicUrl || 'URL_TO_PLACEHOLDER_IMAGE';
                     const ticketTypeName = issuedTicket.ticket_types?.name ?? 'Không xác định';

                     // *** PASTE FULL HTML HERE ***
                     return `
                         <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse: collapse;">
                           <tr>
                             <td style="padding: 0; vertical-align: top; width: 65%;">
                               <h3 style="margin: 0 0 10px 0; font-size: 18px; color: #088e8b;">${eventInfo.title}</h3>
                               <p style="margin: 4px 0; font-size: 14px;"><strong>Khách hàng:</strong></p>
                               <p style="margin: 0 0 8px 0; font-size: 14px;">${user.full_name || user.email}</p>
                               <p style="margin: 4px 0; font-size: 14px;"><strong>Loại vé:</strong></p>
                               <p style="margin: 0 0 8px 0; font-size: 14px;">${ticketTypeName}</p>
                               <p style="margin: 4px 0; font-size: 14px;"><strong>Mã vé:</strong></p>
                               <p style="margin: 0 0 8px 0; font-size: 12px;"><span style="color: #088e8b; font-family: monospace;">${issuedTicket.id}</span></p>
                             </td>
                             <td style="position: relative; width: 1px; padding: 0 15px;">
                               <div style="position: absolute; top: 10px; bottom: 10px; left: 50%; transform: translateX(-50%); border-left: 1px dashed #ccc;"></div>
                             </td>
                             <td align="center" style="padding: 0; vertical-align: top; width: 35%;">
                               <p style="font-size: 8px; color: #555; margin: 0 0 5px 0;"><strong>${index + 1} / ${createdTickets.length}</strong></p>
                               <img src="${qrPublicUrl}" alt="QR Code" width="120" height="120" style="display: block; margin: 0 auto; border: 1px solid #eee;" />
                               <p style="font-size: 8px; color: #555; margin-top: 5px;">Quét mã này tại cổng</p>
                             </td>
                           </tr>
                         </table>`;
                 })
             );
             const allTicketsHtml = generatedTicketsHtml.filter(html => typeof html === 'string').join('<hr style="border: none; border-top: 1px dashed #ccc; margin: 15px 0;">');
             let content = template.content;
             let subject = template.subject;
             const replacements = {
                 '{{ten_khach_hang}}': user.full_name || user.email,
                 '{{ten_su_kien}}': eventInfo.title,
                 '{{ma_don_hang}}': transactionId.split('-')[0].toUpperCase(),
                 '{{tong_tien}}': '0đ', // Vé mời
                 '{{danh_sach_ve}}': allTicketsHtml,
              };
             for (const [key, value] of Object.entries(replacements)) { content = content.replaceAll(key, value || ''); subject = subject.replaceAll(key, value || ''); }
             const finalHtml = `<div style="max-width: 600px; margin: 0 auto; padding: 15px; border: 1px solid #ddd; border-radius: 8px; font-family: Arial, sans-serif;">${content}</div>`;

             emailsToSend.push({ transactionId: transactionId, to: user.email, from: `"${eventInfo.title}" <${emailConfig.sender_email}>`, subject: subject, html: finalHtml });
             console.log(`[LOG] Email data prepared for ${guest.email}`);
        } // End guest loop

        // --- 7. SEND EMAILS (Batch or Individual - Giữ nguyên logic gửi và logging) ---
        console.log(`[LOG] Finished processing guests. Attempting to send ${emailsToSend.length} emails via ${providerUsed}...`);
        if (emailsToSend.length > 0) {
            if (providerUsed === 'resend') {
                if (!resendApiKey) throw new Error('Resend API Key is not configured.');
                const batchSize = 100;
                for (let i = 0; i < emailsToSend.length; i += batchSize) {
                    const emailBatchSlice = emailsToSend.slice(i, i + batchSize);
                    const resendPayloadBatch = emailBatchSlice.map(email => ({ from: email.from, to: email.to, subject: email.subject, html: email.html }));
                    console.log(`[LOG] Sending Resend batch ${i / batchSize + 1} with ${resendPayloadBatch.length} emails...`);
                    const resendResponse = await fetch('https://api.resend.com/emails/batch', { /* ... */
                         method: 'POST',
                         headers: { 'Authorization': `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
                         body: JSON.stringify(resendPayloadBatch),
                     });
                    const responseData = await resendResponse.json();
                    if (!resendResponse.ok) {
                        console.error('[ERROR] Resend Batch API Error Response:', responseData);
                        for (const originalEmail of emailBatchSlice) { await logEmailSend(supabaseAdmin, { functionName, transactionId: originalEmail.transactionId, recipientEmail: originalEmail.to, subject: originalEmail.subject, status: 'failed', provider: 'resend', errorMessage: `Resend Batch API Error: ${responseData.message || responseData.name || resendResponse.statusText}` }); }
                    } else if (responseData.data && Array.isArray(responseData.data)) {
                         console.log(`[LOG] Resend Batch ${i / batchSize + 1} processed. Checking individual results...`);
                        responseData.data.forEach(async (result: ResendBatchResult, index: number) => {
                            const originalEmail = emailBatchSlice[index];
                            if (!originalEmail) { console.warn(`[WARN] Mismatch between response and sent batch at index ${index}`); return; }
                            if (result.error) {
                                console.error(`[ERROR] Resend failed for ${originalEmail.to}:`, result.error);
                                await logEmailSend(supabaseAdmin, { functionName, transactionId: originalEmail.transactionId, recipientEmail: originalEmail.to, subject: originalEmail.subject, status: 'failed', provider: 'resend', errorMessage: result.error.message });
                            } else {
                                await logEmailSend(supabaseAdmin, { functionName, transactionId: originalEmail.transactionId, recipientEmail: originalEmail.to, subject: originalEmail.subject, status: 'success', provider: 'resend', messageId: result.id });
                            }
                        });
                    } else {
                         console.warn('[WARN] Resend Batch API returned OK but response data format is unexpected:', responseData);
                         for (const originalEmail of emailBatchSlice) { await logEmailSend(supabaseAdmin, { functionName, transactionId: originalEmail.transactionId, recipientEmail: originalEmail.to, subject: originalEmail.subject, status: 'failed', provider: 'resend', errorMessage: 'Resend Batch API response format unexpected.' }); }
                    }
                    if (i + batchSize < emailsToSend.length) { await new Promise(resolve => setTimeout(resolve, 1000)); }
                }
            } else { // SMTP
                console.log('[LOG] Sending emails individually via SMTP trigger...');
                for (let i = 0; i < emailsToSend.length; i++) {
                    const email = emailsToSend[i];
                    console.log(`[LOG] Invoking send-ticket-email for ${email.to} (Transaction: ${email.transactionId})`);
                    supabaseAdmin.functions.invoke('send-ticket-email', { body: { transactionId: email.transactionId } })
                        .then(({ error: invokeError }) => {
                             if (invokeError) {
                                console.error(`[ERROR] Failed to invoke send-ticket-email for ${email.transactionId}:`, invokeError);
                                logEmailSend(supabaseAdmin, { functionName, transactionId: email.transactionId, recipientEmail: email.to, subject: email.subject, status: 'failed', provider: 'smtp', errorMessage: `Failed to invoke function: ${invokeError.message}` });
                             }
                        });
                    if (i < emailsToSend.length - 1) { await new Promise(resolve => setTimeout(resolve, 500)); }
                }
            }
        }

        // --- Return Success ---
        console.log('[LOG] Function finished successfully.');
        return new Response(JSON.stringify({ success: true, message: `Successfully processed ${guests.length} guests and initiated sending ${emailsToSend.length} emails.` }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error) { // Catch fatal errors
        console.error(`--- FATAL ERROR in ${functionName} ---`, error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return new Response(JSON.stringify({ error: `Fatal Error: ${errorMessage}` }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
    }
}); // End Deno.serve