// src/hooks/api/useUserDetail.ts
import { useState, useEffect, useCallback } from 'react';
import { notifications } from '@mantine/notifications';
import { UsersApi } from '@/services/api/users';
import type { UserProfile } from '@/types';

interface Module {
  id: string;
  code: string;
  name: string;
}

export interface PermissionState {
  [moduleId: string]: {
    canView: boolean;
    canEdit: boolean;
  };
}

export function useUserDetail(userId?: string) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [permissions, setPermissions] = useState<PermissionState>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  useEffect(() => {
    const fetchData = async () => {
      if (!userId) {
        setError('Không tìm thấy ID người dùng.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);

      try {
        const userPromise = UsersApi.getUserById(userId);
        const permissionsPromise = UsersApi.getUserPermissions(userId);

        const [userData, permData] = await Promise.all([userPromise, permissionsPromise]);

        if (!userData) throw new Error('Không tìm thấy người dùng.');
        setUser(userData);

        setModules(permData.modules);

        const initialPermissions: PermissionState = {};
        permData.modules.forEach(module => {
          const currentPermission = permData.permissions.find(p => p.module_id === module.id);
          initialPermissions[module.id] = {
            canView: currentPermission?.can_view || false,
            canEdit: currentPermission?.can_edit || false,
          };
        });
        setPermissions(initialPermissions);

      } catch (err: any) {
        setError(err.message);
        notifications.show({ title: 'Lỗi', message: err.message, color: 'red' });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId, refreshKey]);

  return {
    user,
    modules,
    permissions,
    setPermissions,
    loading,
    error,
    refresh,
  };
}