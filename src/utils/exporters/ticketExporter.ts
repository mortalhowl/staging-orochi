// src/utils/exporters/ticketExporter.ts
import * as XLSX from 'xlsx';
import { notifications } from '@mantine/notifications';
import { formatDateTime } from '../formatters';
import type { FullTicketDetails } from '@/types';

/**
 * Chuyển đổi và xuất dữ liệu vé ra file Excel.
 * @param tickets Dữ liệu vé đầy đủ từ API.
 */
export const exportTicketsToExcel = (tickets: FullTicketDetails[]) => {
  if (!tickets || tickets.length === 0) {
    notifications.show({
      title: 'Không có dữ liệu',
      message: 'Không tìm thấy vé nào để xuất.',
      color: 'yellow',
    });
    return;
  }

  try {
    const exportData = tickets.map((ticket, index) => ({
        'STT': index + 1,
        'Mã vé': ticket.id,
        'Khách hàng': ticket.customer_name,
        'Email': ticket.customer_email,
        'Số điện thoại': ticket.customer_phone,
        'Sự kiện': ticket.event_name,
        'Loại vé': ticket.ticket_type_name,
        'Nguồn gốc': ticket.is_invite ? 'Vé mời' : 'Vé bán',
        'Trạng thái Check-in': ticket.is_used ? 'Đã check-in' : 'Chưa check-in',
        'Thời gian check-in': ticket.is_used ? formatDateTime(ticket.used_at) : '',
        'Trạng thái vé': ticket.status === 'active' ? 'Hoạt động' : 'Vô hiệu hóa',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'DanhSachVe');
    XLSX.writeFile(workbook, `DanhSachVe_${new Date().toISOString().split('T')[0]}.xlsx`);

    notifications.show({
      title: 'Thành công',
      message: `Đã xuất ${tickets.length} vé.`,
      color: 'green',
    });
  } catch (error) {
    console.error("Export Error:", error);
    notifications.show({
      title: 'Thất bại',
      message: 'Xuất dữ liệu thất bại.',
      color: 'red',
    });
  }
};