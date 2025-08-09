import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Container, Title, Paper, Loader, Center, Alert, Text, Stack, Group, Button, Table, Checkbox, Breadcrumbs, Anchor, Tabs, Avatar, PasswordInput, Divider, Badge} from '@mantine/core';
import { supabase } from '../../services/supabaseClient';
import type { UserProfile } from '../../types';
import { notifications } from '@mantine/notifications';
import { modals } from '@mantine/modals';
import { formatDateTime } from '../../utils/formatters';
import { UserTransactions } from '../../components/admin/users/UserTransactions';

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
  const navigate = useNavigate();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [permissions, setPermissions] = useState<PermissionState>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      if (!userId) {
        setError('Không tìm thấy ID người dùng.');
        setLoading(false);
        return;
      }
      setLoading(true);

      try {
        const userPromise = supabase.from('users').select('*').eq('id', userId).single();
        const modulesPromise = supabase.from('modules').select('*');
        const permissionsPromise = supabase.from('permissions').select('*').eq('user_id', userId);

        const [userRes, modulesRes, permissionsRes] = await Promise.all([userPromise, modulesPromise, permissionsPromise]);

        if (userRes.error) throw new Error('Không tìm thấy người dùng.');
        setUser(userRes.data as UserProfile);

        if (modulesRes.error) throw new Error('Không thể tải danh sách module.');
        setModules(modulesRes.data as Module[]);

        if (permissionsRes.error) throw new Error('Không thể tải quyền của người dùng.');
        
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
  }, [userId, refreshKey]);

  const handlePermissionChange = (moduleId: string, type: 'canView' | 'canEdit', checked: boolean) => {
    setPermissions(prev => {
      const currentPerms = prev[moduleId] || { canView: false, canEdit: false };
      const newCanView = type === 'canView' ? checked : currentPerms.canView;
      let newCanEdit = type === 'canEdit' ? checked : currentPerms.canEdit;

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
        console.error(err);
    } finally {
        setSaving(false);
    }
  };
  
const handleAdminAction = async (action: 'send_reset_password' | 'update_password' | 'disable_user' | 'enable_user' | 'delete_user') => {
      let confirmationText = '';
    switch (action) {
        case 'send_reset_password': confirmationText = 'gửi link đổi mật khẩu cho người dùng này'; break;
        case 'disable_user': confirmationText = 'vô hiệu hóa tài khoản này'; break;
        case 'delete_user': confirmationText = 'XÓA vĩnh viễn tài khoản này'; break;
        default: break;
    }

const confirmAction = async () => {
        try {
            const { data, error } = await supabase.functions.invoke('user-admin-actions', {
                body: { action, payload: { userId, newPassword } },
            });
            if (error) throw new Error(data?.error || error.message);
            notifications.show({ title: 'Thành công', message: data.message || `Thực hiện hành động thành công.`, color: 'green' });
            if (action === 'delete_user') navigate('/admin/users');
            if (action === 'disable_user' || action === 'enable_user') setRefreshKey(k => k + 1); // Refresh lại trang
        } catch (err: any) {
            notifications.show({ title: 'Lỗi', message: err.message, color: 'red' });
        }
    };

    if (action === 'update_password') {
        if (newPassword.length < 6) {
            notifications.show({ title: 'Lỗi', message: 'Mật khẩu mới phải có ít nhất 6 ký tự.', color: 'red' });
            return;
        }
        modals.openConfirmModal({ title: 'Xác nhận đổi mật khẩu', children: <Text size="sm">Bạn có chắc muốn đặt lại mật khẩu cho người dùng này?</Text>, onConfirm: confirmAction, labels: { confirm: 'Xác nhận', cancel: 'Hủy' } });
    } else {
        modals.openConfirmModal({ title: `Xác nhận hành động`, children: <Text size="sm">Bạn có chắc muốn {confirmationText}?</Text>, onConfirm: confirmAction, labels: { confirm: 'Xác nhận', cancel: 'Hủy' }, confirmProps: { color: action === 'delete_user' ? 'red' : 'blue' } });
    }
  };

  if (loading) return <Center h="50vh"><Loader /></Center>;
  if (error) return <Alert color="red">{error}</Alert>;
  if (!user) return <Center><Text>Không tìm thấy người dùng.</Text></Center>;

  const breadcrumbs = [
    { title: 'Quản lý Người dùng', href: '/admin/users' },
    { title: user.full_name || user.email || 'Chi tiết', href: '#' },
  ].map((item, index) => (
    <Anchor component={Link} to={item.href} key={index}>
      {item.title}
    </Anchor>
  ));

  return (
    <Container>
      <Breadcrumbs mb="xl">{breadcrumbs}</Breadcrumbs>
      <Group mb="xl">
        <Avatar src={user.avatar_url} size="lg" radius="xl" />
        <div>
            <Title order={2}>{user.full_name}</Title>
            <Text c="dimmed">{user.email}</Text>
            <Badge mt="xs" color={user.status === 'active' ? 'green' : 'red'}>
                {user.status === 'active' ? 'Đang hoạt động' : 'Vô hiệu hóa'}
            </Badge>
        </div>
      </Group>

      <Tabs defaultValue="details">
        <Tabs.List>
          <Tabs.Tab value="details">Chi tiết Tài khoản</Tabs.Tab>
          <Tabs.Tab value="history">Lịch sử Giao dịch</Tabs.Tab>
          {user.role === 'staff' && <Tabs.Tab value="permissions">Phân quyền</Tabs.Tab>}
        </Tabs.List>

        <Tabs.Panel value="details" pt="md">
          <Paper withBorder p="md" radius="md">
            <Stack>
                <Text><b>Ngày tạo:</b> {formatDateTime(user.created_at)}</Text>
                
                {/* SỬA LỖI Ở ĐÂY: Chỉ hiển thị phần mật khẩu cho admin/staff */}
                {user.role !== 'viewer' && (
                    <>
                        <Divider label="Đổi mật khẩu" labelPosition="center" my="sm" />
                        <PasswordInput label="Đặt mật khẩu mới" value={newPassword} onChange={(e) => setNewPassword(e.currentTarget.value)} />
                        <Button onClick={() => handleAdminAction('update_password')} disabled={!newPassword}>Đổi mật khẩu</Button>
                        <Button onClick={() => handleAdminAction('send_reset_password')} variant="light">Gửi link đổi mật khẩu</Button>
                    </>
                )}

                {/* Phần hành động nguy hiểm giờ đây áp dụng cho tất cả các vai trò */}
                <Divider label="Hành động nguy hiểm" labelPosition="center" my="sm" />
                
                {user.status === 'active' ? (
                    <Button onClick={() => handleAdminAction('disable_user')} color="orange">Vô hiệu hóa tài khoản</Button>
                ) : (
                    <Button onClick={() => handleAdminAction('enable_user')} color="teal">Kích hoạt tài khoản</Button>
                )}

                <Button onClick={() => handleAdminAction('delete_user')} color="red">Xóa tài khoản</Button>
            </Stack>
          </Paper>
        </Tabs.Panel>
        <Tabs.Panel value="history" pt="md">
            <UserTransactions userId={userId!} />
        </Tabs.Panel>
        {user.role === 'staff' && (
            <Tabs.Panel value="permissions" pt="md">
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
                                disabled={!permissions[module.id]?.canView}
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
            </Tabs.Panel>
        )}
      </Tabs>
    </Container>
  );
}
