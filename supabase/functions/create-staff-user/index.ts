import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

console.log(`[LOG] Function Initializing: create-staff-user`);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('[LOG] Invocation started.');
    const { email, password, fullName } = await req.json()
    console.log('[LOG] Input Data:', { email, fullName, password: '***' });

    if (!email || !password || !fullName) {
      throw new Error('Email, password, and full name are required.')
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    console.log('[LOG] Supabase admin client created.');

    // Bước 1: Tạo người dùng trong hệ thống auth.
    // Trigger `handle_new_user` sẽ tự động chạy và tạo một bản ghi trong `public.users` với tên là null.
    console.log(`[LOG] Attempting to create user in auth.users for: ${email}`);
    const { data: { user }, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
    })
    if (authError) throw authError
    console.log(`[LOG] User created successfully in auth.users. User ID: ${user.id}`);

    // Bước 2: SỬA LỖI - CẬP NHẬT (UPDATE) bản ghi đã có thay vì INSERT.
    // Chúng ta cập nhật lại `full_name` và `role` cho bản ghi mà trigger vừa tạo.
    console.log(`[LOG] Attempting to UPDATE user in public.users with role 'staff' and full name.`);
    const { error: publicUserError } = await supabaseAdmin
      .from('users')
      .update({
        full_name: fullName,
        role: 'staff',
      })
      .eq('id', user.id) // Tìm đúng user để cập nhật

    if (publicUserError) throw publicUserError
    console.log('[LOG] User updated successfully in public.users.');

    const responseBody = JSON.stringify({ success: true, user });
    console.log('[LOG] Function finished successfully. Sending response:', responseBody);
    return new Response(responseBody, {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('--- ERROR IN FUNCTION ---', error);
    const errorBody = JSON.stringify({ error: error.message });
    console.error('[LOG] Function failed. Sending error response:', errorBody);
    return new Response(errorBody, {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
