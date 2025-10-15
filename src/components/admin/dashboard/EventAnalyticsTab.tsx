// src/components/admin/dashboard/EventAnalyticsTab.tsx
import { useState } from 'react';
import { Paper, Text, Center, Loader, Table, MultiSelect, Stack, ScrollArea } from '@mantine/core';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface EventAnalyticsTabProps {
  data: any[];
  loading: boolean;
}

export function EventAnalyticsTab({ data, loading }: EventAnalyticsTabProps) {
  const [chartEvents, setChartEvents] = useState<string[]>(data.slice(0, 5).map(d => d.event_name));

  if (loading) {
    return <Center h={400}><Loader /></Center>;
  }

  const chartData = data.filter(d => chartEvents.includes(d.event_name));

  return (
    <Stack>
      <Paper withBorder radius="md" p="md">
        <Text fw={500} mb="md">So sánh hiệu suất Sự kiện</Text>
        <MultiSelect
          label="Chọn sự kiện để hiển thị trên biểu đồ"
          placeholder="Chọn tối đa 5 sự kiện"
          data={data.map(d => d.event_name)}
          value={chartEvents}
          onChange={setChartEvents}
          maxValues={5}
          searchable
        />
        <ScrollArea>
          <ResponsiveContainer width="100%" height={300} style={{ marginTop: '20px' }}>
            <BarChart data={chartData} margin={{ top: 20, right: 20, left: 40, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="event_name" />
              <YAxis yAxisId="left" tickFormatter={(value: number) => value.toLocaleString('vi-VN')} />
              <YAxis yAxisId="right" orientation="right" tickFormatter={(value: number) => value.toLocaleString('vi-VN')} />
              <Tooltip formatter={(value: number) => `${value.toLocaleString('vi-VN')}`} />
              <Legend />
              <Bar yAxisId="left" dataKey="total_revenue" name="Doanh thu (đ)" fill="#8884d8" />
              <Bar yAxisId="right" dataKey="tickets_sold" name="Số vé bán" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </ScrollArea>
      </Paper>

      <Paper withBorder radius="md" p="md">
        <Text fw={500} mb="md">Bảng dữ liệu chi tiết</Text>
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Tên sự kiện</Table.Th>
              <Table.Th>Doanh thu</Table.Th>
              <Table.Th>Số vé bán</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {data.map(row => (
              <Table.Tr key={row.event_id}>
                <Table.Td>{row.event_name}</Table.Td>
                <Table.Td>{row.total_revenue.toLocaleString('vi-VN')}đ</Table.Td>
                <Table.Td>{row.tickets_sold.toLocaleString('vi-VN')}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Paper>
    </Stack>
  );
}