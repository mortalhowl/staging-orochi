// src/components/common/ui/ErrorBoundary.tsx
import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react'
import { Container, Title, Text, Button, Center, Stack } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Cập nhật state để lần render tiếp theo sẽ hiển thị UI dự phòng.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Bạn cũng có thể log lỗi này tới một dịch vụ báo cáo lỗi
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  }

  public render() {
    if (this.state.hasError) {
      return (
         <Center h="100vh">
          <Container>
            <Stack align="center" gap="lg">
              <IconAlertTriangle size={120} stroke={1.5} color="var(--mantine-color-orange-5)" />
              <Title order={1} ta="center">Đã có lỗi xảy ra</Title>
              <Text c="dimmed" ta="center" maw={500}>
                Ứng dụng đã gặp phải một lỗi không mong muốn. Vui lòng tải lại trang để tiếp tục.
              </Text>
              <Button onClick={this.handleReload} size="md" color="orange">
                Tải lại trang
              </Button>
            </Stack>
          </Container>
        </Center>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;