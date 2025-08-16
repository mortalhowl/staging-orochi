import { useState, useEffect } from 'react';
import { Paper, Text, Center, Loader, Table, MultiSelect, Stack, ScrollArea } from '@mantine/core';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { supabase } from '../../../services/supabaseClient';

interface EventAnalyticsTabProps {
  dateRange: [Date | null, Date | null];
}

interface EventAnalyticData {
  event_id: string;
  event_name: string;
  total_revenue: number;
  tickets_sold: number;
}

export function EventAnalyticsTab({ dateRange }: EventAnalyticsTabProps) {
  const [analyticsData, setAnalyticsData] = useState<EventAnalyticData[]>([]);
  const [chartEvents, setChartEvents] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!dateRange || !dateRange[0] || !dateRange[1]) return;
      setLoading(true);

      const startDate = new Date(dateRange[0]);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(dateRange[1]);
      endDate.setHours(23, 59, 59, 999);

      const { data } = await supabase.rpc('get_event_analytics', {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      });

      if (data) {
        setAnalyticsData(data);
        // Mặc định chọn 5 sự kiện hàng đầu cho biểu đồ
        setChartEvents(data.slice(0, 5).map((d: EventAnalyticData) => d.event_name));
      }
      setLoading(false);
    };

    fetchData();
  }, [dateRange]);

  if (loading) {
    return <Center h={400}><Loader /></Center>;
  }

  const chartData = analyticsData.filter(d => chartEvents.includes(d.event_name));

  return (
    <Stack>
      <Paper withBorder radius="md" p="md">
        <Text fw={500} mb="md">So sánh hiệu suất Sự kiện</Text>
        <MultiSelect
          label="Chọn sự kiện để hiển thị trên biểu đồ"
          placeholder="Chọn tối đa 5 sự kiện"
          data={analyticsData.map(d => d.event_name)}
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
            {analyticsData.map(row => (
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
