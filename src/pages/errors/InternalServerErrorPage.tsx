// src/pages/errors/InternalServerErrorPage.tsx 500
import { Container, Title, Text, Button, Center, Stack } from '@mantine/core';
import { IconServerOff } from '@tabler/icons-react';
import { Link } from 'react-router-dom';

export function InternalServerErrorPage() {
  return (
    <Center h="100vh">
      <Container>
        <Stack align="center" gap="lg">
          <IconServerOff size={120} stroke={1.5} color="var(--mantine-color-red-5)" />
          <Title order={1} ta="center">500 - Lỗi Máy chủ</Title>
          <Text c="dimmed" ta="center" maw={500}>
            Đã có lỗi xảy ra ở phía máy chủ của chúng tôi. Chúng tôi đang tích cực làm việc để khắc phục. Vui lòng thử lại sau.
          </Text>
          <Button component={Link} to="/" size="md">
            Quay về trang chủ
          </Button>
        </Stack>
      </Container>
    </Center>
  );
}