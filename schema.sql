

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."article_status" AS ENUM (
    'public',
    'hidden'
);


ALTER TYPE "public"."article_status" OWNER TO "postgres";


CREATE TYPE "public"."email_template_type" AS ENUM (
    'purchase_confirmation',
    'invitation_ticket',
    'resend_ticket',
    'reset_password'
);


ALTER TYPE "public"."email_template_type" OWNER TO "postgres";


CREATE TYPE "public"."issued_ticket_status" AS ENUM (
    'active',
    'disabled'
);


ALTER TYPE "public"."issued_ticket_status" OWNER TO "postgres";


CREATE TYPE "public"."full_ticket_details" AS (
	"id" "uuid",
	"is_invite" boolean,
	"is_used" boolean,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone,
	"customer_name" "text",
	"customer_email" "text",
	"customer_phone" "text",
	"event_name" "text",
	"ticket_type_name" "text",
	"checked_in_by_name" "text",
	"status" "public"."issued_ticket_status",
	"transaction_id" "uuid"
);


ALTER TYPE "public"."full_ticket_details" OWNER TO "postgres";


CREATE TYPE "public"."full_user_ticket" AS (
	"event_id" "uuid",
	"event_name" "text",
	"event_start_time" timestamp with time zone,
	"event_end_time" timestamp with time zone,
	"location" "text",
	"ticket_id" "uuid",
	"ticket_type_name" "text",
	"price" integer
);


ALTER TYPE "public"."full_user_ticket" OWNER TO "postgres";


CREATE TYPE "public"."ticket_stats" AS (
	"total_tickets" bigint,
	"checked_in_count" bigint,
	"not_checked_in_count" bigint,
	"active_count" bigint,
	"disabled_count" bigint
);


ALTER TYPE "public"."ticket_stats" OWNER TO "postgres";


CREATE TYPE "public"."ticket_status" AS ENUM (
    'public',
    'hidden',
    'invited'
);


ALTER TYPE "public"."ticket_status" OWNER TO "postgres";


CREATE TYPE "public"."transaction_stats" AS (
	"total_transactions" bigint,
	"paid_count" bigint,
	"pending_count" bigint,
	"total_revenue" numeric
);


ALTER TYPE "public"."transaction_stats" OWNER TO "postgres";


CREATE TYPE "public"."transaction_type" AS ENUM (
    'sale',
    'invitation'
);


ALTER TYPE "public"."transaction_type" OWNER TO "postgres";


