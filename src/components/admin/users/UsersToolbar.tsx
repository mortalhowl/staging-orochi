import { SimpleGrid, TextInput, Select } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import type { UserRole } from '../../../types';

interface UsersToolbarProps {
  filters: { search: string; role: UserRole | null };
  setFilters: (filters: any) => void;
}

export function UsersToolbar({ filters, setFilters }: UsersToolbarProps) {
  const handleFilterChange = (key: string, value: any) => {
    setFilters((prev: any) => ({ ...prev, [key]: value }));
  };

  return (
    <SimpleGrid cols={{ base: 1, sm: 2 }} mb="md">
      <TextInput
        placeholder="Tìm theo Tên, Email..."
        leftSection={<IconSearch size={16} />}
        value={filters.search}
        onChange={(e) => handleFilterChange('search', e.currentTarget.value)}
      />
      <Select
        placeholder="Lọc theo vai trò"
        data={[
          { value: 'admin', label: 'Quản trị viên' },
          { value: 'staff', label: 'Nhân viên' },
          { value: 'viewer', label: 'Khách hàng' },
        ]}
        value={filters.role}
        onChange={(value) => handleFilterChange('role', value)}
        clearable
      />
    </SimpleGrid>
  );
}
