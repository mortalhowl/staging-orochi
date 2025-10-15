// src/utils/exporters/transactionExporter.ts
import * as XLSX from 'xlsx';
import { notifications } from '@mantine/notifications';

/**
 * Chuyển đổi và xuất dữ liệu giao dịch ra file Excel.
 * @param transactions Dữ liệu giao dịch đầy đủ từ API.
 */
export const exportTransactionsToExcel = (transactions: any[]) => {
  if (!transactions || transactions.length === 0) {
    notifications.show({
      title: 'Không có dữ liệu',
      message: 'Không tìm thấy giao dịch nào để xuất.',
      color: 'yellow',
    });
    return;
  }

  try {
    const flattenedData = transactions.flatMap((transaction: any) =>
      transaction.transaction_items.map((item: any) => ({
        'Mã GD': transaction.id.split('-')[0].toUpperCase(),
        'Tên khách hàng': transaction.users?.full_name || '',
        'Email': transaction.users?.email || '',
        'Sự kiện': transaction.events?.title || '',
        'Loại vé đã đặt': item.ticket_types?.name || '',
        'Số lượng': item.quantity,
        'Giá vé': item.price,
        'Thành tiền': item.quantity * item.price,
        'Thời gian mua': new Date(transaction.created_at).toLocaleString('vi-VN'),
        'Thời gian xác nhận': transaction.paid_at ? new Date(transaction.paid_at).toLocaleString('vi-VN') : 'Chưa xác nhận',
      }))
    );

    const totalAmount = flattenedData.reduce((sum, row) => sum + row['Thành tiền'], 0);

    const worksheet = XLSX.utils.json_to_sheet(flattenedData);
    XLSX.utils.sheet_add_aoa(worksheet, [['', '', '', '', '', '', '', 'TỔNG CỘNG', totalAmount]], { origin: -1 });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'GiaoDich');
    XLSX.writeFile(workbook, `GiaoDich_${new Date().toISOString().split('T')[0]}.xlsx`);

    notifications.show({
      title: 'Thành công',
      message: `Đã xuất ${transactions.length} giao dịch.`,
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