CREATE TYPE "public"."user_role" AS ENUM (
    'admin',
    'staff',
    'viewer'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE TYPE "public"."user_status" AS ENUM (
    'active',
    'disabled'
);


ALTER TYPE "public"."user_status" OWNER TO "postgres";


CREATE TYPE "public"."user_transaction_details" AS (
	"id" "uuid",
	"total_amount" integer,
	"status" "text",
	"type" "public"."transaction_type",
	"created_at" timestamp with time zone,
	"event_name" "text"
);


ALTER TYPE "public"."user_transaction_details" OWNER TO "postgres";


CREATE TYPE "public"."voucher_discount_type" AS ENUM (
    'fixed',
    'percentage'
);


ALTER TYPE "public"."voucher_discount_type" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."count_articles"("search_term" "text", "p_event_id" "uuid" DEFAULT NULL::"uuid") RETURNS bigint
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN (
    SELECT count(*)
    FROM public.articles
    WHERE
      (p_event_id IS NULL OR event_id = p_event_id) AND
      (
        search_term IS NULL OR search_term = '' OR
        title ILIKE '%' || search_term || '%'
      )
  );
END;
$$;


ALTER FUNCTION "public"."count_articles"("search_term" "text", "p_event_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."count_events"("search_term" "text", "p_is_active" boolean DEFAULT NULL::boolean) RETURNS bigint
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN (
    SELECT count(*)
    FROM public.events
    WHERE
      (p_is_active IS NULL OR is_active = p_is_active) AND
      (
        search_term IS NULL OR search_term = '' OR
        title ILIKE '%' || search_term || '%'
      )
  );
END;
$$;


ALTER FUNCTION "public"."count_events"("search_term" "text", "p_is_active" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."count_issued_tickets"("search_term" "text", "p_event_id" "uuid" DEFAULT NULL::"uuid", "p_is_invite" boolean DEFAULT NULL::boolean, "p_is_used" boolean DEFAULT NULL::boolean, "p_status" "public"."issued_ticket_status" DEFAULT NULL::"public"."issued_ticket_status") RETURNS bigint
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN (
    SELECT count(*) FROM public.issued_tickets as it
    LEFT JOIN public.transactions as t ON it.transaction_id = t.id
    LEFT JOIN public.users as u ON t.user_id = u.id
    WHERE
      (p_event_id IS NULL OR t.event_id = p_event_id) AND
      (p_is_invite IS NULL OR (t.type = 'invitation') = p_is_invite) AND
      (p_is_used IS NULL OR it.is_used = p_is_used) AND
      (p_status IS NULL OR it.status = p_status) AND
      (
        search_term IS NULL OR search_term = '' OR
        it.id::text ILIKE '%' || search_term || '%' OR
        t.id::text ILIKE '%' || search_term || '%' OR
        u.full_name ILIKE '%' || search_term || '%' OR
        u.email ILIKE '%' || search_term || '%' OR
        u.phone ILIKE '%' || search_term || '%'
      )
  );
END;
$$;


ALTER FUNCTION "public"."count_issued_tickets"("search_term" "text", "p_event_id" "uuid", "p_is_invite" boolean, "p_is_used" boolean, "p_status" "public"."issued_ticket_status") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."count_transactions"("search_term" "text", "p_status" "text" DEFAULT NULL::"text", "p_event_id" "uuid" DEFAULT NULL::"uuid", "p_start_date" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_end_date" timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS bigint
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN (
    SELECT count(t.*)
    FROM public.transactions as t
    LEFT JOIN public.users as u on t.user_id = u.id
    WHERE
      (p_status IS NULL OR t.status = p_status) AND
      (p_event_id IS NULL OR t.event_id = p_event_id) AND
      (p_start_date IS NULL OR t.created_at >= p_start_date) AND
      (p_end_date IS NULL OR t.created_at <= p_end_date) AND
      (
        search_term IS NULL OR search_term = '' OR
        t.id::text ILIKE '%' || search_term || '%' OR
        u.email ILIKE '%' || search_term || '%' OR
        u.phone ILIKE '%' || search_term || '%' -- Thêm điều kiện tìm kiếm SĐT
      )
  );
END;
$$;


ALTER FUNCTION "public"."count_transactions"("search_term" "text", "p_status" "text", "p_event_id" "uuid", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."count_users"("search_term" "text", "p_role" "public"."user_role" DEFAULT NULL::"public"."user_role") RETURNS bigint
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN (
    SELECT count(*)
    FROM public.users
    WHERE
      (p_role IS NULL OR role = p_role) AND
      (
        search_term IS NULL OR search_term = '' OR
        full_name ILIKE '%' || search_term || '%' OR
        email ILIKE '%' || search_term || '%'
      )
  );
END;
$$;


ALTER FUNCTION "public"."count_users"("search_term" "text", "p_role" "public"."user_role") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."count_vouchers"("search_term" "text", "p_is_active" boolean DEFAULT NULL::boolean) RETURNS bigint
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN (
    SELECT count(*)
    FROM public.vouchers
    WHERE
      (p_is_active IS NULL OR is_active = p_is_active) AND
      (
        search_term IS NULL OR search_term = '' OR
        code ILIKE '%' || search_term || '%'
      )
  );
END;
$$;


ALTER FUNCTION "public"."count_vouchers"("search_term" "text", "p_is_active" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_dashboard_overview_stats"("start_date" timestamp with time zone, "end_date" timestamp with time zone) RETURNS TABLE("total_revenue" bigint, "tickets_sold" bigint, "total_orders" bigint, "new_customers" bigint)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
    SELECT
      -- Tổng doanh thu từ các giao dịch 'paid' và 'sale'
      (SELECT COALESCE(SUM(t.total_amount), 0) FROM public.transactions t WHERE t.status = 'paid' AND t.type = 'sale' AND t.paid_at BETWEEN start_date AND end_date) as total_revenue,
      -- Tổng số vé đã bán (cả vé bán và vé mời)
      (SELECT COALESCE(SUM(ti.quantity), 0) FROM public.transaction_items ti JOIN public.transactions t ON ti.transaction_id = t.id WHERE t.status = 'paid' AND t.paid_at BETWEEN start_date AND end_date) as tickets_sold,
      -- Tổng số đơn hàng thành công
      (SELECT COUNT(*) FROM public.transactions t WHERE t.status = 'paid' AND t.paid_at BETWEEN start_date AND end_date) as total_orders,
      -- Số lượng khách hàng mới đăng ký
      (SELECT COUNT(*) FROM public.users u WHERE u.created_at BETWEEN start_date AND end_date) as new_customers;
END;
$$;


ALTER FUNCTION "public"."get_dashboard_overview_stats"("start_date" timestamp with time zone, "end_date" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_event_analytics"("start_date" timestamp with time zone, "end_date" timestamp with time zone) RETURNS TABLE("event_id" "uuid", "event_name" "text", "total_revenue" numeric, "tickets_sold" numeric)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
    SELECT
      e.id as event_id,
      e.title as event_name,
      -- Tính tổng doanh thu từ các giao dịch bán vé đã thanh toán
      COALESCE(SUM(t.total_amount), 0)::numeric as total_revenue,
      -- Đếm tổng số vé đã bán (cả vé mời và vé bán)
      (
        SELECT COALESCE(SUM(ti.quantity), 0)
        FROM public.transaction_items ti
        JOIN public.transactions tr ON ti.transaction_id = tr.id
        WHERE tr.event_id = e.id AND tr.status = 'paid' AND tr.paid_at BETWEEN start_date AND end_date
      )::numeric as tickets_sold
    FROM
      public.events e
    -- JOIN với transactions để tính doanh thu
    LEFT JOIN
      public.transactions t ON e.id = t.event_id AND t.status = 'paid' AND t.type = 'sale' AND t.paid_at BETWEEN start_date AND end_date
    GROUP BY
      e.id, e.title
    ORDER BY
      total_revenue DESC;
END;
$$;


ALTER FUNCTION "public"."get_event_analytics"("start_date" timestamp with time zone, "end_date" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_issued_tickets_stats"("search_term" "text", "p_event_id" "uuid" DEFAULT NULL::"uuid", "p_is_invite" boolean DEFAULT NULL::boolean, "p_is_used" boolean DEFAULT NULL::boolean, "p_status" "public"."issued_ticket_status" DEFAULT NULL::"public"."issued_ticket_status") RETURNS SETOF "public"."ticket_stats"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
    SELECT
      count(it.id) as total_tickets,
      count(it.id) FILTER (WHERE it.is_used = true) as checked_in_count,
      count(it.id) FILTER (WHERE it.is_used = false) as not_checked_in_count,
      count(it.id) FILTER (WHERE it.status = 'active') as active_count,
      count(it.id) FILTER (WHERE it.status = 'disabled') as disabled_count
    FROM
      public.issued_tickets as it
      LEFT JOIN public.transactions as t ON it.transaction_id = t.id
      LEFT JOIN public.users as u ON t.user_id = u.id
    WHERE
      (p_event_id IS NULL OR t.event_id = p_event_id) AND
      (p_is_invite IS NULL OR (t.type = 'invitation') = p_is_invite) AND
      (p_is_used IS NULL OR it.is_used = p_is_used) AND
      (p_status IS NULL OR it.status = p_status) AND
      (
        search_term IS NULL OR search_term = '' OR
        it.id::text ILIKE '%' || search_term || '%' OR
        u.full_name ILIKE '%' || search_term || '%' OR
        u.email ILIKE '%' || search_term || '%'
      );
END;
$$;


ALTER FUNCTION "public"."get_issued_tickets_stats"("search_term" "text", "p_event_id" "uuid", "p_is_invite" boolean, "p_is_used" boolean, "p_status" "public"."issued_ticket_status") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_revenue_over_time"("start_date" timestamp with time zone, "end_date" timestamp with time zone) RETURNS TABLE("date" "text", "revenue" numeric)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
    SELECT
      to_char(t.paid_at, 'YYYY-MM-DD') as date,
      -- Ép kiểu kết quả của SUM sang numeric
      SUM(t.total_amount)::numeric as revenue
    FROM
      public.transactions t
    WHERE
      t.status = 'paid' AND t.type = 'sale' AND t.paid_at BETWEEN start_date AND end_date
    GROUP BY
      to_char(t.paid_at, 'YYYY-MM-DD')
    ORDER BY
      date;
END;
$$;


ALTER FUNCTION "public"."get_revenue_over_time"("start_date" timestamp with time zone, "end_date" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_transaction_analytics"("start_date" timestamp with time zone, "end_date" timestamp with time zone) RETURNS TABLE("average_order_value" numeric, "sale_transactions_count" bigint, "invitation_transactions_count" bigint)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
    SELECT
      -- Tính giá trị trung bình của các đơn hàng bán đã thanh toán
      COALESCE(
        (SELECT AVG(t.total_amount) FROM public.transactions t WHERE t.status = 'paid' AND t.type = 'sale' AND t.paid_at BETWEEN start_date AND end_date),
        0
      )::numeric as average_order_value,
      -- Đếm số lượng giao dịch bán
      (SELECT COUNT(*) FROM public.transactions t WHERE t.status = 'paid' AND t.type = 'sale' AND t.paid_at BETWEEN start_date AND end_date) as sale_transactions_count,
      -- Đếm số lượng giao dịch vé mời
      (SELECT COUNT(*) FROM public.transactions t WHERE t.status = 'paid' AND t.type = 'invitation' AND t.paid_at BETWEEN start_date AND end_date) as invitation_transactions_count;
END;
$$;


ALTER FUNCTION "public"."get_transaction_analytics"("start_date" timestamp with time zone, "end_date" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_transaction_stats"("search_term" "text", "p_status" "text" DEFAULT NULL::"text", "p_event_id" "uuid" DEFAULT NULL::"uuid", "p_start_date" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_end_date" timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS SETOF "public"."transaction_stats"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
    SELECT
      count(t.id) as total_transactions,
      count(t.id) FILTER (WHERE t.status = 'paid') as paid_count,
      count(t.id) FILTER (WHERE t.status = 'pending') as pending_count,
      COALESCE(SUM(t.total_amount) FILTER (WHERE t.status = 'paid' AND t.type = 'sale'), 0)::numeric as total_revenue
    FROM
      public.transactions as t
      LEFT JOIN public.users as u on t.user_id = u.id
    WHERE
      -- Các điều kiện lọc và tìm kiếm giống hệt hàm search_transactions
      (p_status IS NULL OR t.status = p_status) AND
      (p_event_id IS NULL OR t.event_id = p_event_id) AND
      (p_start_date IS NULL OR t.created_at >= p_start_date) AND
      (p_end_date IS NULL OR t.created_at <= p_end_date) AND
      (
        search_term IS NULL OR search_term = '' OR
        t.id::text ILIKE '%' || search_term || '%' OR
        u.email ILIKE '%' || search_term || '%'
      );
END;
$$;


ALTER FUNCTION "public"."get_transaction_stats"("search_term" "text", "p_status" "text", "p_event_id" "uuid", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."issued_tickets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "transaction_id" "uuid" NOT NULL,
    "is_used" boolean DEFAULT false,
    "used_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "ticket_type_id" "uuid",
    "checked_in_by" "uuid",
    "status" "public"."issued_ticket_status" DEFAULT 'active'::"public"."issued_ticket_status" NOT NULL
);


ALTER TABLE "public"."issued_tickets" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_tickets"("p_user_id" "uuid", "p_user_email" "text") RETURNS SETOF "public"."issued_tickets"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
    SELECT it.*
    FROM public.issued_tickets AS it
    LEFT JOIN public.transactions AS t ON it.transaction_id = t.id
    WHERE
      -- Điều kiện OR được xử lý an toàn ở đây
      t.user_id = p_user_id OR it.email = p_user_email;
END;
$$;


ALTER FUNCTION "public"."get_user_tickets"("p_user_id" "uuid", "p_user_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_tickets_detailed"("p_user_id" "uuid") RETURNS SETOF "public"."full_user_ticket"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
    SELECT
      e.id as event_id,
      e.title as event_name,
      e.start_time as event_start_time,
      e.end_time as event_end_time,
      e.location as location,
      it.id as ticket_id,
      tt.name as ticket_type_name,
      -- Lấy giá từ transaction_items, join qua transaction_id và ticket_type_id
      -- Dùng COALESCE để trả về 0 cho vé mời (không có trong transaction_items)
      COALESCE(ti.price, 0) as price
    FROM
      public.issued_tickets as it
      LEFT JOIN public.transactions as t ON it.transaction_id = t.id
      LEFT JOIN public.events as e ON t.event_id = e.id
      LEFT JOIN public.ticket_types as tt ON it.ticket_type_id = tt.id
      -- Join thêm transaction_items để lấy giá tại thời điểm mua
      LEFT JOIN public.transaction_items as ti ON it.transaction_id = ti.transaction_id AND it.ticket_type_id = ti.ticket_type_id
    WHERE
      t.user_id = p_user_id
    ORDER BY
      e.start_time DESC, it.created_at ASC;
END;
$$;


ALTER FUNCTION "public"."get_user_tickets_detailed"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_transactions"("p_user_id" "uuid") RETURNS SETOF "public"."user_transaction_details"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
    SELECT
      t.id,
      t.total_amount,
      t.status,
      t.type,
      t.created_at,
      e.title as event_name
    FROM
      public.transactions as t
      LEFT JOIN public.events as e ON t.event_id = e.id
    WHERE
      t.user_id = p_user_id
    ORDER BY
      t.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_user_transactions"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  -- Chèn một user mới, nếu email đã tồn tại thì không làm gì cả.
  insert into public.users (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (email) do nothing;
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_quantity_sold"("p_ticket_type_id" "uuid", "p_quantity" integer) RETURNS "void"
    LANGUAGE "sql"
    AS $$
  update public.ticket_types
  set quantity_sold = quantity_sold + p_quantity
  where id = p_ticket_type_id;
$$;


ALTER FUNCTION "public"."increment_quantity_sold"("p_ticket_type_id" "uuid", "p_quantity" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_voucher_usage"("p_voucher_id" "uuid") RETURNS "void"
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  UPDATE public.vouchers
  SET usage_count = usage_count + 1
  WHERE id = p_voucher_id;
$$;


ALTER FUNCTION "public"."increment_voucher_usage"("p_voucher_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin_or_staff"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN (
    SELECT EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role IN ('admin', 'staff')
    )
  );
END;
$$;


ALTER FUNCTION "public"."is_admin_or_staff"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_issued_tickets"("search_term" "text", "p_event_id" "uuid" DEFAULT NULL::"uuid", "p_is_invite" boolean DEFAULT NULL::boolean, "p_is_used" boolean DEFAULT NULL::boolean, "p_status" "public"."issued_ticket_status" DEFAULT NULL::"public"."issued_ticket_status") RETURNS SETOF "public"."full_ticket_details"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
    SELECT
      it.id, t.type = 'invitation' as is_invite, it.is_used, it.used_at, it.created_at,
      u.full_name as customer_name, u.email as customer_email, u.phone as customer_phone,
      e.title as event_name, tt.name as ticket_type_name, staff.full_name as checked_in_by_name,
      it.status, t.id as transaction_id
    FROM
      public.issued_tickets as it
      LEFT JOIN public.transactions as t ON it.transaction_id = t.id
      LEFT JOIN public.users as u ON t.user_id = u.id
      LEFT JOIN public.events as e ON t.event_id = e.id
      LEFT JOIN public.ticket_types as tt ON it.ticket_type_id = tt.id
      LEFT JOIN public.users as staff ON it.checked_in_by = staff.id
    WHERE
      (p_event_id IS NULL OR t.event_id = p_event_id) AND
      (p_is_invite IS NULL OR (t.type = 'invitation') = p_is_invite) AND
      (p_is_used IS NULL OR it.is_used = p_is_used) AND
      (p_status IS NULL OR it.status = p_status) AND
      (
        search_term IS NULL OR search_term = '' OR
        it.id::text ILIKE '%' || search_term || '%' OR
        t.id::text ILIKE '%' || search_term || '%' OR -- Tìm theo Mã GD
        u.full_name ILIKE '%' || search_term || '%' OR
        u.email ILIKE '%' || search_term || '%' OR
        u.phone ILIKE '%' || search_term || '%' -- Tìm theo SĐT
      );
END;
$$;


ALTER FUNCTION "public"."search_issued_tickets"("search_term" "text", "p_event_id" "uuid", "p_is_invite" boolean, "p_is_used" boolean, "p_status" "public"."issued_ticket_status") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "event_id" "uuid",
    "total_amount" integer NOT NULL,
    "payment_qr_url" "text",
    "is_paid" boolean DEFAULT false,
    "status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "paid_at" timestamp with time zone,
    "type" "public"."transaction_type" DEFAULT 'sale'::"public"."transaction_type" NOT NULL,
    "applied_voucher_id" "uuid",
    "discount_amount" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."transactions" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_transactions"("search_term" "text") RETURNS SETOF "public"."transactions"
    LANGUAGE "plpgsql"
    AS $$
begin
  return query
    select t.*
    from public.transactions as t
    join public.users as u on t.user_id = u.id
    where
      -- Tìm kiếm trên id (phải cast sang text) hoặc email
      t.id::text ilike '%' || search_term || '%'
      or u.email ilike '%' || search_term || '%';
end;
$$;


ALTER FUNCTION "public"."search_transactions"("search_term" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_transactions"("search_term" "text", "p_status" "text" DEFAULT NULL::"text", "p_event_id" "uuid" DEFAULT NULL::"uuid", "p_start_date" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_end_date" timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS SETOF "public"."transactions"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
    SELECT t.*
    FROM public.transactions as t
    LEFT JOIN public.users as u on t.user_id = u.id
    WHERE
      (p_status IS NULL OR t.status = p_status) AND
      (p_event_id IS NULL OR t.event_id = p_event_id) AND
      (p_start_date IS NULL OR t.created_at >= p_start_date) AND
      (p_end_date IS NULL OR t.created_at <= p_end_date) AND
      (
        search_term IS NULL OR search_term = '' OR
        t.id::text ILIKE '%' || search_term || '%' OR
        u.email ILIKE '%' || search_term || '%' OR
        u.phone ILIKE '%' || search_term || '%' -- Thêm điều kiện tìm kiếm SĐT
      );
END;
$$;


ALTER FUNCTION "public"."search_transactions"("search_term" "text", "p_status" "text", "p_event_id" "uuid", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "full_name" "text",
    "phone" "text",
    "avatar_url" "text",
    "role" "public"."user_role" DEFAULT 'viewer'::"public"."user_role",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "status" "public"."user_status" DEFAULT 'active'::"public"."user_status" NOT NULL
);


ALTER TABLE "public"."users" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_users"("search_term" "text", "p_role" "public"."user_role" DEFAULT NULL::"public"."user_role") RETURNS SETOF "public"."users"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
    SELECT *
    FROM public.users
    WHERE
      (p_role IS NULL OR role = p_role) AND
      (
        search_term IS NULL OR search_term = '' OR
        full_name ILIKE '%' || search_term || '%' OR
        email ILIKE '%' || search_term || '%'
      );
END;
$$;


ALTER FUNCTION "public"."search_users"("search_term" "text", "p_role" "public"."user_role") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vouchers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text" NOT NULL,
    "discount_type" "public"."voucher_discount_type" NOT NULL,
    "discount_value" integer NOT NULL,
    "max_discount_amount" integer,
    "min_order_amount" integer DEFAULT 0 NOT NULL,
    "usage_limit" integer DEFAULT 1 NOT NULL,
    "usage_count" integer DEFAULT 0 NOT NULL,
    "valid_from" timestamp with time zone NOT NULL,
    "valid_until" timestamp with time zone NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "event_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."vouchers" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_vouchers"("search_term" "text", "p_is_active" boolean DEFAULT NULL::boolean) RETURNS SETOF "public"."vouchers"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
    SELECT *
    FROM public.vouchers
    WHERE
      (p_is_active IS NULL OR is_active = p_is_active) AND
      (
        search_term IS NULL OR search_term = '' OR
        code ILIKE '%' || search_term || '%'
      );
END;
$$;


ALTER FUNCTION "public"."search_vouchers"("search_term" "text", "p_is_active" boolean) OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."articles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid",
    "title" "text",
    "content" "text",
    "image_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "slug" "text",
    "status" "public"."article_status" DEFAULT 'public'::"public"."article_status" NOT NULL
);


ALTER TABLE "public"."articles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."bank_configs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "bank_name" "text",
    "account_name" "text",
    "account_number" "text",
    "qr_template" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "bank_bin" "text"
);


ALTER TABLE "public"."bank_configs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."company_info" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text",
    "logo_url" "text",
    "description" "text",
    "address" "text",
    "phone" "text",
    "email" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "tax_code" "text",
    "facebook_url" "text",
    "instagram_url" "text",
    "x_url" "text",
    "tiktok_url" "text",
    "youtube_url" "text"
);


ALTER TABLE "public"."company_info" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."email_configs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sender_email" "text",
    "smtp_host" "text",
    "smtp_port" integer,
    "use_tls" boolean,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."email_configs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."email_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "type" "public"."email_template_type" NOT NULL,
    "subject" "text" NOT NULL,
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."email_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "location" "text",
    "start_time" timestamp with time zone,
    "end_time" timestamp with time zone,
    "cover_image_url" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "slug" "text",
    "sale_start_time" timestamp with time zone,
    "sale_end_time" timestamp with time zone
);


ALTER TABLE "public"."events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."modules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" "text",
    "name" "text"
);


ALTER TABLE "public"."modules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."permissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "module_id" "uuid",
    "can_view" boolean DEFAULT false,
    "can_edit" boolean DEFAULT false
);


ALTER TABLE "public"."permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ticket_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "event_id" "uuid",
    "name" "text" NOT NULL,
    "price" integer NOT NULL,
    "quantity_total" integer,
    "quantity_sold" integer DEFAULT 0,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "status" "public"."ticket_status" DEFAULT 'public'::"public"."ticket_status" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."ticket_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."transaction_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "transaction_id" "uuid" NOT NULL,
    "ticket_type_id" "uuid" NOT NULL,
    "quantity" integer NOT NULL,
    "price" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."transaction_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."transaction_notes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "transaction_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "note" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."transaction_notes" OWNER TO "postgres";


ALTER TABLE ONLY "public"."articles"
    ADD CONSTRAINT "articles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."articles"
    ADD CONSTRAINT "articles_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."bank_configs"
    ADD CONSTRAINT "bank_configs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."company_info"
    ADD CONSTRAINT "company_info_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_configs"
    ADD CONSTRAINT "email_configs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_templates"
    ADD CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_templates"
    ADD CONSTRAINT "email_templates_type_key" UNIQUE ("type");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."events"
    ADD CONSTRAINT "events_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."issued_tickets"
    ADD CONSTRAINT "issued_tickets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."modules"
    ADD CONSTRAINT "modules_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."modules"
    ADD CONSTRAINT "modules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."permissions"
    ADD CONSTRAINT "permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."permissions"
    ADD CONSTRAINT "permissions_user_id_module_id_key" UNIQUE ("user_id", "module_id");



ALTER TABLE ONLY "public"."ticket_types"
    ADD CONSTRAINT "ticket_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."transaction_items"
    ADD CONSTRAINT "transaction_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."transaction_notes"
    ADD CONSTRAINT "transaction_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vouchers"
    ADD CONSTRAINT "vouchers_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."vouchers"
    ADD CONSTRAINT "vouchers_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_articles_slug" ON "public"."articles" USING "btree" ("slug");



CREATE INDEX "idx_events_slug" ON "public"."events" USING "btree" ("slug");



CREATE INDEX "idx_vouchers_code" ON "public"."vouchers" USING "btree" ("code");



CREATE OR REPLACE TRIGGER "on_articles_update" BEFORE UPDATE ON "public"."articles" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "on_email_templates_update" BEFORE UPDATE ON "public"."email_templates" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "on_events_update" BEFORE UPDATE ON "public"."events" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "on_ticket_types_update" BEFORE UPDATE ON "public"."ticket_types" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "on_vouchers_update" BEFORE UPDATE ON "public"."vouchers" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



ALTER TABLE ONLY "public"."articles"
    ADD CONSTRAINT "articles_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."issued_tickets"
    ADD CONSTRAINT "issued_tickets_checked_in_by_fkey" FOREIGN KEY ("checked_in_by") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."issued_tickets"
    ADD CONSTRAINT "issued_tickets_ticket_type_id_fkey" FOREIGN KEY ("ticket_type_id") REFERENCES "public"."ticket_types"("id");



ALTER TABLE ONLY "public"."issued_tickets"
    ADD CONSTRAINT "issued_tickets_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."permissions"
    ADD CONSTRAINT "permissions_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."permissions"
    ADD CONSTRAINT "permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ticket_types"
    ADD CONSTRAINT "ticket_types_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."transaction_items"
    ADD CONSTRAINT "transaction_items_ticket_type_id_fkey" FOREIGN KEY ("ticket_type_id") REFERENCES "public"."ticket_types"("id");



ALTER TABLE ONLY "public"."transaction_items"
    ADD CONSTRAINT "transaction_items_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."transaction_notes"
    ADD CONSTRAINT "transaction_notes_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."transaction_notes"
    ADD CONSTRAINT "transaction_notes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_applied_voucher_id_fkey" FOREIGN KEY ("applied_voucher_id") REFERENCES "public"."vouchers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."vouchers"
    ADD CONSTRAINT "vouchers_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE SET NULL;



CREATE POLICY "Admin and staff can view all articles" ON "public"."articles" FOR SELECT USING ("public"."is_admin_or_staff"());



CREATE POLICY "Admin and staff can view all events" ON "public"."events" FOR SELECT USING ("public"."is_admin_or_staff"());



CREATE POLICY "Admin and staff can view all ticket types" ON "public"."ticket_types" FOR SELECT USING ("public"."is_admin_or_staff"());



CREATE POLICY "Admin and staff can view all tickets" ON "public"."issued_tickets" FOR SELECT USING ("public"."is_admin_or_staff"());



CREATE POLICY "Admin and staff can view all transaction items" ON "public"."transaction_items" FOR SELECT USING ("public"."is_admin_or_staff"());



CREATE POLICY "Admin and staff can view all transactions" ON "public"."transactions" FOR SELECT USING ("public"."is_admin_or_staff"());



CREATE POLICY "Admin and staff can view all users" ON "public"."users" FOR SELECT USING ("public"."is_admin_or_staff"());



CREATE POLICY "Admin and staff can view modules" ON "public"."modules" FOR SELECT USING ("public"."is_admin_or_staff"());



CREATE POLICY "Admin and staff can view vouchers" ON "public"."vouchers" FOR SELECT USING ("public"."is_admin_or_staff"());



CREATE POLICY "Admins and staff can create transaction notes" ON "public"."transaction_notes" FOR INSERT WITH CHECK ((( SELECT ("users"."role")::"text" AS "role"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())) = ANY (ARRAY['admin'::"text", 'staff'::"text"])));



CREATE POLICY "Admins and staff can delete all transaction items" ON "public"."transaction_items" FOR DELETE USING ("public"."is_admin_or_staff"());



CREATE POLICY "Admins and staff can manage company info" ON "public"."company_info" USING (true) WITH CHECK ((( SELECT ("users"."role")::"text" AS "role"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())) = ANY (ARRAY['admin'::"text", 'staff'::"text"])));



CREATE POLICY "Admins and staff can update all transaction items" ON "public"."transaction_items" FOR UPDATE USING ("public"."is_admin_or_staff"());



CREATE POLICY "Admins and staff can view all transaction items" ON "public"."transaction_items" FOR SELECT USING ("public"."is_admin_or_staff"());



CREATE POLICY "Admins and staff can view transaction notes" ON "public"."transaction_notes" FOR SELECT USING ((( SELECT ("users"."role")::"text" AS "role"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())) = ANY (ARRAY['admin'::"text", 'staff'::"text"])));



CREATE POLICY "Admins can delete users" ON "public"."users" FOR DELETE USING ((( SELECT ("users_1"."role")::"text" AS "role"
   FROM "public"."users" "users_1"
  WHERE ("users_1"."id" = "auth"."uid"())) = 'admin'::"text"));



CREATE POLICY "Admins can insert new users" ON "public"."users" FOR INSERT WITH CHECK ((( SELECT ("users_1"."role")::"text" AS "role"
   FROM "public"."users" "users_1"
  WHERE ("users_1"."id" = "auth"."uid"())) = 'admin'::"text"));



CREATE POLICY "Admins can view all permissions" ON "public"."permissions" FOR SELECT USING ((( SELECT ("users"."role")::"text" AS "role"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())) = 'admin'::"text"));



CREATE POLICY "Authenticated users can create transactions" ON "public"."transactions" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authorized staff can check-in tickets" ON "public"."issued_tickets" FOR UPDATE USING (((( SELECT ("users"."role")::"text" AS "role"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())) = 'admin'::"text") OR ((( SELECT ("users"."role")::"text" AS "role"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())) = 'staff'::"text") AND (EXISTS ( SELECT 1
   FROM ("public"."permissions" "p"
     JOIN "public"."modules" "m" ON (("p"."module_id" = "m"."id")))
  WHERE (("p"."user_id" = "auth"."uid"()) AND ("m"."code" = 'check-in'::"text") AND ("p"."can_view" = true)))))));



