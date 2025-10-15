// src/pages/errors/BadRequestPage.tsx 400
import { Container, Title, Text, Button, Center, Stack } from '@mantine/core';
import { IconMoodSad } from '@tabler/icons-react';
import { Link } from 'react-router-dom';

export function BadRequestPage() {
  return (
    <Center h="100vh">
      <Container>
        <Stack align="center" gap="lg">
          <IconMoodSad size={120} stroke={1.5} color="var(--mantine-color-yellow-5)" />
          <Title order={1} ta="center">400 - Yêu cầu không hợp lệ</Title>
          <Text c="dimmed" ta="center" maw={500}>
            Yêu cầu của bạn không thể được xử lý. Vui lòng kiểm tra lại thông tin và thử lại.
          </Text>
          <Button component={Link} to="/" size="md">
            Quay về trang chủ
          </Button>
        </Stack>
      </Container>
    </Center>
  );
}