// src/components/admin/dashboard/OverviewTab.tsx
import { SimpleGrid, Paper, Text, Stack, Center, Loader } from '@mantine/core';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface OverviewTabProps {
  data: any; // Dữ liệu thống kê tổng quan
  loading: boolean;
}

export function OverviewTab({ data, loading }: OverviewTabProps) {
  if (loading) {
    return <Center h={400}><Loader /></Center>;
  }

  if (!data) {
    return <Center h={400}><Text>Vui lòng chọn một khoảng thời gian hợp lệ.</Text></Center>;
  }

  const { stats, revenueData } = data;

  return (
    <Stack>
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
        <Paper withBorder radius="md" p="md">
            <Text size="xl" fw={700}>{stats?.total_revenue?.toLocaleString('vi-VN')}đ</Text>
            <Text c="dimmed" size="sm">Tổng doanh thu</Text>
        </Paper>
        <Paper withBorder radius="md" p="md">
            <Text size="xl" fw={700}>{stats?.tickets_sold?.toLocaleString('vi-VN')}</Text>
            <Text c="dimmed" size="sm">Vé đã bán</Text>
        </Paper>
        <Paper withBorder radius="md" p="md">
            <Text size="xl" fw={700}>{stats?.total_orders?.toLocaleString('vi-VN')}</Text>
            <Text c="dimmed" size="sm">Đơn hàng thành công</Text>
        </Paper>
        <Paper withBorder radius="md" p="md">
            <Text size="xl" fw={700}>{stats?.new_customers?.toLocaleString('vi-VN')}</Text>
            <Text c="dimmed" size="sm">Khách hàng mới</Text>
        </Paper>
      </SimpleGrid>

      <Paper withBorder radius="md" p="md">
        <Text fw={500} mb="md">Doanh thu theo thời gian</Text>
        <ResponsiveContainer width="100%" height={300} >
          <LineChart data={revenueData} margin={{ top: 20, right: 20, left: 40, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis tickFormatter={(value) => new Intl.NumberFormat('vi-VN').format(value)} />
            <Tooltip formatter={(value: number) => `${value.toLocaleString('vi-VN')}`} />
            <Legend />
            <Line type="monotone" dataKey="revenue" name="Doanh thu" stroke="#8884d8" activeDot={{ r: 8 }} />
          </LineChart>
        </ResponsiveContainer>
      </Paper>
    </Stack>
  );
}