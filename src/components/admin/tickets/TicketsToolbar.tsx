import { SimpleGrid, TextInput, Select } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { supabase } from '../../../services/supabaseClient';

interface EventSelectItem { value: string; label: string; }

interface TicketsToolbarProps {
  filters: any;
  setFilters: (filters: any) => void;
}

export function TicketsToolbar({ filters, setFilters }: TicketsToolbarProps) {
  const [events, setEvents] = useState<EventSelectItem[]>([]);

  useEffect(() => {
    const fetchEvents = async () => {
      const { data } = await supabase.from('events').select('id, title');
      if (data) setEvents(data.map(e => ({ value: e.id, label: e.title })));
    };
    fetchEvents();
  }, []);
  
  const handleFilterChange = (key: string, value: any) => {
    setFilters((prev: any) => ({ ...prev, [key]: value }));
  };

  return (
    <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} mb="md">
      <TextInput
        placeholder="Tìm Mã vé, Tên, Email..."
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
        placeholder="Lọc theo nguồn gốc"
        data={[ { value: 'false', label: 'Vé bán' }, { value: 'true', label: 'Vé mời' } ]}
        value={filters.isInvite}
        onChange={(value) => handleFilterChange('isInvite', value)}
        clearable
      />
      <Select
        placeholder="Lọc theo trạng thái"
        data={[ { value: 'false', label: 'Chưa check-in' }, { value: 'true', label: 'Đã check-in' } ]}
        value={filters.isUsed}
        onChange={(value) => handleFilterChange('isUsed', value)}
        clearable
      />
    </SimpleGrid>
  );
}