CREATE POLICY "Authorized users can delete tickets" ON "public"."issued_tickets" FOR DELETE USING (((( SELECT ("users"."role")::"text" AS "role"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())) = 'admin'::"text") OR ((( SELECT ("users"."role")::"text" AS "role"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())) = 'staff'::"text") AND (EXISTS ( SELECT 1
   FROM ("public"."permissions" "p"
     JOIN "public"."modules" "m" ON (("p"."module_id" = "m"."id")))
  WHERE (("p"."user_id" = "auth"."uid"()) AND ("m"."code" = 'tickets'::"text") AND ("p"."can_edit" = true)))))));



CREATE POLICY "Authorized users can delete transactions" ON "public"."transactions" FOR DELETE USING (((( SELECT ("users"."role")::"text" AS "role"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())) = 'admin'::"text") OR ((( SELECT ("users"."role")::"text" AS "role"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())) = 'staff'::"text") AND (EXISTS ( SELECT 1
   FROM ("public"."permissions" "p"
     JOIN "public"."modules" "m" ON (("p"."module_id" = "m"."id")))
  WHERE (("p"."user_id" = "auth"."uid"()) AND ("m"."code" = 'transactions'::"text") AND ("p"."can_edit" = true)))))));



CREATE POLICY "Authorized users can manage articles" ON "public"."articles" USING (((( SELECT ("users"."role")::"text" AS "role"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())) = 'admin'::"text") OR ((( SELECT ("users"."role")::"text" AS "role"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())) = 'staff'::"text") AND (EXISTS ( SELECT 1
   FROM ("public"."permissions" "p"
     JOIN "public"."modules" "m" ON (("p"."module_id" = "m"."id")))
  WHERE (("p"."user_id" = "auth"."uid"()) AND ("m"."code" = 'articles'::"text") AND ("p"."can_edit" = true)))))));



