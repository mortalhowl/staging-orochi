// src/pages/admin/VouchersPage.tsx
import { useState } from 'react';
import { Title, Button, Group, Paper, Pagination, Container } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconPlus } from '@tabler/icons-react';

// Import các components và hooks đã được tái cấu trúc
import { VouchersTable } from '../../components/admin/vouchers/VouchersTable';
import { VoucherFormModal } from '../../components/admin/vouchers/VoucherFormModal';
import { VoucherDetailDrawer } from '../../components/admin/vouchers/VoucherDetailDrawer';
import { VouchersToolbar } from '../../components/admin/vouchers/VouchersToolbar';
import { useAuthStore } from '../../store/authStore';
import { useVouchers } from '../../hooks/api/useVouchers'; // <-- SỬ DỤNG CUSTOM HOOK MỚI
import type { Voucher } from '../../types';

export function VouchersPage() {
  // Toàn bộ logic về state và fetching vouchers được đóng gói trong hook này
  const {
    vouchers,
    loading,
    totalItems,
    activePage,
    setPage,
    filters,
    setFilters,
    refresh,
    itemsPerPage,
  } = useVouchers();

  // State cho UI vẫn giữ lại ở component
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  const [drawerOpened, { open: openDrawer, close: closeDrawer }] = useDisclosure(false);
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);

  const { hasEditPermission } = useAuthStore();
  const canEditVouchers = hasEditPermission('vouchers');
  
  const handleSuccess = () => refresh();

  const handleRowClick = (voucher: Voucher) => {
    setSelectedVoucher(voucher);
    openDrawer();
  };

  const handleAddNew = () => {
    setSelectedVoucher(null);
    openModal();
  };

  const handleEdit = (voucher: Voucher) => {
    setSelectedVoucher(voucher);
    closeDrawer();
    openModal();
  };

  const handleCloseModal = () => {
    setSelectedVoucher(null);
    closeModal();
  };

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
          <Pagination 
            total={Math.ceil(totalItems / itemsPerPage)} 
            value={activePage} 
            onChange={setPage} 
            withEdges 
          />
        </Group>
      </Paper>
      
      <VoucherFormModal 
        opened={modalOpened} 
        onClose={handleCloseModal} 
        onSuccess={handleSuccess} 
        voucherToEdit={selectedVoucher} 
      />
      <VoucherDetailDrawer 
        voucherId={selectedVoucher?.id || null} 
        opened={drawerOpened} 
        onClose={closeDrawer} 
        onSuccess={handleSuccess} 
        onEdit={handleEdit} 
        canEdit={canEditVouchers}
      />
    </Container>
  );
}