import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { Container, Loader, Center, Alert, Paper, Text, Stack, Image, Button, Group, Table } from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { IconAlertCircle, IconCopy, IconDownload, IconInfoCircle } from '@tabler/icons-react';

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
      <Alert
        icon={<IconInfoCircle size={16} />}
        title="Lưu ý!"
        color="yellow"
        variant="light"
        my="md"
      >
        Giao dịch sẽ được xử lý trong khoảng từ 1 đến 3 ngày làm việc. Vui lòng theo dõi trạng thái giao dịch trong <b> Vé của tôi &gt; Lịch sử giao dịch</b>.
      </Alert>

      <Paper withBorder p="xs" radius="md">
        <Stack align="center">
          <Text ta="center" fw="bold">Quét mã QR để thanh toán</Text>
          {qrCodeUrl && <Image src={qrCodeUrl} maw={300} />}
          <Button onClick={handleDownloadQR} leftSection={<IconDownload size={16} />} variant="light" my="sx">
            Tải mã QR
          </Button>
        </Stack>
      </Paper>

      <Text size="xs" c="dimmed" ta="center" mt="md" style={{ fontStyle: 'italic' }}>(Nếu không thể quét, vui lòng chuyển khoản theo thông tin dưới đây)</Text>

      <Stack mt="md">
        <Table striped highlightOnHover withTableBorder withColumnBorders >
          <Table.Tbody>
            <Table.Tr>
              <Table.Td colSpan={2} align="left">
                <Text c="dimmed" fw={600}>NGÂN HÀNG</Text>
              </Table.Td>
            </Table.Tr>
            <Table.Tr >
              <Table.Td colSpan={2} align="left">
                <Text fw={700}>{bankConfig?.bank_name}</Text>
              </Table.Td>
            </Table.Tr>
          </Table.Tbody>
        </Table>

        <Table striped highlightOnHover withTableBorder withColumnBorders >
          <Table.Tbody>
            <Table.Tr>
              <Table.Td colSpan={2} align="left">
                <Text c="dimmed" fw={600}>SỐ TÀI KHOẢN</Text>
              </Table.Td>
            </Table.Tr>
            <Table.Tr >
              <Table.Td colSpan={2} align="left">
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
              </Table.Td>
            </Table.Tr>
          </Table.Tbody>
        </Table>

        <Table striped highlightOnHover withTableBorder withColumnBorders >
          <Table.Tbody>
            <Table.Tr>
              <Table.Td colSpan={2} align="left">
                <Text c="dimmed" fw={600}>TÊN TÀI KHOẢN</Text>
              </Table.Td>
            </Table.Tr>
            <Table.Tr >
              <Table.Td colSpan={2} align="left">
                <Text fw={700}>{bankConfig?.account_name}</Text>
              </Table.Td>
            </Table.Tr>
          </Table.Tbody>
        </Table>

        <Table striped highlightOnHover withTableBorder withColumnBorders >
          <Table.Tbody>
            <Table.Tr>
              <Table.Td colSpan={2} align="left">
                <Text c="dimmed" fw={600}>NỘI DUNG CHUYỂN KHOẢN</Text>
              </Table.Td>
            </Table.Tr>
            <Table.Tr >
              <Table.Td colSpan={2} align="left">
                <Group justify="space-between" pt="xs" wrap='nowrap'>
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
              </Table.Td>
            </Table.Tr>
          </Table.Tbody>
        </Table>

        <Table striped highlightOnHover withTableBorder withColumnBorders >
          <Table.Tbody>
            <Table.Tr>
              <Table.Td colSpan={2} align="left">
                <Text c="dimmed" fw={600}>SỐ TIỀN</Text>
              </Table.Td>
            </Table.Tr>
            <Table.Tr >
              <Table.Td colSpan={2} align="left">
                <Text fw={700} c='red'>{transaction?.total_amount.toLocaleString('vi-VN')} VNĐ</Text>
              </Table.Td>
            </Table.Tr>
          </Table.Tbody>
        </Table>
      </Stack>
    </Container>
  );
}
