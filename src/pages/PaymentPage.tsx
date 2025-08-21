import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { Container, Loader, Center, Alert, Paper, Text, Stack, Image, Button, Group, Table, Title, Divider, Badge, Card, ThemeIcon } from '@mantine/core';
import { useClipboard } from '@mantine/hooks';
import { IconAlertCircle, IconCopy, IconDownload, IconInfoCircle, IconListDetails, IconTicket } from '@tabler/icons-react';

interface DetailedTransaction {
  id: string;
  total_amount: number;
  discount_amount: number;
  user_id: string;
  events: { title: string };
  vouchers: { code: string } | null;
  transaction_items: {
    quantity: number;
    price: number;
    ticket_types: { name: string };
  }[];
}

export function PaymentPage() {
  const { transactionId } = useParams<{ transactionId: string }>();
  const clipboard = useClipboard({ timeout: 1000 });
  const [transaction, setTransaction] = useState<DetailedTransaction | null>(null);
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
        if (sessionError || !session) throw new Error('Vui lòng đăng nhập để tiếp tục.');
        const currentUserId = session.user.id;

        // 1. NÂNG CẤP QUERY: Lấy thông tin chi tiết của giao dịch
        const transactionPromise = supabase
          .from('transactions')
          .select(`
            *,
            events(title),
            vouchers(code),
            transaction_items(*, ticket_types(name))
          `)
          .eq('id', transactionId)
          .single();

        const bankConfigPromise = supabase.from('bank_configs').select('*').limit(1).single();
        const qrPromise = supabase.functions.invoke('generate-qr', { body: { transactionId } });

        const [transRes, bankRes, qrRes] = await Promise.all([transactionPromise, bankConfigPromise, qrPromise]);

        if (transRes.error) throw new Error('Không tìm thấy thông tin giao dịch.');
        if (transRes.data.user_id !== currentUserId) throw new Error('Bạn không có quyền truy cập vào giao dịch này.');

        setTransaction(transRes.data as DetailedTransaction);

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
  if (!transaction) return null;
  const subTotal = transaction.total_amount + transaction.discount_amount;
  return (
    <Container my="xs" size="xs">
      <Stack>
        <Paper withBorder p="xs" radius="md">
          <Stack gap="sm">
            <Group justify='space-between' align='center'>
              <Group justify='flex-start'>
              <ThemeIcon size={38} radius="xl" variant="light" color="#008a87">
                <IconListDetails size={25} />
              </ThemeIcon>
              <Title order={4} c="#008a87">Chi tiết</Title>
            </Group>
              <Badge>
                {transaction.events.title}
              </Badge>
            </Group>
            <Divider />

            {transaction.transaction_items.map((item, index) => (
              <Group key={index} justify="space-between">
                <Card
                  withBorder
                  radius="md"
                  padding="xs"
                  w={'100%'}
                >
                  <Group wrap="nowrap" align="center">
                    <ThemeIcon size={48} radius="xl" variant="light" color="teal">
                      <IconTicket size={28} />
                    </ThemeIcon>
                    <Stack gap='xs' w='100%'>
                      <Group justify='space-between'>
                        <Text fz="sm" c="dimmed">Vé {item.ticket_types.name}</Text>
                        <Text fz="sm" c="dimmed">x{item.quantity}</Text>
                      </Group>
                      <Text fz="sm" c="dimmed">{(item.price * item.quantity).toLocaleString("vi-VN")}đ</Text>
                    </Stack>
                  </Group>
                </Card>
              </Group>
            ))}

            <Divider />

            <Group justify="space-between">
              <Text>Tạm tính</Text>
              <Text>{subTotal.toLocaleString("vi-VN")}đ</Text>
            </Group>

            {transaction.vouchers && (
              <Group justify="space-between">

                <Text c="#008a87">
                  Voucher ({transaction.vouchers.code})
                </Text>
                <Text c="#008a87">
                  - {transaction.discount_amount.toLocaleString("vi-VN")}đ
                </Text>
              </Group>
            )}

            <Divider />

            <Group justify="space-between">
              <Text fw={700} size="lg">
                Tổng cộng
              </Text>
              <Text fw={700} size="lg">
                {transaction.total_amount.toLocaleString("vi-VN")}đ
              </Text>
            </Group>
          </Stack>
        </Paper>
      </Stack>

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
        <Table striped highlightOnHover withTableBorder withColumnBorders>
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
                
                <Group justify="space-between" pt="xs" wrap='nowrap'>
                  <Text fw={700} c='red'>{transaction?.total_amount.toLocaleString('vi-VN')} VNĐ</Text>
                  <Button
                    onClick={() => clipboard.copy(transaction.total_amount)}
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
      </Stack>
    </Container >
  );
}
