import { useState, useEffect } from 'react';
import { Title, Button, Group, Paper, Pagination, Container } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { supabase } from '../../services/supabaseClient';
import type { Voucher } from '../../types';
import { VouchersTable } from '../../components/admin/vouchers/VouchersTable';
import { VoucherFormModal } from '../../components/admin/vouchers/VoucherFormModal';
import { VoucherDetailDrawer } from '../../components/admin/vouchers/VoucherDetailDrawer';
import { VouchersToolbar } from '../../components/admin/vouchers/VouchersToolbar';
import { useDisclosure } from '@mantine/hooks';
import { useAuthStore } from '../../store/authStore';
import { useDebounce } from 'use-debounce';

const ITEMS_PER_PAGE = 20;

export function VouchersPage() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePage, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  const [drawerOpened, { open: openDrawer, close: closeDrawer }] = useDisclosure(false);
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const { hasEditPermission } = useAuthStore(); // 2. Lấy hàm kiểm tra quyền
  const canEditVouchers = hasEditPermission('vouchers');
  
  const [filters, setFilters] = useState({ search: '', isActive: null as string | null });
  const [debouncedSearch] = useDebounce(filters.search, 400);

  useEffect(() => {
    const fetchVouchers = async () => {
      setLoading(true);
      const from = (activePage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      const rpcParams = {
        search_term: debouncedSearch,
        p_is_active: filters.isActive === null ? null : filters.isActive === 'true',
      };

      const dataPromise = supabase.rpc('search_vouchers', rpcParams).range(from, to);
      const countPromise = supabase.rpc('count_vouchers', rpcParams);

      const [dataRes, countRes] = await Promise.all([dataPromise, countPromise]);

      if (dataRes.error || countRes.error) {
        console.error("Error fetching vouchers:", dataRes.error || countRes.error);
      } else {
        setVouchers(dataRes.data as Voucher[]);
        setTotalItems(countRes.data ?? 0);
      }
      setLoading(false);
    };

    fetchVouchers();
  }, [activePage, refreshKey, debouncedSearch, filters.isActive]);

  const handleRowClick = (voucher: Voucher) => { setSelectedVoucher(voucher); openDrawer(); };
  const handleAddNew = () => { setSelectedVoucher(null); openModal(); };
  const handleEdit = (voucher: Voucher) => { setSelectedVoucher(voucher); closeDrawer(); openModal(); };
  const handleCloseModal = () => { setSelectedVoucher(null); closeModal(); };
  const handleSuccess = () => setRefreshKey(k => k + 1);

  return (
    <Container size="xl" mt="md">
      <Group justify="space-between" mb="xl">
        <Title order={2}>Voucher</Title>
        {canEditVouchers && (
            <Button onClick={handleAddNew} leftSection={<IconPlus size={16} />}>Tạo Voucher</Button>
        )}
      </Group>

      <VouchersToolbar filters={filters} setFilters={setFilters} />

      <Paper withBorder p="md" radius="md">
        <VouchersTable vouchers={vouchers} loading={loading} onRowClick={handleRowClick}/>
        <Group justify="center" mt="md">
          <Pagination total={Math.ceil(totalItems / ITEMS_PER_PAGE)} value={activePage} onChange={setPage} withEdges />
        </Group>
      </Paper>
      
      <VoucherFormModal opened={modalOpened} onClose={handleCloseModal} onSuccess={handleSuccess} voucherToEdit={selectedVoucher} />
      <VoucherDetailDrawer voucherId={selectedVoucher?.id || null} opened={drawerOpened} onClose={closeDrawer} onSuccess={handleSuccess} onEdit={handleEdit} canEdit={canEditVouchers}/>
    </Container>
  );
}
