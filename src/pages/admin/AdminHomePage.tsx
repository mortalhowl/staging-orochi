import { Container, Title, Text } from '@mantine/core';
import { useAuthStore } from '../../store/authStore';

export function AdminHomePage() {
  const { userProfile } = useAuthStore();

  return (
    <Container>
      <Title order={2}>Chào mừng trở lại, {userProfile?.full_name || 'Admin'}!</Title>
      <Text c="dimmed" mt="md">
        Vui lòng chọn một chức năng từ thanh điều hướng bên trái để bắt đầu.
      </Text>
    </Container>
  );
}
