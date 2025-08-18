import { Table, Checkbox, Badge, LoadingOverlay, UnstyledButton, Group, Center, rem, Text, ScrollArea } from '@mantine/core';
import { IconSelector, IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import type { Event, Sorting } from '../../../types';
import {formatDate} from '../../../utils/formatters'

interface EventsTableProps {
  events: Event[];
  loading: boolean;
  selection: string[];
  setSelection: (selection: string[]) => void;
  onRowClick: (eventId: string) => void;
  sorting: Sorting;
  setSorting: (sorting: Sorting) => void;
  canEdit: boolean;
}

function Th({ children, reversed, sorted, onSort }: { children: React.ReactNode; reversed: boolean; sorted: boolean; onSort: () => void; }) {
  const Icon = sorted ? (reversed ? IconChevronUp : IconChevronDown) : IconSelector;
  return (
    <Table.Th>
      <UnstyledButton onClick={onSort}>
        <Group justify="space-between" gap="xs" wrap="nowrap">
          <Text fw={500} fz="sm">{children}</Text>
          <Center><Icon style={{ width: rem(16), height: rem(16) }} stroke={1.5} /></Center>
        </Group>
      </UnstyledButton>
    </Table.Th>
  );
}

export function EventsTable({ events, loading, selection, setSelection, onRowClick, sorting, setSorting, canEdit }: EventsTableProps) {
  const setSort = (field: keyof Event) => {
    const reversed = field === sorting.column && sorting.direction === 'asc';
    setSorting({ column: field, direction: reversed ? 'desc' : 'asc' });
  };
  const rows = events.map((event) => (
    <Table.Tr
      key={event.id}
      bg={selection.includes(event.id) ? 'var(--mantine-color-blue-light)' : undefined}
      onClick={() => onRowClick(event.id)} 
      style={{ cursor: 'pointer' }} 
    >
      { canEdit && (<Table.Td onClick={(e) => e.stopPropagation()}> 
        <Checkbox
          aria-label="Select row"
          checked={selection.includes(event.id)}
          onChange={(e) =>
            setSelection(
              e.currentTarget.checked
                ? [...selection, event.id]
                : selection.filter((id) => id !== event.id)
            )
          }
        />
      </Table.Td>)}
      <Table.Td>{event.title}</Table.Td>
      <Table.Td>{formatDate(event.start_time)}</Table.Td>
      <Table.Td>{formatDate(event.end_time)}</Table.Td>
      <Table.Td>
        <Badge color={event.is_active ? 'green' : 'gray'}>
          {event.is_active ? 'Đang hoạt động' : 'Đã ẩn'}
        </Badge>
      </Table.Td>
      {/* <Table.Td>{formatDate(event.created_at)}</Table.Td>
      <Table.Td>{formatDate(event.updated_at)}</Table.Td> */}
    </Table.Tr>
  ));

return (
    <div style={{ position: 'relative' }}>
      <LoadingOverlay visible={loading} zIndex={10} overlayProps={{ radius: 'sm', blur: 2 }} />
      <ScrollArea>
      <Table striped highlightOnHover withTableBorder miw={800}>
        <Table.Thead>
          <Table.Tr >
            { canEdit && (<Table.Th style={{ width: 40 }}>
              <Checkbox
                onChange={(e) =>
                  setSelection(e.currentTarget.checked ? events.map((event) => event.id) : [])
                }
                checked={selection.length > 0 && selection.length === events.length}
                indeterminate={selection.length > 0 && selection.length !== events.length}
              />
            </Table.Th>)}
            <Th sorted={sorting.column === 'title'} reversed={sorting.direction === 'desc'} onSort={() => setSort('title')} >
              Tên sự kiện
            </Th>
            <Table.Th>Thời gian bắt đầu</Table.Th>
            <Table.Th>Thời gian kết thúc</Table.Th>
            <Table.Th>Trạng thái</Table.Th>
            {/* <Table.Th>Ngày tạo</Table.Th>
            <Table.Th>Cập nhật</Table.Th> */}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {rows.length > 0 ? (
            rows
          ) : (
            <Table.Tr>
              <Table.Td colSpan={4} align="center">
                Không có dữ liệu
              </Table.Td>
            </Table.Tr>
          )}
        </Table.Tbody>
      </Table>
      </ScrollArea>
    </div>
  );
}