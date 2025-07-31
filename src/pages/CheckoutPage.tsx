import { Container, Title, Paper, Grid, Stack, Text, Divider, Button, Group, Avatar } from '@mantine/core';
import { useCartStore } from '../store/cartStore';
import { Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { notifications } from '@mantine/notifications';
import { useState, useEffect } from 'react';
import { IconBrandGoogle } from '@tabler/icons-react';
import type { User } from '@supabase/supabase-js'; // 1. Import kiểu User

export function CheckoutPage() {
  const { event, cart, totalAmount, totalTickets, clearCart } = useCartStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null); // 2. State để lưu thông tin user
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null); // 3. Lưu object user vào state
      setSessionChecked(true);
    };
    checkSession();
  }, []);

  const handleCheckout = async () => {
    setLoading(true);

    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.href,
        },
      });
      setLoading(false);
      return;
    }

    try {
      // 1. Tạo bản ghi cha trong `transactions`
      const transactionData = {
        user_id: session.user.id,
        event_id: event!.id,
        total_amount: totalAmount,
        status: 'pending',
      };

      const { data: transaction, error: transactionError } = await supabase
        .from('transactions')
        .insert(transactionData)
        .select()
        .single();

      if (transactionError) throw transactionError;

      // 2. Chuẩn bị dữ liệu cho các bản ghi con trong `transaction_items`
      const transactionItems = Object.entries(cart).map(([ticketTypeId, quantity]) => {
        const ticketInfo = event!.ticket_types.find(t => t.id === ticketTypeId);
        return {
          transaction_id: transaction.id, // Liên kết với giao dịch cha
          ticket_type_id: ticketTypeId,
          quantity: quantity,
          price: ticketInfo!.price, // Lưu lại giá tại thời điểm mua
        };
      });

      // 3. Insert tất cả các mục vào `transaction_items`
      const { error: itemsError } = await supabase.from('transaction_items').insert(transactionItems);

      if (itemsError) throw itemsError;

      // 4. Điều hướng và dọn dẹp
      navigate(`/payment/${transaction.id}`);
      clearCart();

    } catch (err: any) {
      notifications.show({ title: 'Lỗi', message: 'Không thể tạo giao dịch. Vui lòng thử lại.', color: 'red' });
      setLoading(false); // Chỉ set loading false khi có lỗi
    }
  };

  if (!loading && (!event || totalTickets === 0)) {
    return <Navigate to="/" />;
  }

  // Nếu `event` vẫn là null sau khi kiểm tra (trường hợp hiếm), return để tránh lỗi
  if (!event) {
    return null; // Hoặc một component Loading/Error khác
  }

  // Logic ticketDetails giờ đây đã an toàn vì `event` chắc chắn tồn tại
  const ticketDetails = Object.entries(cart).map(([ticketId, quantity]) => {
    const ticketInfo = event.ticket_types.find(t => t.id === ticketId);
    if (!ticketInfo) return null;
    return {
      name: ticketInfo.name,
      quantity,
      price: ticketInfo.price,
      subtotal: ticketInfo.price * quantity,
    };
  }).filter(Boolean);

  return (
    <Container my="xl">
      <Title order={2} mb="lg">Xác nhận Đơn hàng</Title>
      <Grid>
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Paper withBorder p="md" radius="md">
            {/* Dòng này giờ cũng an toàn */}
            <Title order={4} mb="sm">Sự kiện: {event.title}</Title>
            <Stack>
              {ticketDetails.map((item) => (
                item && <Group key={item.name} justify="space-between">
                  <Text>{item.name} (x{item.quantity})</Text>
                  <Text>{item.subtotal.toLocaleString('vi-VN')}đ</Text>
                </Group>
              ))}
              <Divider />
              <Group justify="space-between">
                <Text fw={700} size="lg">Tổng cộng</Text>
                <Text fw={700} size="lg">{totalAmount.toLocaleString('vi-VN')}đ</Text>
              </Group>
            </Stack>
          </Paper>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Paper withBorder p="md" radius="md">
            <Stack>
              <Title order={4}>Thông tin khách hàng</Title>
              {sessionChecked && user ? (
                <Group>
                  <Avatar src={user.user_metadata.avatar_url} alt={user.user_metadata.full_name} radius="xl" />
                  <div>
                    <Text size="sm" fw={500}>{user.user_metadata.full_name}</Text>
                    <Text size="xs" c="dimmed">{user.email}</Text>
                  </div>
                </Group>
              ) : (
                <Text size="sm">Bạn cần đăng nhập để hoàn tất đơn hàng.</Text>
              )}

              <Button
                size="lg"
                onClick={handleCheckout}
                loading={loading}
                leftSection={!user && <IconBrandGoogle size={18} />}
              >
                {user ? 'Xác nhận và Lấy mã thanh toán' : 'Đăng nhập & Tiếp tục'}
              </Button>
            </Stack>
          </Paper>
        </Grid.Col>
      </Grid>
    </Container>
  );
}