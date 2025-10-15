// src/pages/admin/IssuedTicketsPage.tsx
import { useState } from 'react';
import { Title, Paper, Pagination, Group, Button, SimpleGrid, Stack, Text, Center, Loader, Container } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconDownload } from '@tabler/icons-react';

// Import các components, hooks và services đã tái cấu trúc
import { TicketsTable } from '../../components/admin/tickets/TicketsTable';
import { TicketDetailDrawer } from '../../components/admin/tickets/TicketDetailDrawer';
import { TicketsToolbar } from '../../components/admin/tickets/TicketsToolbar';
import { useAuthStore } from '../../store/authStore';
import { useTickets } from '../../hooks/api/useTickets'; // <-- SỬ DỤNG CUSTOM HOOK MỚI

import { TicketsApi } from '../../services/api/tickets';
import { exportTicketsToExcel } from '../../utils/exporters/ticketExporter';

// Component con cho khu vực tổng quan, không thay đổi
function TicketsStats({ stats, loading }: { stats: any, loading: boolean }) {
  if (loading || !stats) {
    return (
      <Paper withBorder p="md" radius="md" mb="md">
        <Center h={58}><Loader size="sm" /></Center>
      </Paper>
    );
  }
  const { total_tickets = 0, checked_in_count = 0, not_checked_in_count = 0, active_count = 0, disabled_count = 0 } = stats;
  return (
    <Paper withBorder p="md" radius="md" mb="md">
      <SimpleGrid cols={{ base: 2, sm: 3, lg: 5 }}>
        <Stack align="center" gap={0}><Text size="xl" fw={700}>{total_tickets}</Text><Text size="xs" c="dimmed">Tổng số vé</Text></Stack>
        <Stack align="center" gap={0}><Text size="xl" fw={700} c="green">{checked_in_count}</Text><Text size="xs" c="dimmed">Đã check-in</Text></Stack>
        <Stack align="center" gap={0}><Text size="xl" fw={700} c="gray">{not_checked_in_count}</Text><Text size="xs" c="dimmed">Chưa check-in</Text></Stack>
        <Stack align="center" gap={0}><Text size="xl" fw={700} c="teal">{active_count}</Text><Text size="xs" c="dimmed">Hoạt động</Text></Stack>
        <Stack align="center" gap={0}><Text size="xl" fw={700} c="red">{disabled_count}</Text><Text size="xs" c="dimmed">Vô hiệu hóa</Text></Stack>
      </SimpleGrid>
    </Paper>
  );
}

export function IssuedTicketsPage() {
  const {
    tickets,
    loading,
    totalItems,
    stats,
    activePage,
    setPage,
    filters,
    setFilters,
    refresh,
    itemsPerPage,
  } = useTickets();

  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [drawerOpened, { open: openDrawer, close: closeDrawer }] = useDisclosure(false);
  const [exporting, setExporting] = useState(false);

  const { hasEditPermission } = useAuthStore();
  const canEditTickets = hasEditPermission('tickets');

  const handleSuccess = () => refresh();

  const handleRowClick = (ticketId: string) => {
    setSelectedTicketId(ticketId);
    openDrawer();
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      // Gọi service để lấy TẤT CẢ dữ liệu theo bộ lọc hiện tại
      const dataToExport = await TicketsApi.getAllTicketsForExport(filters);
      // Gửi dữ liệu cho hàm helper để xử lý và tải file
      exportTicketsToExcel(dataToExport);
    } catch (error) {
      // Lỗi đã được xử lý và thông báo bởi các module con,
      // log lại để debug nếu cần.
      console.error(error);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Container size="xl" mt="md">
      <Group justify="space-between" mb="xl">
        <Title order={2}>Quản lý Vé</Title>
        {canEditTickets && (
          <Button onClick={handleExport} loading={exporting} leftSection={<IconDownload size={16} />}>
            Xuất Excel
          </Button>
        )}
      </Group>

      <TicketsStats stats={stats} loading={loading && tickets.length === 0} />
      <TicketsToolbar filters={filters} setFilters={setFilters} />

      <Paper withBorder p="md" radius="md">
        <TicketsTable tickets={tickets} loading={loading} onRowClick={handleRowClick} />
        <Group justify="center" mt="md">
          <Pagination
            total={Math.ceil(totalItems / itemsPerPage)}
            value={activePage}
            onChange={setPage}
            withEdges
          />
        </Group>
      </Paper>

      <TicketDetailDrawer
        ticketId={selectedTicketId}
        opened={drawerOpened}
        onClose={closeDrawer}
        onSuccess={handleSuccess}
        canEdit={canEditTickets}
      />
    </Container>
  );
}