import { useState } from 'react';
import { Container, Title, Tabs, Group } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import type { DatesRangeValue } from '@mantine/dates';
import { OverviewTab } from '../../components/admin/dashboard/OverviewTab';
import { EventAnalyticsTab } from '../../components/admin/dashboard/EventAnalyticsTab'; // 1. Import component mới

export function AdminDashboardPage() {
  const today = new Date();
  const last30Days = new Date();
  last30Days.setDate(today.getDate() - 30);

  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([last30Days, today]);

  const handleDateChange = (value: DatesRangeValue) => {
    const [start, end] = value;
    const newStartDate = start ? new Date(start) : null;
    const newEndDate = end ? new Date(end) : null;
    setDateRange([newStartDate, newEndDate]);
  };

  return (
    <Container size="xl">
      <Group justify="space-between" mb="xl">
        <Title order={2}>Dashboard</Title>
        <DatePickerInput
          type="range"
          placeholder="Chọn khoảng thời gian"
          value={dateRange}
          onChange={handleDateChange}
          maw={300}
          clearable
        />
      </Group>

      <Tabs defaultValue="overview">
        <Tabs.List>
          <Tabs.Tab value="overview">Tổng quan</Tabs.Tab>
          {/* 2. Kích hoạt tab mới */}
          <Tabs.Tab value="events">Phân tích Sự kiện</Tabs.Tab>
          <Tabs.Tab value="transactions" disabled>Phân tích Giao dịch</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="overview" pt="md">
          <OverviewTab dateRange={dateRange} />
        </Tabs.Panel>

        {/* 3. Render component mới */}
        <Tabs.Panel value="events" pt="md">
          <EventAnalyticsTab dateRange={dateRange} />
        </Tabs.Panel>
      </Tabs>
    </Container>
  );
}
