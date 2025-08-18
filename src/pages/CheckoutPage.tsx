import { Container, Title, Paper, Grid, Stack, Text, Divider, Button, Group, Avatar, TextInput, ActionIcon } from '@mantine/core';
import { useCartStore } from '../store/cartStore';
import { Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { notifications } from '@mantine/notifications';
import { useState, useEffect } from 'react';
import { IconBrandGoogle, IconTicket, IconX } from '@tabler/icons-react';
import type { User } from '@supabase/supabase-js';
import type { UserProfile } from '../types';

export function CheckoutPage() {
  // Lấy state và actions từ "kho" giỏ hàng
  const { event, cart, totalAmount, totalTickets, appliedVoucher, finalAmount, applyVoucher, removeVoucher, clearCart } = useCartStore();
  const navigate = useNavigate();
  
  // State cho các hành động trên trang
  const [loading, setLoading] = useState(false);
  const [voucherLoading, setVoucherLoading] = useState(false);

  // State cho thông tin người dùng
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  
  // State cho các ô nhập liệu
  const [voucherCode, setVoucherCode] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);

  useEffect(() => {
    const checkSessionAndProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      
      if (session?.user) {
        const { data: profileData } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        if (profileData) {
          setUserProfile(profileData);
          setPhone(profileData.phone || '');
        }
      }
      setSessionChecked(true);
    };
    checkSessionAndProfile();
  }, []);

  const handleApplyVoucher = async () => {
    if (!voucherCode.trim()) return;
    setVoucherLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('validate-voucher', {
        body: {
          voucherCode,
          orderAmount: totalAmount,
          eventId: event!.id,
        },
      });
      if (error) {
        const errorBody = JSON.parse(error.context.body);
        throw new Error(errorBody.error);
      }
      
      applyVoucher({ voucher: data.voucher, discountAmount: data.discountAmount });
      notifications.show({ title: 'Thành công', message: 'Đã áp dụng voucher!', color: 'green' });
    } catch (err: any) {
      notifications.show({ title: 'Áp dụng thất bại', message: err.message, color: 'red' });
    } finally {
      setVoucherLoading(false);
    }
  };

  const validatePhone = (phoneNumber: string): boolean => {
    const phoneRegex = /^0\d{9}$/;
    if (!phoneNumber) {
        setPhoneError('Vui lòng nhập số điện thoại.');
        return false;
    }
    if (!phoneRegex.test(phoneNumber)) {
        setPhoneError('Số điện thoại không hợp lệ (phải bắt đầu bằng 0 và có 10 chữ số).');
        return false;
    }
    setPhoneError(null);
    return true;
  };

  const handleCheckout = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.href },
      });
      setLoading(false);
      return;
    }

    if (!validatePhone(phone)) {
        setLoading(false);
        return;
    }

    try {
      if (phone !== userProfile?.phone) {
        const { error: updateError } = await supabase.from('users').update({ phone }).eq('id', session.user.id);
        if (updateError) throw updateError;
      }

      const transactionData = {
        user_id: session.user.id,
        event_id: event!.id,
        total_amount: finalAmount,
        status: 'pending',
        applied_voucher_id: appliedVoucher?.voucher.id || null,
        discount_amount: appliedVoucher?.discountAmount || 0,
      };

      const { data: transaction, error: transactionError } = await supabase.from('transactions').insert(transactionData).select().single();
      if (transactionError) throw transactionError;

      const transactionItems = Object.entries(cart).map(([ticketTypeId, quantity]) => {
        const ticketInfo = event!.ticket_types.find(t => t.id === ticketTypeId);
        return {
          transaction_id: transaction.id,
          ticket_type_id: ticketTypeId,
          quantity: quantity,
          price: ticketInfo!.price,
        };
      });

      const { error: itemsError } = await supabase.from('transaction_items').insert(transactionItems);
      if (itemsError) throw itemsError;

      if (appliedVoucher) {
        const { error: voucherError } = await supabase.rpc('increment_voucher_usage', {
            p_voucher_id: appliedVoucher.voucher.id
        });
        if (voucherError) console.error("Failed to increment voucher usage:", voucherError);
      }

      navigate(`/payment/${transaction.id}`);
      clearCart();
    } catch (err: any) {
      notifications.show({ title: 'Lỗi', message: 'Không thể tạo giao dịch. Vui lòng thử lại.', color: 'red' });
      setLoading(false);
    }
  };

  if (!loading && (!event || totalTickets === 0)) {
    return <Navigate to="/" />;
  }

  if (!event) {
    return null;
  }

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
                <Text>Tạm tính</Text>
                <Text>{totalAmount.toLocaleString('vi-VN')}đ</Text>
              </Group>
              {appliedVoucher && (
                <Group justify="space-between">
                  <Group gap="xs">
                    <IconTicket size={16} color="green" />
                    <Text c="green">Giảm giá ({appliedVoucher.voucher.code})</Text>
                    <ActionIcon variant="transparent" color="red" size="sm" onClick={removeVoucher}><IconX/></ActionIcon>
                  </Group>
                  <Text c="green">- {appliedVoucher.discountAmount.toLocaleString('vi-VN')}đ</Text>
                </Group>
              )}
              <Divider />
              <Group justify="space-between">
                <Text fw={700} size="lg">Tổng cộng</Text>
                <Text fw={700} size="lg">{finalAmount.toLocaleString('vi-VN')}đ</Text>
              </Group>
            </Stack>
          </Paper>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Stack>
            <Paper withBorder p="md" radius="md">
                <Group>
                    <TextInput
                        placeholder="Nhập mã giảm giá"
                        value={voucherCode}
                        onChange={(e) => setVoucherCode(e.currentTarget.value.toUpperCase())}
                        style={{ flex: 1 }}
                    />
                    <Button onClick={handleApplyVoucher} loading={voucherLoading}>Áp dụng</Button>
                </Group>
            </Paper>
            <Paper withBorder p="md" radius="md">
              <Stack>
                <Title order={4}>Thông tin khách hàng</Title>
                {sessionChecked && user ? (
                  <>
                    <Group>
                      <Avatar src={user.user_metadata.avatar_url} alt={userProfile?.full_name || ''} radius="xl" />
                      <div>
                        <Text size="sm" fw={500}>{userProfile?.full_name || user.user_metadata.full_name}</Text>
                        <Text size="xs" c="dimmed">{user.email}</Text>
                      </div>
                    </Group>
                    <TextInput
                      required
                      label="Số điện thoại"
                      placeholder="0123456789"
                      value={phone}
                      onChange={(event) => {
                        setPhone(event.currentTarget.value);
                        if (phoneError) setPhoneError(null);
                      }}
                      error={phoneError}
                    />
                  </>
                ) : (
                  <Text size="sm">Bạn cần đăng nhập để hoàn tất đơn hàng.</Text>
                )}
                <Button
                  size="lg"
                  bg="#008a87"
                  onClick={handleCheckout}
                  loading={loading}
                  leftSection={!user && <IconBrandGoogle size={18} />}
                >
                  {user ? 'Xác nhận và Lấy mã thanh toán' : 'Đăng nhập & Tiếp tục'}
                </Button>
              </Stack>
            </Paper>
          </Stack>
        </Grid.Col>
      </Grid>
    </Container>
  );
}
