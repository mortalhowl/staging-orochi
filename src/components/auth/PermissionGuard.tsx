import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Center, Loader } from '@mantine/core';

interface PermissionGuardProps {
  moduleCode: string;
}

export function PermissionGuard({ moduleCode }: PermissionGuardProps) {
  const { userProfile, permissions, isLoading } = useAuthStore();

  if (isLoading) {
    return <Center h="100vh"><Loader /></Center>;
  }

  // Nếu là admin, luôn cho phép truy cập
  if (userProfile?.role === 'admin') {
    return <Outlet />;
  }

  // KIỂM TRA MỚI: Các module chỉ dành cho admin
  if (moduleCode === 'dashboard' || moduleCode === 'settings') {
    // Nếu không phải admin, từ chối ngay lập tức
    return <Navigate to="/admin/forbidden" replace />;
  }

  // Nếu là staff, kiểm tra quyền chi tiết
  if (userProfile?.role === 'staff') {
    const permission = permissions.find(p => p.moduleCode === moduleCode);
    // Chỉ cần kiểm tra quyền xem (canView)
    if (permission?.canView) {
      return <Outlet />;
    }
  }

  // Nếu không có quyền, điều hướng đến trang "Từ chối truy cập"
  return <Navigate to="/admin/forbidden" replace />;
}
