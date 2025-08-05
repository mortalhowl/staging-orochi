import { Paper, Text, Button, Group } from '@mantine/core';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { IconCheck } from '@tabler/icons-react';
import { supabase } from '../../../services/supabaseClient';

interface TransactionsToolbarProps {
  selection: string[];
  onSuccess: () => void;
}

export function TransactionsToolbarBulk({ selection, onSuccess }: TransactionsToolbarProps) {
  const handleBulkConfirm = () => {
    modals.openConfirmModal({
      title: 'Xác nhận hàng loạt',
      centered: true,
      children: <Text size="sm">Bạn có chắc muốn xác nhận thanh toán cho <b>{selection.length}</b> giao dịch đã chọn?</Text>,
      labels: { confirm: 'Xác nhận', cancel: 'Hủy' },
      confirmProps: { color: 'green' },
      onConfirm: async () => {
        const notiId = notifications.show({ loading: true, title: 'Đang xử lý...', message: 'Vui lòng chờ.', autoClose: false });
        const { error } = await supabase.functions.invoke('confirm-transactions-bulk', {
          body: { transactionIds: selection },
        });

        if (error) {
          notifications.update({ id: notiId, color: 'red', title: 'Thất bại', message: error.message });
        } else {
          notifications.update({ id: notiId, color: 'green', title: 'Thành công', message: `Đã gửi yêu cầu xác nhận cho ${selection.length} giao dịch.` });
          onSuccess();
        }
      },
    });
  };

  return (
    <Paper withBorder p="sm" radius="md" shadow="sm" mb="md">
      <Group justify="space-between">
        <Text fw={500}>{selection.length} mục đã được chọn</Text>
        <Button color="green" leftSection={<IconCheck size={16} />} onClick={handleBulkConfirm}>
          Xác nhận các mục đã chọn
        </Button>
      </Group>
    </Paper>
  );
}