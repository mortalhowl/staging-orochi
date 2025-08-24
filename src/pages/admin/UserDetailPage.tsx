import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Title, Paper, Loader, Center, Alert, Text, Stack, Group, Button, Table, Checkbox, Tabs, Avatar, PasswordInput, Badge, Card, Flex } from '@mantine/core';
import { supabase } from '../../services/supabaseClient';
import type { UserProfile } from '../../types';
import { notifications } from '@mantine/notifications';
import { modals } from '@mantine/modals';
import { formatDateTime } from '../../utils/formatters';
import { UserTransactions } from '../../components/admin/users/UserTransactions';
import { useAuthStore } from '../../store/authStore';
import { IconInfoCircle } from '@tabler/icons-react'

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

const ADMIN_ONLY_MODULES = ['dashboard', 'settings'];
const ACTION_ONLY_MODULES = ['check-in', 'invited-tickets'];

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
  const { hasEditPermission } = useAuthStore();
  const canEditUsers = hasEditPermission('users');


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
        case 'enable_user': confirmationText = 'kích hoạt lại tài khoản này'; break;
        case 'delete_user': confirmationText = 'xóa tài khoản này? Nếu người dùng đã có lịch sử giao dịch, tài khoản sẽ được vô hiệu hóa thay vì xóa vĩnh viễn.'; break;
        default: break;
    }

    const confirmAction = async () => {
        try {
            const { data, error } = await supabase.functions.invoke('user-admin-actions', {
                body: { action, payload: { userId, newPassword } },
            });
            if (error) throw new Error(data?.error || error.message);
            // Thông báo thành công sẽ hiển thị chính xác thông điệp từ backend
            notifications.show({ title: 'Thành công', message: data.message, color: 'green' });
            
            if (action === 'delete_user' && data.message.includes('xóa')) {
                navigate('/admin/users');
            } else {
                setRefreshKey(k => k + 1); // Refresh lại trang để cập nhật trạng thái
            }
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
        modals.openConfirmModal({ 
            title: `Xác nhận hành động`, 
            children: <Text size="sm">Bạn có chắc muốn {confirmationText}?</Text>, 
            onConfirm: confirmAction, 
            labels: { confirm: 'Xác nhận', cancel: 'Hủy' }, 
            confirmProps: { color: action === 'delete_user' ? 'red' : 'blue' } 
        });
    }
  };

  if (loading) return <Center h="50vh"><Loader /></Center>;
  if (error) return <Alert color="red">{error}</Alert>;
  if (!user) return <Center><Text>Không tìm thấy người dùng.</Text></Center>;

  return (
    <Container size="1200">
      <Flex
        direction={{ base: "column", md: "row" }}
        h="88vh"
        gap={10}
      >
        <Paper withBorder p="xs" flex={2}>
          <Stack justify="center" align='center' p='md' gap={10}>
            <Avatar src={user.avatar_url} size="150" radius="50%" style={{ border: '1.5px solid #ccc' }} />
            <Title order={4}>{user.full_name}</Title>
            <Badge color={user.status === 'active' ? 'green' : 'red'}>
              {user.status === 'active' ? 'Đang hoạt động' : 'Vô hiệu hóa'}
            </Badge>
          </Stack>
          <Stack gap={10} p="xs">
            <Text c="dimmed"><b>Email:</b> {user.email}</Text>
            <Text c="dimmed"><b>Phone:</b> {user.phone || 'N/A'}</Text>
            <Text c="dimmed"><b>Ngày tạo:</b> {formatDateTime(user.created_at)}</Text>
          </Stack>

        </Paper>

        <Paper withBorder p="xs" maw={797} flex={5}>
          <Tabs defaultValue="details" radius={'md'}>
            <Tabs.List >
              <Tabs.Tab value="details">Chi tiết</Tabs.Tab>
              <Tabs.Tab value="history">Lịch sử</Tabs.Tab>
              {(canEditUsers && (user.role === 'staff' || user.role === 'admin')) && <Tabs.Tab value="permissions">Phân quyền</Tabs.Tab>}
            </Tabs.List>
            {(canEditUsers && user.role !== "admin") ? (
              <Tabs.Panel value="details" pt="md">
                <Stack gap="md">
                  {(user.role === "staff") && (
                    <Card withBorder radius="md" p="md" shadow='none'>
                      <Group>
                        <PasswordInput
                          placeholder='Nhập mật khẩu mới'
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.currentTarget.value)}
                          style={{ flex: 1 }}
                        />
                        <Group justify='center' align='center'>
                          <Button
                            onClick={() => handleAdminAction("update_password")}
                            disabled={!newPassword}
                          >
                            Đổi mật khẩu
                          </Button>
                          <Button
                            onClick={() => handleAdminAction("send_reset_password")}
                            variant="light"
                          >
                            Gửi link đặt lại
                          </Button>
                        </Group>
                      </Group>
                    </Card>
                  )}
                <Flex gap={10} direction={{ base: "column", md: "row" }}>
                  <Alert
                    icon={<IconInfoCircle />}
                    title="Vô hiệu hóa"
                    color={user.status === "active" ? "orange" : "teal"}
                    variant="light"
                    radius="md"
                    style={{
                      borderColor: user.status === "active" ? "orange" : "teal",
                      flex: 1
                    }}
                  >
                    <Stack>
                      <Text size='sm'><b>Vô hiệu hóa</b> tài khoản sẽ an toàn hơn việc <b>Xóa tài khoản</b>. Khuyên nên dùng chức năng này.</Text>
                      {user.status === "active" ? (
                        <Button
                          onClick={() => handleAdminAction("disable_user")}
                          color="orange"
                        >
                          Vô hiệu hóa
                        </Button>
                      ) : (
                        <Button
                          onClick={() => handleAdminAction("enable_user")}
                          color="teal"
                        >
                          Kích hoạt
                        </Button>
                      )}
                    </Stack>
                  </Alert>
                  <Alert
                    icon={<IconInfoCircle />}
                    title="Hành động nguy hiểm"
                    color="red"
                    variant="light"
                    radius="md"
                    style={{ borderColor: "red", flex: 1}}
                  >
                    <Stack>
                      <Text size='sm'>Xóa tài khoản thì sẽ không thể khôi phục. Nếu tài khoản đã có giao dịch thì không thể xóa.</Text>
                      <Button
                        onClick={() => handleAdminAction("delete_user")}
                        color="red"
                      >
                        Xóa tài khoản
                      </Button>
                    </Stack>
                  </Alert>
                  </Flex>
                </Stack>
              </Tabs.Panel>
            ) : (
              <Tabs.Panel value="details" pt="md" h="80vh">
                <Stack gap="md" justify='center' align='center' h={'100%'}>
                  <Text c="dimmed" size='sm'>Không thể thao tác với tài khoản Admin.</Text>
                </Stack>
              </Tabs.Panel>
            )}
            <Tabs.Panel value="history" pt="md">
              <UserTransactions userId={userId!} />
            </Tabs.Panel>

            {user.role === 'admin' ? (
              <Tabs.Panel value="permissions" pt="md" h="80vh">
                <Stack gap="md" justify='center' align='center' h={'100%'}>
                  <Text c="dimmed" size='sm'>Tài khoản đã có tất cả các quyền.</Text>
                </Stack>
              </Tabs.Panel>
            ) : user.role === 'staff' && canEditUsers ? (
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
                      {modules.filter(m => !ADMIN_ONLY_MODULES.includes(m.code)).map(module => (
                        <Table.Tr key={module.id}>
                          <Table.Td>
                            {module.name}
                            {ACTION_ONLY_MODULES.includes(module.code) && <Text size="xs" c="dimmed">Quyền xem đã bao gồm quyền thực hiện</Text>}
                          </Table.Td>
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
                              // Vô hiệu hóa nếu không có quyền xem HOẶC là module hành động
                              disabled={!permissions[module.id]?.canView || ACTION_ONLY_MODULES.includes(module.code)}
                            />
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                  <Group justify="flex-end" mt="xl">
                    <Button onClick={handleSaveChanges} loading={saving}>
                      Lưu thay đổi
                    </Button>
                  </Group>
                </Paper>
              </Tabs.Panel>
            ) : null}
          </Tabs>
        </Paper>
      </Flex>
    </Container>
  );
}
