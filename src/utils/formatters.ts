// src/utils/formatters.ts

/**
 * Định dạng một chuỗi ngày hoặc đối tượng Date thành chuỗi ngày giờ vi-VN.
 */
export const formatDateTime = (dateString?: string | Date | null): string => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Ngày không hợp lệ';

  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Định dạng một chuỗi ngày hoặc đối tượng Date thành chuỗi ngày vi-VN.
 */
export const formatDate = (dateString?: string | Date | null): string => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Ngày không hợp lệ';
  
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export const formatDateRange = (start: string, end: string) => {
  const startDate = new Date(start).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const endDate = new Date(end).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  return `${startDate} - ${endDate}`;
};