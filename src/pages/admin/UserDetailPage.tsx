import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Container, Title, Paper, Loader, Center, Alert, Text, Group, Button, Table, Checkbox, Breadcrumbs, Anchor } from '@mantine/core';
import { supabase } from '../../services/supabaseClient';
import type { UserProfile } from '../../types';
import { notifications } from '@mantine/notifications';

interface Module {
  id: string;
  code: string;
  name: string;
}

interface PermissionState {
  [moduleId: string]: {
    canView: boolean;
    canEdit: boolean;
  };
}

export function UserDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [permissions, setPermissions] = useState<PermissionState>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!userId) {
        setError('Không tìm thấy ID người dùng.');
        setLoading(false);
        return;
      }
      setLoading(true);

      try {
        // Lấy song song thông tin user, các module, và quyền hiện tại
        const userPromise = supabase.from('users').select('*').eq('id', userId).single();
        const modulesPromise = supabase.from('modules').select('*');
        const permissionsPromise = supabase.from('permissions').select('*').eq('user_id', userId);

        const [userRes, modulesRes, permissionsRes] = await Promise.all([userPromise, modulesPromise, permissionsPromise]);

        if (userRes.error) throw new Error('Không tìm thấy người dùng.');
        setUser(userRes.data as UserProfile);

        if (modulesRes.error) throw new Error('Không thể tải danh sách module.');
        setModules(modulesRes.data as Module[]);

        if (permissionsRes.error) throw new Error('Không thể tải quyền của người dùng.');
        
        // Chuyển đổi dữ liệu quyền thành một object state để dễ quản lý
        const initialPermissions: PermissionState = {};
        (modulesRes.data as Module[]).forEach(module => {
            const currentPermission = (permissionsRes.data || []).find(p => p.module_id === module.id);
            initialPermissions[module.id] = {
                canView: currentPermission?.can_view || false,
                canEdit: currentPermission?.can_edit || false,
            };
        });
        setPermissions(initialPermissions);

      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [userId]);

  // SỬA LỖI LOGIC Ở ĐÂY
  const handlePermissionChange = (moduleId: string, type: 'canView' | 'canEdit', checked: boolean) => {
    setPermissions(prev => {
      const currentPerms = prev[moduleId] || { canView: false, canEdit: false };
      const newCanView = type === 'canView' ? checked : currentPerms.canView;
      let newCanEdit = type === 'canEdit' ? checked : currentPerms.canEdit;

      // Nếu quyền xem bị tắt, quyền sửa cũng phải bị tắt theo
      if (!newCanView) {
        newCanEdit = false;
      }

      return {
        ...prev,
        [moduleId]: {
          canView: newCanView,
          canEdit: newCanEdit,
        },
      };
    });
  };

  const handleSaveChanges = async () => {
    setSaving(true);
    try {
        const upsertData = Object.entries(permissions).map(([moduleId, perms]) => ({
            user_id: userId,
            module_id: moduleId,
            can_view: perms.canView,
            can_edit: perms.canEdit,
        }));

        const { error } = await supabase.from('permissions').upsert(upsertData, { onConflict: 'user_id, module_id' });
        if (error) throw error;

        notifications.show({ title: 'Thành công', message: 'Đã cập nhật quyền thành công.', color: 'green' });
    } catch (err: any) {
        notifications.show({ title: 'Lỗi', message: 'Cập nhật quyền thất bại.', color: 'red' });
    } finally {
        setSaving(false);
    }
  };

  if (loading) return <Center><Loader /></Center>;
  if (error) return <Alert color="red">{error}</Alert>;
  if (!user) return <Text>Không tìm thấy người dùng.</Text>;

  const breadcrumbs = [
    { title: 'Quản lý Người dùng', href: '/admin/users' },
    { title: user.full_name || user.email, href: '#' },
  ].map((item, index) => (
    <Anchor component={Link} to={item.href} key={index}>
      {item.title}
    </Anchor>
  ));

  return (
    <Container>
      <Breadcrumbs mb="xl">{breadcrumbs}</Breadcrumbs>
      <Title order={2} mb="xs">Phân quyền cho: {user.full_name}</Title>
      <Text c="dimmed" mb="xl">{user.email}</Text>

      {user.role !== 'staff' ? (
        <Alert color="orange" title="Lưu ý">
          Chỉ có thể phân quyền chi tiết cho tài khoản có vai trò "Nhân viên".
        </Alert>
      ) : (
        <Paper withBorder p="md" radius="md">
          <Table>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Module</Table.Th>
                <Table.Th>Quyền Xem</Table.Th>
                <Table.Th>Quyền Sửa</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {modules.map(module => (
                <Table.Tr key={module.id}>
                  <Table.Td>{module.name}</Table.Td>
                  <Table.Td>
                    <Checkbox
                      checked={permissions[module.id]?.canView || false}
                      onChange={(e) => handlePermissionChange(module.id, 'canView', e.currentTarget.checked)}
                    />
                  </Table.Td>
                  <Table.Td>
                    <Checkbox
                      checked={permissions[module.id]?.canEdit || false}
                      onChange={(e) => handlePermissionChange(module.id, 'canEdit', e.currentTarget.checked)}
                      disabled={!permissions[module.id]?.canView} // Vô hiệu hóa nếu không có quyền xem
                    />
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
          <Group justify="flex-end" mt="xl">
            <Button onClick={handleSaveChanges} loading={saving}>Lưu thay đổi</Button>
          </Group>
        </Paper>
      )}
    </Container>
  );
}
