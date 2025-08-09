import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import nodemailer from 'npm:nodemailer'

console.log(`[LOG] Function Initializing: user-admin-actions`);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('[LOG] Invocation started.');
    const { action, payload } = await req.json()
    const { userId, newPassword } = payload;
    console.log('[LOG] Input Data:', { action, userId, newPassword: newPassword ? '***' : undefined });

    if (!action || !userId) {
      throw new Error('Action and userId are required.')
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    console.log('[LOG] Supabase admin client created.');

    let responseMessage = '';

    const { data: { user }, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (getUserError) throw new Error('User not found in authentication system.');
    console.log(`[LOG] Found user in auth system: ${user.email}`);

    switch (action) {
      case 'send_reset_password':
        console.log(`[LOG] Starting 'send_reset_password' for ${user.email}`);

        // Bước 1: Lấy link reset từ Supabase
        const { data: linkData, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'recovery',
          email: user.email!,
        });
        if (resetError) throw resetError;
        const resetLink = linkData.properties.action_link;
        console.log('[LOG] Generated reset link successfully.');

        // Bước 2: Lấy cấu hình và mẫu email
        const { data: emailConfig } = await supabaseAdmin.from('email_configs').select('*').single();
        if (!emailConfig) throw new Error('Email config not found');

        // Giả sử bạn đã tạo mẫu email 'reset_password'
        const { data: template } = await supabaseAdmin.from('email_templates').select('*').eq('type', 'reset_password').single();
        if (!template) throw new Error('Reset password email template not found.');

        // Bước 3: Chuẩn bị và gửi email bằng Nodemailer
        let subject = template.subject.replaceAll('{{ten_khach_hang}}', user.user_metadata.full_name || user.email);
        let content = template.content.replaceAll('{{ten_khach_hang}}', user.user_metadata.full_name || user.email);
        content = content.replaceAll('{{reset_link}}', resetLink);
        const finalHtml = `<div style="max-width: 600px; margin: 0 auto; ...">${content}</div>`;

        const transporter = nodemailer.createTransport({
          host: emailConfig.smtp_host,
          port: emailConfig.smtp_port,
          secure: emailConfig.smtp_port === 465,
          auth: { user: emailConfig.sender_email, pass: Deno.env.get('GMAIL_APP_PASSWORD') },
        });

        await transporter.sendMail({
          from: `Orochi Ticket <${emailConfig.sender_email}>`,
          to: user.email,
          subject: subject,
          html: finalHtml,
        });
        console.log('[LOG] Reset password email sent successfully via Nodemailer.');

        responseMessage = 'Đã gửi link đổi mật khẩu.';
        break;
        
      case 'update_password':
        if (!newPassword) throw new Error('New password is required.');
        await supabaseAdmin.auth.admin.updateUserById(userId, { password: newPassword });
        responseMessage = 'Đổi mật khẩu thành công.';
        break;
      case 'disable_user':
        await supabaseAdmin.from('users').update({ status: 'disabled' }).eq('id', userId);
        responseMessage = 'Đã vô hiệu hóa tài khoản.';
        break;
      case 'enable_user':
        await supabaseAdmin.from('users').update({ status: 'active' }).eq('id', userId);
        responseMessage = 'Đã kích hoạt lại tài khoản.';
        break;
      case 'delete_user':
        await supabaseAdmin.from('users').delete().eq('id', userId);
        await supabaseAdmin.auth.admin.deleteUser(userId);
        responseMessage = 'Đã xóa tài khoản thành công.';
        break;
      default:
        throw new Error('Invalid action.');
    }

    const responseBody = JSON.stringify({ success: true, message: responseMessage });
    return new Response(responseBody, {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('--- ERROR IN FUNCTION ---', error);
    const errorBody = JSON.stringify({ error: error.message });
    return new Response(errorBody, {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
