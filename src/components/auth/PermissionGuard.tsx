import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Center, Loader } from '@mantine/core';

interface PermissionGuardProps {
  moduleCode: string;
  requireEdit?: boolean; // Tùy chọn: yêu cầu quyền sửa
}

export function PermissionGuard({ moduleCode, requireEdit = false }: PermissionGuardProps) {
  const { userProfile, permissions, isLoading } = useAuthStore();

  if (isLoading) {
    return <Center h="100vh"><Loader /></Center>;
  }

  // Nếu là admin, luôn cho phép truy cập
  if (userProfile?.role === 'admin') {
    return <Outlet />;
  }

  // Nếu là staff, kiểm tra quyền chi tiết
  if (userProfile?.role === 'staff') {
    const permission = permissions.find(p => p.moduleCode === moduleCode);

    // Kiểm tra quyền xem
    if (!requireEdit && permission?.canView) {
      return <Outlet />;
    }

    // Kiểm tra quyền sửa (nếu được yêu cầu)
    if (requireEdit && permission?.canEdit) {
      return <Outlet />;
    }
  }

  // Nếu không có quyền, điều hướng đến trang "Từ chối truy cập"
  return <Navigate to="/admin/forbidden" replace />;
}
