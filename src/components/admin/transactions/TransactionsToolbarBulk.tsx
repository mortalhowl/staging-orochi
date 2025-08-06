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
        const { error } = await supabase.functions.invoke('confirm-transactions-bulk', {
          body: { transactionIds: selection },
        });

        if (error) {
          notifications.show({ color: 'red', title: 'Thất bại', message: "Gửi yêu cầu xác nhận hàng loạt thất bại." });
        } else {
          // Thông báo cho admin biết yêu cầu đã được gửi đi và đang xử lý ngầm
          notifications.show({ color: 'green', title: 'Đã gửi yêu cầu', message: `Hệ thống đang xử lý xác nhận và gửi vé cho ${selection.length} giao dịch.` });
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