import { Drawer, LoadingOverlay, Text, Stack, Group, Button, Divider, Alert, Table, Tabs, ActionIcon, Tooltip } from '@mantine/core';
import { useEffect, useState } from 'react';
import { supabase } from '../../../services/supabaseClient';
import { notifications } from '@mantine/notifications';
// import { modals } from '@mantine/modals';
import { TransactionNotes } from './TransactionNotes';
import { IconTicket, IconNotes, IconCopy } from '@tabler/icons-react';
import { useClipboard } from '@mantine/hooks';

// Định nghĩa lại props cho Drawer
interface TransactionDetailDrawerProps {
  transactionId: string | null;
  opened: boolean;
  onClose: () => void;
  onSuccess: () => void;
  canEdit: boolean;
}

interface TransactionDetails {
  id: string;
  total_amount: number;
  discount_amount: number;
  status: string;
  users: { email: string; full_name: string | null };
  events: { title: string };
}

interface TransactionItem {
  quantity: number;
  price: number;
  ticket_types: { name: string };
}

export function TransactionDetailDrawer({ transactionId, opened, onClose, onSuccess, canEdit }: TransactionDetailDrawerProps) {
  const [transaction, setTransaction] = useState<TransactionDetails | null>(null);
  const [items, setItems] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const clipboard = useClipboard();

  useEffect(() => {
    const fetchDetails = async () => {
      if (!transactionId) {
        setTransaction(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        // 1. NÂNG CẤP QUERY: Lấy thêm thông tin voucher (code)
        const transactionPromise = supabase
          .from('transactions')
          .select('*, users(email, full_name), events(title), vouchers(code)')
          .eq('id', transactionId)
          .single();

        const itemsPromise = supabase.from('transaction_items').select('*, ticket_types(name)').eq('transaction_id', transactionId);

        const [transRes, itemsRes] = await Promise.all([transactionPromise, itemsPromise]);

        if (transRes.error) throw transRes.error;
        if (itemsRes.error) throw itemsRes.error;

        setTransaction(transRes.data);
        setItems(itemsRes.data);
      } catch (err: any) {
        setError('Không thể tải chi tiết giao dịch.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (opened) {
      fetchDetails();
    }
  }, [transactionId, opened]);

  // const handleConfirmPayment = () => {
  //   modals.openConfirmModal({
  //     title: 'Xác nhận thanh toán',
  //     children: <Text size="sm">Bạn có chắc chắn đã nhận được khoản thanh toán cho đơn hàng này? Vé sẽ được tạo và gửi ngay lập tức.</Text>,
  //     labels: { confirm: 'Xác nhận & Gửi vé', cancel: 'Hủy' },
  //     confirmProps: { color: 'green' },
  //     onConfirm: async () => {
  //       const notiId = notifications.show({
  //         loading: true,
  //         title: 'Đang xử lý...',
  //         message: 'Vui lòng chờ.',
  //         autoClose: false,
  //       });

  //       // Gọi đến Edge Function chuyên dụng
  //       const { error: functionError } = await supabase.functions.invoke('confirm-sale-transaction', {
  //         body: { transactionId },
  //       });

  //       if (functionError) {
  //         notifications.update({
  //           id: notiId,
  //           color: 'red',
  //           title: 'Thất bại',
  //           message: 'Xác nhận giao dịch thất bại. Vui lòng thử lại.',
  //           autoClose: 5000,
  //         });
  //       } else {
  //         notifications.update({
  //           id: notiId,
  //           color: 'green',
  //           title: 'Thành công',
  //           message: 'Đã xác nhận thanh toán. Vé đang được gửi đi.',
  //           autoClose: 5000,
  //         });
  //         onSuccess(); // Refresh lại bảng
  //         onClose();   // Đóng Drawer
  //       }
  //     },
  //   });
  // };

  const handleUpdateStatus = async (newStatus: 'paid' | 'failed') => {
    setActionLoading(true);
    try {
      if (newStatus === 'paid') {
        // Gọi function chuyên dụng cho việc xác nhận
        const { error } = await supabase.functions.invoke('confirm-sale-transaction', {
          body: { transactionId },
        });
        if (error) throw error;
        notifications.show({ title: 'Thành công', message: 'Đã xác nhận thanh toán. Vé đang được gửi đi.' });
      } else {
        // Chỉ cập nhật trạng thái cho các trường hợp khác
        const { error } = await supabase.from('transactions').update({ status: newStatus }).eq('id', transactionId);
        if (error) throw error;
        notifications.show({ title: 'Thành công', message: `Đã cập nhật trạng thái thành "${newStatus}".` });
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      notifications.show({ title: 'Lỗi', message: err.message, color: 'red' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleResendTicket = async () => {
    setActionLoading(true);
    try {
      const { error } = await supabase.functions.invoke('resend-ticket', {
        body: { transactionId },
      });
      if (error) throw error;
      notifications.show({ title: 'Thành công', message: 'Đã gửi lại vé thành công.', color: 'green' });
    } catch (err: any) {
      notifications.show({ title: 'Lỗi', message: 'Gửi lại vé thất bại.', color: 'red' });
    } finally {
      setActionLoading(false);
    }
  };

  const subTotal = transaction ? transaction.total_amount + transaction.discount_amount : 0;

  // 1. Hàm mới để xử lý gửi lại vé
  // const handleResendTicket = async () => {
  //   const notiId = notifications.show({
  //     loading: true,
  //     title: 'Đang gửi lại vé...',
  //     message: 'Vui lòng chờ.',
  //     autoClose: false,
  //   });

  //   try {
  //     const { error: functionError } = await supabase.functions.invoke('resend-ticket', {
  //       body: { transactionId },
  //     });
  //     if (functionError) throw functionError;

  //     notifications.update({
  //       id: notiId,
  //       color: 'green',
  //       title: 'Thành công',
  //       message: 'Đã gửi lại vé thành công cho khách hàng.',
  //       autoClose: 5000,
  //     });
  //   } catch (err: any) {
  //     notifications.update({
  //       id: notiId,
  //       color: 'red',
  //       title: 'Thất bại',
  //       message: 'Gửi lại vé thất bại. Vui lòng thử lại sau.',
  //       autoClose: 5000,
  //     });
  //   }
  // };


  return (
    <Drawer opened={opened} onClose={onClose} title={<Text fw={700}>Chi tiết Đơn hàng</Text>} position="right" size="md">
      <div style={{ position: 'relative', height: '100%' }}>
        <LoadingOverlay visible={loading} />
        {error && <Alert color="red">{error}</Alert>}
        {transaction && (
          <Stack justify="space-between" h="100%">
            <Stack>
              <Group gap="xs" wrap="nowrap">
                <Text size="sm"><b>Mã ĐH:</b> {transaction.id}</Text>
                <Tooltip label="Sao chép Mã ĐH">
                  <ActionIcon variant="transparent" color="gray" onClick={(e) => { e.stopPropagation(); clipboard.copy(transaction.id); }}>
                    <IconCopy size={14} />
                  </ActionIcon>
                </Tooltip>
              </Group>
              <Text size="sm"><b>Khách hàng:</b> {transaction.users?.full_name || transaction.users?.email}</Text>
              <Text size="sm"><b>Sự kiện:</b> {transaction.events?.title}</Text>
              <Tabs defaultValue="tickets">
                <Tabs.List>
                  <Tabs.Tab value="tickets" leftSection={<IconTicket size={16} />}>Chi tiết vé</Tabs.Tab>
                  <Tabs.Tab value="notes" leftSection={<IconNotes size={16} />}>Ghi chú nội bộ</Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="tickets" pt="md">
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
                  <Divider my="md" />

                  {transaction.discount_amount > 0 ? (
                    <Stack gap="xs" mt="xs">
                      <Group justify="space-between">
                        <Text>Tổng tiền hàng:</Text>
                        <Text>{subTotal.toLocaleString('vi-VN')}đ</Text>
                      </Group>
                      <Group justify="space-between">
                        <Text c="green">Voucher giảm giá:</Text>
                        <Text c="green">- {transaction.discount_amount.toLocaleString('vi-VN')}đ</Text>
                      </Group>
                      <Divider />
                      <Group justify="space-between">
                        <Text fw={700}>Thành tiền:</Text>
                        <Text fw={700}>{transaction.total_amount.toLocaleString('vi-VN')}đ</Text>
                      </Group>
                    </Stack>
                  ) : (
                    <Group justify="space-between" mt="xs">
                      <Text fw={700}>Tổng cộng:</Text>
                      <Text fw={700}>{transaction.total_amount.toLocaleString('vi-VN')}đ</Text>
                    </Group>
                  )}
                  {/* <Divider mt="xs" />
                  <Group justify="space-between" mt="xs">
                    <Text fw={700}>Tổng cộng:</Text>
                    <Text fw={700}>{transaction.total_amount.toLocaleString('vi-VN')}đ</Text>
                  </Group> */}
                  {canEdit && (
                    <Stack justify='flex-end' mt="md" gap="xs">
                      {transaction.status === 'pending' && (
                        <Group justify="space-between" mt="xs">
                          <Button color="red" onClick={() => handleUpdateStatus('failed')} loading={actionLoading}>Đánh dấu Thất bại</Button>
                          <Button color="green" onClick={() => handleUpdateStatus('paid')} loading={actionLoading}>Xác nhận Thanh toán</Button>
                        </Group>
                      )}
                      {transaction.status === 'paid' && (
                        <Button variant="light" onClick={handleResendTicket} loading={actionLoading}>
                          Gửi lại vé
                        </Button>
                      )}
                    </Stack>
                  )}

                </Tabs.Panel>

                <Tabs.Panel value="notes" pt="md">
                  <TransactionNotes transactionId={transaction.id} />
                </Tabs.Panel>
              </Tabs>
            </Stack>
          </Stack>
        )}
      </div>
    </Drawer>
  );
}