CREATE POLICY "Authorized users can manage events" ON "public"."events" USING (((( SELECT ("users"."role")::"text" AS "role"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())) = 'admin'::"text") OR ((( SELECT ("users"."role")::"text" AS "role"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())) = 'staff'::"text") AND (EXISTS ( SELECT 1
   FROM ("public"."permissions" "p"
     JOIN "public"."modules" "m" ON (("p"."module_id" = "m"."id")))
  WHERE (("p"."user_id" = "auth"."uid"()) AND ("m"."code" = 'events'::"text") AND ("p"."can_edit" = true)))))));



CREATE POLICY "Authorized users can manage ticket types" ON "public"."ticket_types" USING (((( SELECT ("users"."role")::"text" AS "role"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())) = 'admin'::"text") OR ((( SELECT ("users"."role")::"text" AS "role"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())) = 'staff'::"text") AND (EXISTS ( SELECT 1
   FROM ("public"."permissions" "p"
     JOIN "public"."modules" "m" ON (("p"."module_id" = "m"."id")))
  WHERE (("p"."user_id" = "auth"."uid"()) AND ("m"."code" = 'events'::"text") AND ("p"."can_edit" = true)))))));



CREATE POLICY "Authorized users can manage vouchers" ON "public"."vouchers" USING (((( SELECT ("users"."role")::"text" AS "role"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())) = 'admin'::"text") OR ((( SELECT ("users"."role")::"text" AS "role"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())) = 'staff'::"text") AND (EXISTS ( SELECT 1
   FROM ("public"."permissions" "p"
     JOIN "public"."modules" "m" ON (("p"."module_id" = "m"."id")))
  WHERE (("p"."user_id" = "auth"."uid"()) AND ("m"."code" = 'vouchers'::"text") AND ("p"."can_edit" = true)))))));



