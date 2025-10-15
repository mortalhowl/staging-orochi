// src/hooks/api/useDashboard.ts
import { useState, useEffect } from 'react';
import { notifications } from '@mantine/notifications';
import { DashboardApi } from '@/services/api/dashboard';

// Định nghĩa kiểu cho khoảng thời gian đầu vào
type DateRange = [Date | null, Date | null];

export function useDashboard(dateRange: DateRange) {
  // State cho từng loại dữ liệu
  const [overviewStats, setOverviewStats] = useState<any>(null);
  const [eventAnalytics, setEventAnalytics] = useState<any[]>([]);
  const [transactionAnalytics, setTransactionAnalytics] = useState<any>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Chỉ fetch dữ liệu khi có một khoảng thời gian hợp lệ
    if (!dateRange || !dateRange[0] || !dateRange[1]) {
      setLoading(false);
      // Reset data khi date range bị xóa
      setOverviewStats(null);
      setEventAnalytics([]);
      setTransactionAnalytics(null);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        // Chuẩn bị tham số cho RPC
        const startDate = new Date(dateRange[0]!);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(dateRange[1]!);
        endDate.setHours(23, 59, 59, 999);
        const params = {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
        };

        // Gọi tất cả các API cùng lúc để tăng hiệu suất
        const [overviewData, eventData, transactionData] = await Promise.all([
          DashboardApi.getOverviewStats(params),
          DashboardApi.getEventAnalytics(params),
          DashboardApi.getTransactionAnalytics(params),
        ]);

        setOverviewStats(overviewData);
        setEventAnalytics(eventData);
        setTransactionAnalytics(transactionData);

      } catch (error) {
        notifications.show({
          title: 'Lỗi',
          message: error instanceof Error ? error.message : 'Không thể tải dữ liệu Dashboard.',
          color: 'red',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dateRange]); // useEffect sẽ chạy lại mỗi khi dateRange thay đổi

  return {
    loading,
    overviewStats,
    eventAnalytics,
    transactionAnalytics,
  };
}