import { Grid, SimpleGrid, TextInput, Select } from '@mantine/core';
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
<Grid gutter="md" mb="md">
  {/* Ô tìm kiếm chiếm 6 cột trên tổng 12 => 1/2 */}
  <Grid.Col span={{ base: 12, md: 6 }}>
    <TextInput
      placeholder="Tìm Mã ĐH, Email..."
      leftSection={<IconSearch size={16} />}
      value={filters.search}
      onChange={(e) => handleFilterChange('search', e.currentTarget.value)}
    />
  </Grid.Col>

  {/* Cụm còn lại chiếm 6 cột => 1/2 */}
  <Grid.Col span={{ base: 12, md: 6 }}>
    <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
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
          // { value: 'failed', label: 'Thất bại' },
          // { value: 'expired', label: 'Hết hạn' },
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
  </Grid.Col>
</Grid>
  );
}