CREATE POLICY "Authorized users can update transactions" ON "public"."transactions" FOR UPDATE USING (((( SELECT ("users"."role")::"text" AS "role"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())) = 'admin'::"text") OR ((( SELECT ("users"."role")::"text" AS "role"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())) = 'staff'::"text") AND (EXISTS ( SELECT 1
   FROM ("public"."permissions" "p"
     JOIN "public"."modules" "m" ON (("p"."module_id" = "m"."id")))
  WHERE (("p"."user_id" = "auth"."uid"()) AND ("m"."code" = 'transactions'::"text") AND ("p"."can_edit" = true)))))));



CREATE POLICY "Only admins can manage configuration" ON "public"."bank_configs" USING ((( SELECT ("users"."role")::"text" AS "role"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())) = 'admin'::"text"));



CREATE POLICY "Only admins can manage configuration" ON "public"."company_info" USING ((( SELECT ("users"."role")::"text" AS "role"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())) = 'admin'::"text"));



CREATE POLICY "Only admins can manage configuration" ON "public"."email_configs" USING ((( SELECT ("users"."role")::"text" AS "role"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())) = 'admin'::"text"));



CREATE POLICY "Only admins can manage configuration" ON "public"."email_templates" USING ((( SELECT ("users"."role")::"text" AS "role"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())) = 'admin'::"text"));



