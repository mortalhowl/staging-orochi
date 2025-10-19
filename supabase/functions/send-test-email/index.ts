// supabase/functions/send-test-email/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts'; //
import nodemailer from 'npm:nodemailer';

console.log(`[LOG] Function Initializing: send-test-email`);

Deno.serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('[LOG] Invocation started.');
    const { recipientEmail } = await req.json();
    if (!recipientEmail) {
      throw new Error('Recipient email is required.');
    }
    console.log(`[LOG] Attempting to send test email to: ${recipientEmail}`);

    // Create Supabase admin client to fetch config securely
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    console.log('[LOG] Supabase admin client created.');

    // 1. Fetch email configuration
    const { data: emailConfig, error: configError } = await supabaseAdmin
      .from('email_configs')
      .select('*')
      .single();

    if (configError || !emailConfig) {
      throw new Error('Email configuration not found or failed to load.');
    }
    console.log(`[LOG] Email config loaded. Provider: ${emailConfig.provider}`);

    // 2. Get secrets
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const gmailAppPassword = Deno.env.get('GMAIL_APP_PASSWORD');

    // Simple test email content
    const subject = 'Orochi - Email Test';
    const htmlBody = `<p>Đây là email gửi thử từ hệ thống Orochi.</p><p>Cấu hình gửi email đang hoạt động!</p>`;
    const fromAddress = `Orochi System <${emailConfig.sender_email}>`;

    let messageId: string | undefined;

    // 3. Send email based on provider
    if (emailConfig.provider === 'resend') {
      console.log('[LOG] Sending via Resend...');
      if (!resendApiKey) {
        throw new Error('Resend API Key is not configured in environment variables.');
      }

      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromAddress,
          to: recipientEmail,
          subject: subject,
          html: htmlBody,
          // attachments: [] // No attachments for test email
        }),
      });

      if (!resendResponse.ok) {
        const errorData = await resendResponse.json();
        console.error('[ERROR] Resend API Error Response:', errorData);
        throw new Error(`Resend API Error: ${errorData.message || resendResponse.statusText}`);
      }
      const responseData = await resendResponse.json();
      messageId = responseData.id;
      console.log('[LOG] Email sent via Resend. Message ID:', messageId);

    } else { // Default to SMTP (Gmail)
      console.log('[LOG] Sending via SMTP (Gmail)...');
      if (!gmailAppPassword) {
        throw new Error('Gmail App Password is not configured in environment variables (GMAIL_APP_PASSWORD).');
      }
      if (!emailConfig.smtp_host || !emailConfig.smtp_port || !emailConfig.sender_email) {
         throw new Error('SMTP configuration (host, port, sender) is incomplete.');
      }

      const transporter = nodemailer.createTransport({
        host: emailConfig.smtp_host,
        port: emailConfig.smtp_port,
        secure: emailConfig.smtp_port === 465, // true for 465, false for other ports
        auth: {
          user: emailConfig.sender_email,
          pass: gmailAppPassword,
        },
      });

      const mailOptions = {
        from: fromAddress,
        to: recipientEmail,
        subject: subject,
        html: htmlBody,
        // attachments: [] // No attachments needed for test
      };

      const info = await transporter.sendMail(mailOptions);
      messageId = info.messageId;
      console.log('[LOG] Email sent via SMTP. Message ID:', messageId);
      await transporter.close();
    }

    // Return success response
    return new Response(JSON.stringify({ success: true, messageId: messageId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('--- ERROR IN FUNCTION send-test-email ---', error);
    // Return error response
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400, // Use 400 for client/config errors, 500 for unexpected server errors
    });
  }
});