import { Container, Title, SimpleGrid, Card, Text, Group } from '@mantine/core';
import { IconBuildingBank, IconBuildingStore, IconMail } from '@tabler/icons-react';
import { Link } from 'react-router-dom';

const settings = [
  { title: 'Cấu hình Ngân hàng', description: 'Tài khoản nhận tiền cho VietQR', icon: IconBuildingBank, link: '/admin/settings/bank' },
  { title: 'Thông tin Công ty', description: 'Tên, logo, địa chỉ liên hệ', icon: IconBuildingStore, link: '/admin/settings/company' },
  { title: 'Cấu hình Email', description: 'Cài đặt SMTP để gửi mail', icon: IconMail, link: '/admin/settings/email' },
];

export function SettingsPage() {
  const cards = settings.map((setting) => (
    <Card withBorder radius="md" p="lg" component={Link} to={setting.link} key={setting.title}>
      <Group>
        <setting.icon size={40} stroke={1.5} />
        <div>
          <Text fw={500}>{setting.title}</Text>
          <Text size="sm" c="dimmed">{setting.description}</Text>
        </div>
      </Group>
    </Card>
  ));

  return (
    <Container>
      <Title order={2} mb="xl">Cài đặt Hệ thống</Title>
      <SimpleGrid cols={{ base: 1, sm: 2 }}>
        {cards}
      </SimpleGrid>
    </Container>
  );
}