CREATE POLICY "Only admins can manage modules" ON "public"."modules" USING ((( SELECT "users"."role"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())) = 'admin'::"public"."user_role"));



CREATE POLICY "Only admins can manage permissions" ON "public"."permissions" USING ((( SELECT ("users"."role")::"text" AS "role"
   FROM "public"."users"
  WHERE ("users"."id" = "auth"."uid"())) = 'admin'::"text"));



CREATE POLICY "Public can read company info" ON "public"."company_info" FOR SELECT USING (true);



CREATE POLICY "Public can read configuration" ON "public"."bank_configs" FOR SELECT USING (true);



CREATE POLICY "Public can read configuration" ON "public"."company_info" FOR SELECT USING (true);



CREATE POLICY "Public can read configuration" ON "public"."email_configs" FOR SELECT USING (true);



CREATE POLICY "Public can read configuration" ON "public"."email_templates" FOR SELECT USING (true);



CREATE POLICY "Public can view active events" ON "public"."events" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Public can view public ticket types" ON "public"."ticket_types" FOR SELECT USING (("status" = 'public'::"public"."ticket_status"));



CREATE POLICY "Public can view published articles" ON "public"."articles" FOR SELECT USING (("status" = 'public'::"public"."article_status"));



CREATE POLICY "Public can view published content" ON "public"."articles" FOR SELECT USING (("status" = 'public'::"public"."article_status"));



