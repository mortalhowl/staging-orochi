// supabase/functions/send-test-email/index.ts

// --- Triple-Slash Directives for Deno types ---
/// <reference types="https://deno.land/x/deno/cli/types/v1.36.0/index.d.ts" />
/// <reference lib="deno.ns" />

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts'; //
import nodemailer from 'npm:nodemailer';
import qrcode from 'npm:qrcode';
// Import function để chuyển đổi data URL sang Blob/ArrayBuffer (nếu cần)
// Hoặc sử dụng qrcode.toBuffer() nếu có
// Ví dụ: import { decode as base64Decode } from 'https://deno.land/std@0.100.0/encoding/base64.ts';

console.log(`[LOG] Function Initializing: send-test-email (v2.3 using Storage URL)`); // Update version

// --- Interfaces (Giữ nguyên) ---
interface EmailConfig {
    provider: 'smtp' | 'resend' | null;
    sender_email: string | null;
    smtp_host: string | null;
    smtp_port: number | null;
}

// --- Helper Function for Logging (Giữ nguyên) ---
async function logEmailSend(
    supabaseAdmin: SupabaseClient,
    details: {
        functionName: string;
        transactionId?: string | null; // Không dùng trong test email
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
        if (logError) {
            console.error('[ERROR] Failed to insert email send log:', logError);
        } else {
           console.log(`[LOG] Email send log created: Status ${details.status} for ${details.recipientEmail}`);
        }
    } catch (e) {
        console.error('[ERROR] Exception during logging:', e);
    }
}

// --- Function to convert Data URL to Blob (cần thiết cho Storage upload) ---
async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
    const res = await fetch(dataUrl);
    return await res.blob();
}


