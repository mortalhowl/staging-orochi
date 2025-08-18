import { useState, useEffect } from 'react';
import { Drawer, Loader, Center, Text, Stack, Group, Title, Badge, Button, Divider } from '@mantine/core';
import { supabase } from '../../../services/supabaseClient';
import { formatDateTime } from '../../../utils/formatters';
import type { Voucher } from '../../../types';
import { notifications } from '@mantine/notifications';
import { modals } from '@mantine/modals';

interface VoucherDetailDrawerProps {
    voucherId: string | null;
    opened: boolean;
    onClose: () => void;
    onSuccess: () => void;
    onEdit: (voucher: Voucher) => void;
    canEdit: boolean;
}

export function VoucherDetailDrawer({ voucherId, opened, onClose, onSuccess, onEdit, canEdit }: VoucherDetailDrawerProps) {
    const [voucher, setVoucher] = useState<Voucher | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchDetails = async () => {
            if (!voucherId) return;
            setLoading(true);
            const { data } = await supabase.from('vouchers').select('*').eq('id', voucherId).single();
            setVoucher(data as Voucher);
            setLoading(false);
        };
        if (opened) fetchDetails();
    }, [voucherId, opened]);

    const handleDelete = () => {
        if (!voucher) return;
        modals.openConfirmModal({
            title: 'Xác nhận xóa',
            children: <Text size="sm">Bạn có chắc muốn xóa voucher "<b>{voucher.code}</b>"? Hành động này không thể hoàn tác.</Text>,
            labels: { confirm: 'Xóa', cancel: 'Hủy' },
            confirmProps: { color: 'red' },
            onConfirm: async () => {
                const { error } = await supabase.from('vouchers').delete().eq('id', voucher.id);
                if (error) {
                    notifications.show({ title: 'Lỗi', message: 'Xóa voucher thất bại.', color: 'red' });
                } else {
                    notifications.show({ title: 'Thành công', message: 'Đã xóa voucher.' });
                    onSuccess();
                    onClose();
                }
            },
        });
    };

    return (
        <Drawer opened={opened} onClose={onClose} title="Chi tiết Voucher" position="right" size="md">
            {loading && <Center><Loader /></Center>}
            {!loading && voucher && (
                <Stack justify="space-between" h="100%">
                    <Stack>
                        <Group justify="space-between">
                            <Title order={3}>{voucher.code}</Title>
                            <Badge color={voucher.is_active ? 'green' : 'gray'}>{voucher.is_active ? 'Kích hoạt' : 'Vô hiệu'}</Badge>
                        </Group>
                        <Text><b>Giá trị:</b> {voucher.discount_type === 'percentage' ? `${voucher.discount_value}%` : `${voucher.discount_value.toLocaleString('vi-VN')}đ`}</Text>
                        {voucher.max_discount_amount && <Text><b>Giảm tối đa:</b> {voucher.max_discount_amount.toLocaleString('vi-VN')}đ</Text>}
                        <Text><b>Đơn hàng tối thiểu:</b> {voucher.min_order_amount.toLocaleString('vi-VN')}đ</Text>
                        <Text><b>Lượt sử dụng:</b> {voucher.usage_count} / {voucher.usage_limit}</Text>
                        <Text><b>Hiệu lực từ:</b> {formatDateTime(voucher.valid_from)}</Text>
                        <Text><b>Đến:</b> {formatDateTime(voucher.valid_until)}</Text>
                    </Stack>
                    <Stack>
                        <Divider />
                        {canEdit && (
                            <>
                                <Button variant="default" onClick={() => onEdit(voucher)}>Sửa thông tin</Button>
                                <Button
                                    color="red"
                                    onClick={handleDelete}
                                    disabled={voucher.usage_count > 0} // Vô hiệu hóa nút xóa nếu đã được sử dụng
                                    title={voucher.usage_count > 0 ? 'Không thể xóa voucher đã có lượt sử dụng' : ''}
                                >
                                    Xóa Voucher
                                </Button>
                            </>
                        )}
                    </Stack>
                </Stack>
            )}
        </Drawer>
    );
}
