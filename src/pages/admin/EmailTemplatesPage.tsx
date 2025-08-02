import { Container, Title, Grid, Tabs, Paper, Text, Code, Stack } from '@mantine/core';
import { TemplateEditor } from '../../components/admin/settings/TemplateEditor';

function PlaceholdersHelp() {
    const placeholders = [
        { key: 'ten_khach_hang', desc: 'Tên đầy đủ của người mua' },
        { key: 'ten_su_kien', desc: 'Tên sự kiện' },
        { key: 'ma_don_hang', desc: 'Mã giao dịch duy nhất' },
        { key: 'tong_tien', desc: 'Tổng tiền đơn hàng (đã định dạng)' },
        { key: 'danh_sach_ve', desc: 'Danh sách chi tiết các vé đã mua (HTML)' },
    ];
    return (
        <Paper withBorder p="md" radius="md">
            <Title order={5} mb="sm">Các biến có thể sử dụng</Title>
            <Text size="sm" mb="md">Sử dụng các biến sau trong Tiêu đề hoặc Nội dung, chúng sẽ được tự động thay thế:</Text>
            <Stack gap="xs">
                {placeholders.map(p => (
                    <div key={p.key}>
                        <Code>{`{{${p.key}}}`}</Code>
                        <Text size="xs" c="dimmed">- {p.desc}</Text>
                    </div>
                ))}
            </Stack>
        </Paper>
    )
}

export function EmailTemplatesPage() {
  return (
    <Container size="xl">
      <Title order={2} mb="xl">Quản lý Mẫu Email</Title>
      <Grid>
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Tabs defaultValue="purchase_confirmation">
            <Tabs.List>
              <Tabs.Tab value="purchase_confirmation">Email Gửi vé bán</Tabs.Tab>
              <Tabs.Tab value="invitation_ticket">Email Gửi vé mời</Tabs.Tab>
              <Tabs.Tab value="resend_ticket">Email Gửi lại vé</Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="purchase_confirmation" pt="md">
              <TemplateEditor templateType="purchase_confirmation" title="Mẫu Email Gửi Khi Khách Mua Vé Thành Công"/>
            </Tabs.Panel>
            <Tabs.Panel value="invitation_ticket" pt="md">
              <TemplateEditor templateType="invitation_ticket" title="Mẫu Email Gửi Vé Mời"/>
            </Tabs.Panel>
            <Tabs.Panel value="resend_ticket" pt="md">
              <TemplateEditor templateType="resend_ticket" title="Mẫu Email Khi Gửi Lại Vé Cho Khách"/>
            </Tabs.Panel>
          </Tabs>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 4 }}>
            <PlaceholdersHelp />
        </Grid.Col>
      </Grid>
    </Container>
  );
}