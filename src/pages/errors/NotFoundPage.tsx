import { Container, Title, Text, Button, Center, Stack } from '@mantine/core';
import { IconError404 } from '@tabler/icons-react';
import { Link, useLocation } from 'react-router-dom';

export function NotFoundPage() {
  const location = useLocation();
  // Kiểm tra xem người dùng đang ở khu vực admin hay không
  const isAdminArea = location.pathname.startsWith('/admin');
  const homeLink = isAdminArea ? '/admin/home' : '/';

  return (
    <Center h="100vh">
      <Container>
        <Stack align="center" gap="lg">
          <IconError404 size={120} stroke={1.5} color="var(--mantine-color-gray-5)" />
          <Title order={1} ta="center">404 - Trang không tồn tại</Title>
          <Text c="dimmed" ta="center" maw={500}>
            Rất tiếc, chúng tôi không thể tìm thấy trang bạn đang tìm kiếm. Đường dẫn có thể đã bị thay đổi hoặc không còn tồn tại.
          </Text>
          <Button component={Link} to={homeLink} size="md">
            Quay về trang chủ
          </Button>
        </Stack>
      </Container>
    </Center>
  );
}
