import { useState, useEffect } from 'react';
import { SimpleGrid, Paper, Text, Stack, Center, Loader } from '@mantine/core';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { supabase } from '../../../services/supabaseClient';
import { notifications } from '@mantine/notifications';

interface OverviewTabProps {
  dateRange: [Date | null, Date | null];
}

export function OverviewTab({ dateRange }: OverviewTabProps) {
  const [stats, setStats] = useState<any>(null);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      console.log('[DEBUG] OverviewTab received dateRange prop:', dateRange);

      // Kiểm tra kỹ lưỡng nếu dateRange không hợp lệ
      if (!dateRange || !dateRange[0] || !dateRange[1] || !(dateRange[0] instanceof Date) || !(dateRange[1] instanceof Date)) {
        console.log('[DEBUG] Invalid dateRange detected. Aborting fetch.');
        setStats(null);
        setRevenueData([]);
        setLoading(false); // Tắt loading nếu ngày không hợp lệ
        return;
      }
      setLoading(true);

      // Đặt giờ của ngày bắt đầu về 00:00:00
      const startDate = new Date(dateRange[0]);
      startDate.setHours(0, 0, 0, 0);

      // Đặt giờ của ngày kết thúc về 23:59:59
      const endDate = new Date(dateRange[1]);
      endDate.setHours(23, 59, 59, 999);

      const rpcParams = { 
        start_date: startDate.toISOString(), 
        end_date: endDate.toISOString() 
      };
      
      console.log('[DEBUG] Calling RPC functions with params:', rpcParams);

      try {
        const statsPromise = supabase.rpc('get_dashboard_overview_stats', rpcParams);
        const revenuePromise = supabase.rpc('get_revenue_over_time', rpcParams);

        const [statsRes, revenueRes] = await Promise.all([statsPromise, revenuePromise]);
        
        console.log('[DEBUG] RPC Response (stats):', statsRes);
        console.log('[DEBUG] RPC Response (revenue):', revenueRes);

        if (statsRes.error) throw statsRes.error;
        if (revenueRes.error) throw revenueRes.error;

        setStats(statsRes.data[0]);
        setRevenueData(revenueRes.data);
      } catch (error: any) {
        notifications.show({ title: 'Lỗi', message: 'Không thể tải dữ liệu Dashboard.', color: 'red' });
        console.error('[DEBUG] Error during RPC call:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dateRange]);

  if (loading) {
    return <Center h={400}><Loader /></Center>;
  }

  if (!stats) {
    return <Center h={400}><Text>Vui lòng chọn một khoảng thời gian hợp lệ.</Text></Center>;
  }

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
          <LineChart data={revenueData}
            margin={{ top: 20, right: 20, left: 40, bottom: 20 }}>
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
