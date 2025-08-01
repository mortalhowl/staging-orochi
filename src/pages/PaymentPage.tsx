import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { Container, Loader, Center, Alert, Paper, Title, Text, Stack, Image, Button, Group, Divider, Box } from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { IconAlertCircle, IconCopy, IconCheck, IconDownload } from '@tabler/icons-react';

interface TransactionDetails {
  id: string;
  total_amount: number;
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
        // Lấy song song thông tin giao dịch và thông tin ngân hàng
        const transactionPromise = supabase.from('transactions').select('id, total_amount').eq('id', transactionId).single();
        const bankConfigPromise = supabase.from('bank_configs').select('*').limit(1).single();

        // Gọi Edge Function để tạo QR code
        const qrPromise = supabase.functions.invoke('generate-qr', {
          body: { transactionId },
        });

        const [transRes, bankRes, qrRes] = await Promise.all([transactionPromise, bankConfigPromise, qrPromise]);

        if (transRes.error) throw new Error('Không tìm thấy thông tin giao dịch.');
        if (bankRes.error) throw new Error('Chưa cấu hình thông tin ngân hàng.');
        if (qrRes.error) throw new Error('Không thể tạo mã QR.');

        setTransaction(transRes.data);
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
      <Stack align="center">
        <Paper withBorder p="xs" radius="md" w="100%">
          <Box pb="xs">
            <Text c="dimmed" fw={600}>NGÂN HÀNG</Text>
          </Box>
          <Divider />
          <Group justify="space-between" pt="xs">
            <Text fw={700}>{bankConfig?.bank_name}</Text>
          </Group>
        </Paper>

        <Paper withBorder p="xs" radius="md" w="100%">
          <Box pb="xs">
            <Text c="dimmed" fw={600}>SỐ TÀI KHOẢN</Text>
          </Box>
          <Divider />

          {/* Phần nội dung bên dưới */}
          <Group justify="space-between" pt="xs">
            <Text fw={700}>{bankConfig?.account_number}</Text>
            <Button
              onClick={() => clipboard.copy(bankConfig?.account_number)}
              variant="subtle"
              size="compact-xs"
              px={4}
            >
              <IconCopy size={16} />
            </Button>
          </Group>
        </Paper>

        <Paper withBorder p="xs" radius="md" w="100%">
          <Box pb="xs">
            <Text c="dimmed" fw={600}>NỘI DUNG CHUYỂN KHOẢN</Text>
          </Box>
          <Divider />

          {/* Phần nội dung bên dưới */}
          <Group justify="space-between" pt="xs">
            <Text fw={700} c="red">{transactionId}</Text>
            <Button
              onClick={() => clipboard.copy(transactionId)}
              variant="subtle"
              size="compact-xs"
              px={4}
            >
              <IconCopy size={16} />
            </Button>
          </Group>
        </Paper>


        <Title order={2} ta="center">Thanh toán đơn hàng</Title>
        <Text ta="center">Sử dụng App ngân hàng hoặc Ví điện tử bất kỳ để quét mã QR dưới đây</Text>

        {qrCodeUrl && <Image src={qrCodeUrl} maw={300} />}

        <Button onClick={handleDownloadQR} leftSection={<IconDownload size={16} />} variant="light" my="sm">
          Tải mã QR
        </Button>

        {/* <Stack w="100%">
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
        </Stack> */}
        <Text size="xs" c="dimmed" ta="center" mt="md">Đơn hàng sẽ được xác nhận trong vòng 1 - 3 ngày sau khi bạn hoàn tất chuyển khoản. Vui lòng giữ lại biên lai.</Text>
      </Stack>
    </Container>
  );
}