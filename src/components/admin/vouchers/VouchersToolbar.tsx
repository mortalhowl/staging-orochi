import { SimpleGrid, TextInput, Select } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';

interface VouchersToolbarProps {
  filters: { search: string; isActive: string | null };
  setFilters: (filters: any) => void;
}

export function VouchersToolbar({ filters, setFilters }: VouchersToolbarProps) {
  const handleFilterChange = (key: string, value: any) => {
    setFilters((prev: any) => ({ ...prev, [key]: value }));
  };

  return (
    <SimpleGrid cols={{ base: 1, sm: 2 }} mb="md">
      <TextInput
        placeholder="Tìm theo mã voucher..."
        leftSection={<IconSearch size={16} />}
        value={filters.search}
        onChange={(e) => handleFilterChange('search', e.currentTarget.value)}
      />
      <Select
        placeholder="Lọc theo trạng thái"
        data={[
          { value: 'true', label: 'Đang kích hoạt' },
          { value: 'false', label: 'Đã vô hiệu hóa' },
        ]}
        value={filters.isActive}
        onChange={(value) => handleFilterChange('isActive', value)}
        clearable
      />
    </SimpleGrid>
  );
}
