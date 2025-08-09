import { Container, Title, Text, Button, Center, Stack } from '@mantine/core';
import { IconLock } from '@tabler/icons-react';
import { Link } from 'react-router-dom';

export function ForbiddenPage() {
  return (
    <Center h="calc(100vh - 120px)">
      <Container>
        <Stack align="center" gap="lg">
          <IconLock size={80} stroke={1.5} />
          <Title order={1} ta="center">403 - Truy cập bị từ chối</Title>
          <Text c="dimmed" ta="center">
            Bạn không có quyền truy cập vào trang này. Vui lòng liên hệ quản trị viên nếu bạn cho rằng đây là một sự nhầm lẫn.
          </Text>
          <Button component={Link} to="/admin/dashboard" size="md">
            Quay về Trang tổng quan
          </Button>
        </Stack>
      </Container>
    </Center>
  );
}