CREATE POLICY "Public can view published content" ON "public"."events" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Public can view published content" ON "public"."ticket_types" FOR SELECT USING (("status" = 'public'::"public"."ticket_status"));



CREATE POLICY "Staff can view their own permissions" ON "public"."permissions" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create items for their own transactions" ON "public"."transaction_items" FOR INSERT WITH CHECK ((( SELECT "transactions"."user_id"
   FROM "public"."transactions"
  WHERE ("transactions"."id" = "transaction_items"."transaction_id")) = "auth"."uid"()));



CREATE POLICY "Users can update their own, and admins can update all" ON "public"."users" FOR UPDATE USING ((("auth"."uid"() = "id") OR (( SELECT ("users_1"."role")::"text" AS "role"
   FROM "public"."users" "users_1"
  WHERE ("users_1"."id" = "auth"."uid"())) = 'admin'::"text")));



CREATE POLICY "Users can view their own tickets" ON "public"."issued_tickets" FOR SELECT USING ((( SELECT "transactions"."user_id"
   FROM "public"."transactions"
  WHERE ("transactions"."id" = "issued_tickets"."transaction_id")) = "auth"."uid"()));



CREATE POLICY "Users can view their own transaction items" ON "public"."transaction_items" FOR SELECT USING ((( SELECT "transactions"."user_id"
   FROM "public"."transactions"
  WHERE ("transactions"."id" = "transaction_items"."transaction_id")) = "auth"."uid"()));



CREATE POLICY "Users can view their own transactions" ON "public"."transactions" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own, and admins/staff can view all" ON "public"."users" FOR SELECT USING ((("auth"."uid"() = "id") OR "public"."is_admin_or_staff"()));



ALTER TABLE "public"."articles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."bank_configs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."company_info" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."email_configs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."email_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."issued_tickets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."modules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."permissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ticket_types" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."transaction_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."transaction_notes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."transactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."vouchers" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";





GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."count_articles"("search_term" "text", "p_event_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."count_articles"("search_term" "text", "p_event_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."count_articles"("search_term" "text", "p_event_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."count_events"("search_term" "text", "p_is_active" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."count_events"("search_term" "text", "p_is_active" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."count_events"("search_term" "text", "p_is_active" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."count_issued_tickets"("search_term" "text", "p_event_id" "uuid", "p_is_invite" boolean, "p_is_used" boolean, "p_status" "public"."issued_ticket_status") TO "anon";
GRANT ALL ON FUNCTION "public"."count_issued_tickets"("search_term" "text", "p_event_id" "uuid", "p_is_invite" boolean, "p_is_used" boolean, "p_status" "public"."issued_ticket_status") TO "authenticated";
GRANT ALL ON FUNCTION "public"."count_issued_tickets"("search_term" "text", "p_event_id" "uuid", "p_is_invite" boolean, "p_is_used" boolean, "p_status" "public"."issued_ticket_status") TO "service_role";



GRANT ALL ON FUNCTION "public"."count_transactions"("search_term" "text", "p_status" "text", "p_event_id" "uuid", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."count_transactions"("search_term" "text", "p_status" "text", "p_event_id" "uuid", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."count_transactions"("search_term" "text", "p_status" "text", "p_event_id" "uuid", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."count_users"("search_term" "text", "p_role" "public"."user_role") TO "anon";
GRANT ALL ON FUNCTION "public"."count_users"("search_term" "text", "p_role" "public"."user_role") TO "authenticated";
GRANT ALL ON FUNCTION "public"."count_users"("search_term" "text", "p_role" "public"."user_role") TO "service_role";



GRANT ALL ON FUNCTION "public"."count_vouchers"("search_term" "text", "p_is_active" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."count_vouchers"("search_term" "text", "p_is_active" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."count_vouchers"("search_term" "text", "p_is_active" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_dashboard_overview_stats"("start_date" timestamp with time zone, "end_date" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."get_dashboard_overview_stats"("start_date" timestamp with time zone, "end_date" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_dashboard_overview_stats"("start_date" timestamp with time zone, "end_date" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_event_analytics"("start_date" timestamp with time zone, "end_date" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."get_event_analytics"("start_date" timestamp with time zone, "end_date" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_event_analytics"("start_date" timestamp with time zone, "end_date" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_issued_tickets_stats"("search_term" "text", "p_event_id" "uuid", "p_is_invite" boolean, "p_is_used" boolean, "p_status" "public"."issued_ticket_status") TO "anon";
GRANT ALL ON FUNCTION "public"."get_issued_tickets_stats"("search_term" "text", "p_event_id" "uuid", "p_is_invite" boolean, "p_is_used" boolean, "p_status" "public"."issued_ticket_status") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_issued_tickets_stats"("search_term" "text", "p_event_id" "uuid", "p_is_invite" boolean, "p_is_used" boolean, "p_status" "public"."issued_ticket_status") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_revenue_over_time"("start_date" timestamp with time zone, "end_date" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."get_revenue_over_time"("start_date" timestamp with time zone, "end_date" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_revenue_over_time"("start_date" timestamp with time zone, "end_date" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_transaction_analytics"("start_date" timestamp with time zone, "end_date" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."get_transaction_analytics"("start_date" timestamp with time zone, "end_date" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_transaction_analytics"("start_date" timestamp with time zone, "end_date" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_transaction_stats"("search_term" "text", "p_status" "text", "p_event_id" "uuid", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."get_transaction_stats"("search_term" "text", "p_status" "text", "p_event_id" "uuid", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_transaction_stats"("search_term" "text", "p_status" "text", "p_event_id" "uuid", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) TO "service_role";



GRANT ALL ON TABLE "public"."issued_tickets" TO "anon";
GRANT ALL ON TABLE "public"."issued_tickets" TO "authenticated";
GRANT ALL ON TABLE "public"."issued_tickets" TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_tickets"("p_user_id" "uuid", "p_user_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_tickets"("p_user_id" "uuid", "p_user_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_tickets"("p_user_id" "uuid", "p_user_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_tickets_detailed"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_tickets_detailed"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_tickets_detailed"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_transactions"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_transactions"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_transactions"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_quantity_sold"("p_ticket_type_id" "uuid", "p_quantity" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."increment_quantity_sold"("p_ticket_type_id" "uuid", "p_quantity" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_quantity_sold"("p_ticket_type_id" "uuid", "p_quantity" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_voucher_usage"("p_voucher_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."increment_voucher_usage"("p_voucher_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_voucher_usage"("p_voucher_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin_or_staff"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin_or_staff"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin_or_staff"() TO "service_role";



GRANT ALL ON FUNCTION "public"."search_issued_tickets"("search_term" "text", "p_event_id" "uuid", "p_is_invite" boolean, "p_is_used" boolean, "p_status" "public"."issued_ticket_status") TO "anon";
GRANT ALL ON FUNCTION "public"."search_issued_tickets"("search_term" "text", "p_event_id" "uuid", "p_is_invite" boolean, "p_is_used" boolean, "p_status" "public"."issued_ticket_status") TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_issued_tickets"("search_term" "text", "p_event_id" "uuid", "p_is_invite" boolean, "p_is_used" boolean, "p_status" "public"."issued_ticket_status") TO "service_role";



GRANT ALL ON TABLE "public"."transactions" TO "anon";
GRANT ALL ON TABLE "public"."transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."transactions" TO "service_role";



GRANT ALL ON FUNCTION "public"."search_transactions"("search_term" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."search_transactions"("search_term" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_transactions"("search_term" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."search_transactions"("search_term" "text", "p_status" "text", "p_event_id" "uuid", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."search_transactions"("search_term" "text", "p_status" "text", "p_event_id" "uuid", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_transactions"("search_term" "text", "p_status" "text", "p_event_id" "uuid", "p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON FUNCTION "public"."search_users"("search_term" "text", "p_role" "public"."user_role") TO "anon";
GRANT ALL ON FUNCTION "public"."search_users"("search_term" "text", "p_role" "public"."user_role") TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_users"("search_term" "text", "p_role" "public"."user_role") TO "service_role";



GRANT ALL ON TABLE "public"."vouchers" TO "anon";
GRANT ALL ON TABLE "public"."vouchers" TO "authenticated";
GRANT ALL ON TABLE "public"."vouchers" TO "service_role";



GRANT ALL ON FUNCTION "public"."search_vouchers"("search_term" "text", "p_is_active" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."search_vouchers"("search_term" "text", "p_is_active" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_vouchers"("search_term" "text", "p_is_active" boolean) TO "service_role";


















GRANT ALL ON TABLE "public"."articles" TO "anon";
GRANT ALL ON TABLE "public"."articles" TO "authenticated";
GRANT ALL ON TABLE "public"."articles" TO "service_role";



GRANT ALL ON TABLE "public"."bank_configs" TO "anon";
GRANT ALL ON TABLE "public"."bank_configs" TO "authenticated";
GRANT ALL ON TABLE "public"."bank_configs" TO "service_role";



GRANT ALL ON TABLE "public"."company_info" TO "anon";
GRANT ALL ON TABLE "public"."company_info" TO "authenticated";
GRANT ALL ON TABLE "public"."company_info" TO "service_role";



GRANT ALL ON TABLE "public"."email_configs" TO "anon";
GRANT ALL ON TABLE "public"."email_configs" TO "authenticated";
GRANT ALL ON TABLE "public"."email_configs" TO "service_role";



GRANT ALL ON TABLE "public"."email_templates" TO "anon";
GRANT ALL ON TABLE "public"."email_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."email_templates" TO "service_role";



GRANT ALL ON TABLE "public"."events" TO "anon";
GRANT ALL ON TABLE "public"."events" TO "authenticated";
GRANT ALL ON TABLE "public"."events" TO "service_role";



GRANT ALL ON TABLE "public"."modules" TO "anon";
GRANT ALL ON TABLE "public"."modules" TO "authenticated";
GRANT ALL ON TABLE "public"."modules" TO "service_role";



GRANT ALL ON TABLE "public"."permissions" TO "anon";
GRANT ALL ON TABLE "public"."permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."permissions" TO "service_role";



GRANT ALL ON TABLE "public"."ticket_types" TO "anon";
GRANT ALL ON TABLE "public"."ticket_types" TO "authenticated";
GRANT ALL ON TABLE "public"."ticket_types" TO "service_role";



GRANT ALL ON TABLE "public"."transaction_items" TO "anon";
GRANT ALL ON TABLE "public"."transaction_items" TO "authenticated";
GRANT ALL ON TABLE "public"."transaction_items" TO "service_role";



GRANT ALL ON TABLE "public"."transaction_notes" TO "anon";
GRANT ALL ON TABLE "public"."transaction_notes" TO "authenticated";
GRANT ALL ON TABLE "public"."transaction_notes" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






























RESET ALL;
