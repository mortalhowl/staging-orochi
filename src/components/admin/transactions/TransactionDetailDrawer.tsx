import { Drawer, LoadingOverlay, Title, Text, Stack, Group, Button, Divider, Alert, Table } from '@mantine/core';
import { useEffect, useState } from 'react';
import { supabase } from '../../../services/supabaseClient';
import { notifications } from '@mantine/notifications';
import { modals } from '@mantine/modals';

// Định nghĩa lại props cho Drawer
interface TransactionDetailDrawerProps {
  transactionId: string | null;
  opened: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface TransactionDetails {
  id: string;
  total_amount: number;
  status: string;
  users: { email: string; full_name: string | null };
  events: { title: string };
}

interface TransactionItem {
  quantity: number;
  price: number;
  ticket_types: { name: string };
}

export function TransactionDetailDrawer({ transactionId, opened, onClose, onSuccess }: TransactionDetailDrawerProps) {
  const [transaction, setTransaction] = useState<TransactionDetails | null>(null);
  const [items, setItems] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDetails = async () => {
      if (!transactionId) {
        setTransaction(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Lấy thông tin giao dịch và các mục trong giỏ hàng song song
        const transactionPromise = supabase.from('transactions').select('*, users(email, full_name), events(title)').eq('id', transactionId).single();
        const itemsPromise = supabase.from('transaction_items').select('*, ticket_types(name)').eq('transaction_id', transactionId);

        const [transRes, itemsRes] = await Promise.all([transactionPromise, itemsPromise]);

        if (transRes.error) throw transRes.error;
        if (itemsRes.error) throw itemsRes.error;

        setTransaction(transRes.data as any);
        setItems(itemsRes.data as any);

      } catch (err: any) {
        setError('Không thể tải chi tiết giao dịch.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [transactionId]);

  const handleConfirmPayment = () => {
    modals.openConfirmModal({
      title: 'Xác nhận thanh toán',
      children: <Text size="sm">Bạn có chắc chắn đã nhận được khoản thanh toán cho đơn hàng này?</Text>,
      labels: { confirm: 'Xác nhận & Gửi vé', cancel: 'Hủy' },
      confirmProps: { color: 'green' },
      onConfirm: async () => {
        // Bước 1: Cập nhật trạng thái giao dịch. Bước này vẫn cần await.
        const { error: updateError } = await supabase
          .from('transactions')
          .update({ status: 'paid', paid_at: new Date().toISOString() })
          .eq('id', transactionId);

        if (updateError) {
          notifications.show({ title: 'Lỗi', message: 'Cập nhật trạng thái thất bại.', color: 'red' });
          return; // Dừng lại nếu có lỗi
        }

        // Bước 2: Gọi Edge Function mà không cần "await".
        // Hệ thống sẽ gửi yêu cầu đi và tiếp tục chạy các lệnh tiếp theo ngay lập tức.
        supabase.functions.invoke('send-ticket-email', {
          body: { transactionId },
        }).then(({ error: functionError }) => {
          // Chúng ta có thể bắt lỗi ở đây và log ra nếu muốn, nhưng không làm ảnh hưởng đến giao diện
          if (functionError) {
            console.error(`Failed to send email for transaction ${transactionId}:`, functionError);
          }
        });

        // Bước 3: Hiển thị thông báo thành công cuối cùng và đóng modal/drawer.
        notifications.show({
          title: 'Thành công',
          message: 'Đã xác nhận thanh toán. Vé sẽ được gửi đi trong giây lát.',
          color: 'green'
        });

        onSuccess(); // Refresh lại bảng
        onClose();   // Đóng Drawer
      },
    });
  };

  // 1. Hàm mới để xử lý gửi lại vé
  const handleResendTicket = async () => {
    const notiId = notifications.show({
      loading: true,
      title: 'Đang gửi lại vé...',
      message: 'Vui lòng chờ.',
      autoClose: false,
    });

    try {
      const { error: functionError } = await supabase.functions.invoke('resend-ticket', {
        body: { transactionId },
      });
      if (functionError) throw functionError;

      notifications.update({
        id: notiId,
        color: 'green',
        title: 'Thành công',
        message: 'Đã gửi lại vé thành công cho khách hàng.',
        autoClose: 5000,
      });
    } catch (err: any) {
      notifications.update({
        id: notiId,
        color: 'red',
        title: 'Thất bại',
        message: 'Gửi lại vé thất bại. Vui lòng thử lại sau.',
        autoClose: 5000,
      });
    }
  };


  return (
    <Drawer opened={opened} onClose={onClose} title="Chi tiết Đơn hàng" position="right" size="md">
      <div style={{ position: 'relative', height: '100%' }}>
        <LoadingOverlay visible={loading} />
        {error && <Alert color="red">{error}</Alert>}
        {transaction && (
          <Stack justify="space-between" h="100%">
            <Stack>
              <Title order={4}>Chi tiết Đơn hàng</Title>
              <Text size="sm"><b>Mã ĐH:</b> {transaction.id}</Text>
              <Text size="sm"><b>Khách hàng:</b> {transaction.users?.full_name || transaction.users?.email}</Text>
              <Text size="sm"><b>Sự kiện:</b> {transaction.events?.title}</Text>
              <Divider my="xs" />
              <Title order={5}>Các vé đã đặt:</Title>
              <Table withRowBorders={false}>
                <Table.Tbody>
                  {items.map(item => (
                    <Table.Tr key={item.ticket_types.name}>
                      <Table.Td>
                        <Text size="sm">{item.ticket_types.name} x <b>{item.quantity}</b></Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" ta="right">{(item.price * item.quantity).toLocaleString('vi-VN')}đ</Text>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
              <Divider />
              <Group justify="space-between">
                <Text fw={700}>Tổng cộng:</Text>
                <Text fw={700}>{transaction.total_amount.toLocaleString('vi-VN')}đ</Text>
              </Group>
            </Stack>
            {transaction.status === 'pending' && (
              <Button color="green" onClick={handleConfirmPayment}>
                Xác nhận đã thanh toán
              </Button>
            )}
            {transaction.status === 'paid' && (
              <Button variant="light" onClick={handleResendTicket}>
                Gửi lại vé
              </Button>
            )}
          </Stack>
        )}
      </div>
    </Drawer>
  );
}