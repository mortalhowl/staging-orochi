import { SimpleGrid, TextInput, Select } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { IconSearch } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { supabase } from '../../../services/supabaseClient';

interface EventSelectItem { value: string; label: string; }

interface TransactionsToolbarProps {
  filters: any;
  setFilters: (filters: any) => void;
}

export function TransactionsToolbar({ filters, setFilters }: TransactionsToolbarProps) {
  const [events, setEvents] = useState<EventSelectItem[]>([]);

  useEffect(() => {
    const fetchEventsForSelect = async () => {
      const { data } = await supabase.from('events').select('id, title');
      if (data) {
        setEvents(data.map(event => ({ value: event.id, label: event.title })));
      }
    };
    fetchEventsForSelect();
  }, []);
  
  const handleFilterChange = (key: string, value: any) => {
    setFilters((prev: any) => ({ ...prev, [key]: value }));
  };

  return (
    <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} mb="md">
      <TextInput
        placeholder="Tìm Mã ĐH, Email..."
        leftSection={<IconSearch size={16} />}
        value={filters.search}
        onChange={(e) => handleFilterChange('search', e.currentTarget.value)}
      />
      <Select
        placeholder="Lọc theo sự kiện"
        data={events}
        value={filters.eventId}
        onChange={(value) => handleFilterChange('eventId', value)}
        clearable
      />
      <Select
        placeholder="Lọc theo trạng thái"
        data={[
            { value: 'pending', label: 'Chờ xác nhận' },
            { value: 'paid', label: 'Đã thanh toán' },
            { value: 'failed', label: 'Thất bại' },
            { value: 'expired', label: 'Hết hạn' },
        ]}
        value={filters.status}
        onChange={(value) => handleFilterChange('status', value)}
        clearable
      />
      <DatePickerInput
        type="range"
        placeholder="Lọc theo ngày tạo"
        value={filters.dateRange}
        onChange={(value) => handleFilterChange('dateRange', value)}
        clearable
      />
    </SimpleGrid>
  );
}