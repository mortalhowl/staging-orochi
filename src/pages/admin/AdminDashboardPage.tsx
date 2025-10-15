// src/pages/admin/AdminDashboardPage.tsx
import { useState } from 'react';
import { Container, Title, Tabs, Group } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import type { DatesRangeValue } from '@mantine/dates';

// Import các components và hook mới
import { useDashboard } from '../../hooks/api/useDashboard';
import { OverviewTab } from '../../components/admin/dashboard/OverviewTab';
import { EventAnalyticsTab } from '../../components/admin/dashboard/EventAnalyticsTab';
import { TransactionAnalyticsTab } from '../../components/admin/dashboard/TransactionAnalyticsTab';

export function AdminDashboardPage() {
  const today = new Date();
  const last30Days = new Date();
  last30Days.setDate(today.getDate() - 30);

  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([last30Days, today]);
  
  // Gọi hook để lấy tất cả dữ liệu cho dashboard
  const { loading, overviewStats, eventAnalytics, transactionAnalytics } = useDashboard(dateRange);

  // SỬA LỖI Ở ĐÂY: Tạo một hàm xử lý riêng biệt và rõ ràng
  const handleDateChange = (value: DatesRangeValue) => {
    // Đảm bảo rằng chúng ta luôn có một mảng gồm 2 phần tử là Date hoặc null
    const newStartDate = value[0] ? new Date(value[0]) : null;
    const newEndDate = value[1] ? new Date(value[1]) : null;
    setDateRange([newStartDate, newEndDate]);
  };

  return (
    <Container size="xl" mt="md">
      <Group justify="space-between" mb="xl">
        <Title order={2}>Dashboard</Title>
        <DatePickerInput
          type="range"
          placeholder="Chọn khoảng thời gian"
          value={dateRange}
          onChange={handleDateChange} // <-- Sử dụng hàm xử lý mới
          maw={300}
          clearable
        />
      </Group>

      <Tabs defaultValue="overview" variant="pills" radius="md">
        <Tabs.List justify="center">
          <Tabs.Tab value="overview">Tổng quan</Tabs.Tab>
          <Tabs.Tab value="events">Sự kiện</Tabs.Tab>
          <Tabs.Tab value="transactions">Giao dịch</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="overview" pt="md">
          {/* SỬA LỖI Ở ĐÂY: Truyền đúng props cho OverviewTab */}
          <OverviewTab data={{ stats: overviewStats, revenueData: [] }} loading={loading} />
        </Tabs.Panel>

        <Tabs.Panel value="events" pt="md">
          <EventAnalyticsTab data={eventAnalytics} loading={loading} />
        </Tabs.Panel>
        
        <Tabs.Panel value="transactions" pt="md">
          <TransactionAnalyticsTab data={transactionAnalytics} loading={loading} />
        </Tabs.Panel>
      </Tabs>
    </Container>
  );
}