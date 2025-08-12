import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { Container, Loader, Center, Alert, Paper, Title, Text, Stack, Image, Button, Group } from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { IconAlertCircle, IconCopy, IconDownload } from '@tabler/icons-react';

interface TransactionDetails {
  id: string;
  total_amount: number;
  user_id: string; // Thêm user_id để kiểm tra
}

export function PaymentPage() {
  const { transactionId } = useParams<{ transactionId: string }>();
  const clipboard = useClipboard({ timeout: 1000 });
  const [transaction, setTransaction] = useState<TransactionDetails | null>(null);
  const [bankConfig, setBankConfig] = useState<any>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPaymentInfo = async () => {
      if (!transactionId) {
        setError('Không tìm thấy mã giao dịch.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Lấy session của người dùng hiện tại
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) throw new Error('Giao dịch không hợp lệ.');
        const currentUserId = session.user.id;

        // Lấy thông tin giao dịch
        const { data: transData, error: transError } = await supabase
            .from('transactions')
            .select('id, total_amount, user_id')
            .eq('id', transactionId)
            .single();

        if (transError) throw new Error('Không tìm thấy thông tin giao dịch.');

        // BƯỚC KIỂM TRA BẢO MẬT
        if (transData.user_id !== currentUserId) {
            throw new Error('Bạn không có quyền truy cập vào giao dịch này.');
        }
        setTransaction(transData);

        // Nếu đã qua kiểm tra, tiếp tục lấy thông tin khác
        const bankConfigPromise = supabase.from('bank_configs').select('*').limit(1).single();
        const qrPromise = supabase.functions.invoke('generate-qr', {
          body: { transactionId },
        });

        const [bankRes, qrRes] = await Promise.all([bankConfigPromise, qrPromise]);

        if (bankRes.error) throw new Error('Chưa cấu hình thông tin ngân hàng.');
        if (qrRes.error) throw new Error('Không thể tạo mã QR.');

        setBankConfig(bankRes.data);
        setQrCodeUrl(qrRes.data.qrDataURL);

      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentInfo();
  }, [transactionId]);
  
  const handleDownloadQR = () => {
    if (qrCodeUrl) {
      const link = document.createElement('a');
      link.href = qrCodeUrl;
      link.download = `QR_Thanh_Toan_${transactionId}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (loading) return <Center h="80vh"><Loader /></Center>;
  if (error) return <Container py="xl"><Alert icon={<IconAlertCircle size="1rem" />} title="Lỗi!" color="red">{error}</Alert></Container>;

  return (
    <Container my="xl" size="xs">
      <Paper withBorder p="xl" radius="md">
        <Stack align="center">
          <Title order={2} ta="center">Thanh toán đơn hàng</Title>
          <Text ta="center">Sử dụng App ngân hàng hoặc Ví điện tử bất kỳ để quét mã QR dưới đây</Text>
          
          {qrCodeUrl && <Image src={qrCodeUrl} maw={300} />}

          <Button onClick={handleDownloadQR} leftSection={<IconDownload size={16} />} variant="light" my="sm">
            Tải mã QR
          </Button>

          <Stack w="100%">
            <Group justify="space-between"><Text c="dimmed">Ngân hàng:</Text><Text fw={500}>{bankConfig?.bank_name}</Text></Group>
            <Group justify="space-between"><Text c="dimmed">Chủ tài khoản:</Text><Text fw={500}>{bankConfig?.account_name}</Text></Group>
            <Group justify="space-between"><Text c="dimmed">Số tài khoản:</Text><Text fw={500}>{bankConfig?.account_number}</Text></Group>
            <Group justify="space-between"><Text c="dimmed">Số tiền:</Text><Text fw={700} c="blue.6" size="xl">{transaction?.total_amount.toLocaleString('vi-VN')}đ</Text></Group>
            <Group justify="space-between" wrap="nowrap">
                <Text c="dimmed">Nội dung:</Text>
                <Group gap="xs">
                    <Text fw={700} c="red">{transactionId}</Text>
                    <Button onClick={() => clipboard.copy(transactionId)} size="xs" variant="outline">
                        {clipboard.copied ? 'Đã chép' : 'Sao chép'}
                    </Button>
                </Group>
            </Group>
          </Stack>
          <Text size="xs" c="dimmed" ta="center" mt="md">Đơn hàng sẽ được xác nhận thủ công sau khi bạn hoàn tất chuyển khoản. Vui lòng giữ lại biên lai.</Text>
        </Stack>
      </Paper>
    </Container>
  );
}