// --- Main Function Logic ---
Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    let recipientEmail = '';
    const emailSubject = 'Orochi - Email Test (Storage URL)'; // Cập nhật Subject
    let providerUsed: 'smtp' | 'resend' = 'smtp';
    const functionName = 'send-test-email'; // Định nghĩa tên function

    const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    try {
        console.log('[LOG] Invocation started.');
        const body = await req.json();
        recipientEmail = body.recipientEmail; // Gán vào biến ngoài try-catch
        if (!recipientEmail) {
            throw new Error('Recipient email is required.');
        }
        console.log(`[LOG] Attempting to send test email to: ${recipientEmail}`);
        console.log('[LOG] Supabase admin client created.');

        // --- Fetch Configuration and Secrets ---
        console.log('[LOG] Fetching email config...');
        const { data: emailConfigData, error: configError } = await supabaseAdmin
            .from('email_configs')
            .select('*')
            .single();
        if (configError || !emailConfigData) {
            throw new Error(`Email configuration not found or failed to load: ${configError?.message}`);
        }
        const emailConfig = emailConfigData as EmailConfig;
        providerUsed = emailConfig.provider || 'smtp';
        console.log(`[LOG] Email config loaded. Provider: ${providerUsed}`);

        const resendApiKey = Deno.env.get('RESEND_API_KEY');
        const gmailAppPassword = Deno.env.get('GMAIL_APP_PASSWORD');

        // --- Generate QR Code and Upload to Storage ---
        console.log('[LOG] Generating and uploading test QR code...');
        const testQrData = `Test email for ${recipientEmail} at ${new Date().toISOString()}`;
        const qrCodeDataURL = await qrcode.toDataURL(testQrData);

        // Chuyển Data URL thành Blob
        const qrBlob = await dataUrlToBlob(qrCodeDataURL);

        // Tạo tên file duy nhất (ví dụ: test/test_email_timestamp.png)
        const filePath = `test/test_${recipientEmail}_${Date.now()}.png`;

        // Upload lên bucket 'qr-codes'
        const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
            .from('qr-codes') // ** Tên bucket công khai của bạn **
            .upload(filePath, qrBlob, {
                contentType: 'image/png',
                upsert: true, // Ghi đè nếu file đã tồn tại (hữu ích khi test)
            });

        if (uploadError) {
            throw new Error(`Failed to upload QR code to storage: ${uploadError.message}`);
        }

        // Lấy URL công khai
        const { data: publicUrlData } = supabaseAdmin.storage
            .from('qr-codes') // ** Tên bucket công khai của bạn **
            .getPublicUrl(filePath);

        const qrPublicUrl = publicUrlData?.publicUrl;
        if (!qrPublicUrl) {
            throw new Error('Failed to get public URL for QR code.');
        }
        console.log(`[LOG] QR code uploaded successfully: ${qrPublicUrl}`);

        // --- Prepare Email Content with Public URL ---
        const htmlBody = `
            <p>Đây là email gửi thử từ hệ thống Orochi.</p>
            <p>Cấu hình gửi email đang hoạt động!</p>
            <p>Mã QR Test:</p>
            <img src="${qrPublicUrl}" alt="Test QR Code" width="150" height="150" style="display: block;" />
            <p><small>URL: ${qrPublicUrl}</small></p>
        `;
        const fromAddress = `Orochi System <${emailConfig.sender_email}>`;

        // --- Send Email ---
        let messageId: string | undefined;
        let sendError: Error | null = null;

        try {
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
                        html: htmlBody,
                        // Không cần attachments
                    }),
                });
                if (!resendResponse.ok) {
                    const errorData = await resendResponse.json();
                    throw new Error(`Resend API Error: ${errorData.message || resendResponse.statusText}`);
                }
                const responseData = await resendResponse.json();
                messageId = responseData.id;
                console.log('[LOG] Email sent via Resend. Message ID:', messageId);

            } else { // SMTP
                console.log('[LOG] Sending via SMTP...');
                if (!gmailAppPassword) throw new Error('Gmail App Password not configured.');
                if (!emailConfig.smtp_host || !emailConfig.smtp_port || !emailConfig.sender_email) throw new Error('SMTP configuration incomplete.');

                const transporter: any = nodemailer.createTransport({ /* ... auth ... */
                    host: emailConfig.smtp_host,
                    port: emailConfig.smtp_port,
                    secure: emailConfig.smtp_port === 465,
                    auth: { user: emailConfig.sender_email, pass: gmailAppPassword },
                 });
                const mailOptions = {
                    from: fromAddress,
                    to: recipientEmail,
                    subject: emailSubject,
                    html: htmlBody,
                    // Không cần attachments
                };
                const info = await transporter.sendMail(mailOptions);
                messageId = info.messageId;
                console.log('[LOG] Email sent via SMTP. Message ID:', messageId);
                await transporter.close();
            }
        } catch (err) {
            sendError = err instanceof Error ? err : new Error(String(err));
            console.error('[ERROR] Email sending failed:', sendError);
        }

        // --- Log Result ---
        await logEmailSend(supabaseAdmin, {
            functionName: functionName,
            recipientEmail: recipientEmail,
            subject: emailSubject,
            status: sendError ? 'failed' : 'success',
            provider: providerUsed,
            errorMessage: sendError ? sendError.message : null,
            messageId: messageId,
        });

        // --- Return Response ---
        return new Response(JSON.stringify({ success: !sendError, messageId: messageId, error: sendError ? sendError.message : null }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });

    } catch (error) { // Catch fatal errors
        console.error(`--- FATAL ERROR in ${functionName} ---`, error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        await logEmailSend(supabaseAdmin, {
            functionName: functionName,
            recipientEmail: recipientEmail || 'unknown',
            subject: emailSubject,
            status: 'failed',
            provider: providerUsed,
            errorMessage: `Fatal Error: ${errorMessage}`,
            messageId: null,
        });
        return new Response(JSON.stringify({ error: `Fatal Error: ${errorMessage}` }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
    }
}); // End Deno.serve