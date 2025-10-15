// src/pages/admin/InvitedTicketsPage.tsx
import { useState, useEffect, useMemo } from 'react';
import { Container, Title, Tabs, Grid, Select, Paper, Stack, Group, TextInput, NumberInput, ActionIcon, Button, Text, Alert, FileInput, Table, Divider, Flex } from '@mantine/core';
import { IconPlus, IconTrash, IconInfoCircle, IconDownload, IconUpload } from '@tabler/icons-react';
import { supabase } from '../../services/supabaseClient'; // Vẫn cần để lấy events & ticket types
import { notifications } from '@mantine/notifications';
import * as XLSX from 'xlsx';
import { InvitedTicketsApi } from '../../services/api/invitedTickets'; // <-- 1. IMPORT SERVICE MỚI

// Định nghĩa kiểu dữ liệu cho khách mời
interface Guest {
  key?: number; // Dùng cho nhập tay
  email: string;
  fullName: string;
  quantity: number;
}

const MAX_INVITED_TICKETS = 100;

// Component cho Tab Nhập thủ công
function ManualInputTab({ events, ticketTypes, selectedEventId, setSelectedEventId, selectedTicketTypeId, setSelectedTicketTypeId }: any) {
  const [guests, setGuests] = useState<Guest[]>([{ key: Math.random(), email: '', fullName: '', quantity: 1 }]);
  const [loading, setLoading] = useState(false);
  const totalTickets = useMemo(() => guests.reduce((sum, guest) => sum + (guest.quantity || 0), 0), [guests]);

  const handleGuestChange = (index: number, field: keyof Omit<Guest, 'key'>, value: string | number) => {
    const newGuests = [...guests];
    (newGuests[index] as any)[field] = value;
    setGuests(newGuests);
  };
  const addGuestRow = () => setGuests([...guests, { key: Math.random(), email: '', fullName: '', quantity: 1 }]);
  const removeGuestRow = (index: number) => setGuests(guests.filter((_, i) => i !== index));

  // <-- 2. TÁI CẤU TRÚC HÀM NÀY
  const handleSubmit = async () => {
    setLoading(true);
    const validGuests = guests.filter(g => g.email && g.fullName && g.quantity > 0);
    if (validGuests.length === 0 || !selectedEventId || !selectedTicketTypeId) {
      notifications.show({ title: 'Lỗi', message: 'Vui lòng điền đầy đủ thông tin.', color: 'red' });
      setLoading(false);
      return;
    }
    try {
      // Gọi đến service thay vì supabase.functions.invoke
      await InvitedTicketsApi.createTickets({
        eventId: selectedEventId,
        ticketTypeId: selectedTicketTypeId,
        guests: validGuests
      });

      notifications.show({ title: 'Thành công', message: `Đã gửi yêu cầu tạo ${totalTickets} vé mời.`, color: 'green' });
      setGuests([{ key: Math.random(), email: '', fullName: '', quantity: 1 }]); // Reset form
    } catch (err: any) {
      notifications.show({ title: 'Thất bại', message: err.message, color: 'red' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper withBorder p="md" radius="md">
        {/* ... JSX của ManualInputTab không thay đổi ... */}
        <Stack>
        <Grid>
          <Grid.Col span={{ base: 12, sm: 6 }}><Select required label="Chọn sự kiện" data={events} value={selectedEventId} onChange={setSelectedEventId} searchable /></Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6 }}><Select required label="Chọn loại vé" data={ticketTypes} value={selectedTicketTypeId} onChange={setSelectedTicketTypeId} disabled={!selectedEventId} searchable /></Grid.Col>
        </Grid>
        <Stack gap="xs" mt="md">
          {guests.map((guest, index) => (
            <Flex key={guest.key} gap="md" align="center">
              <Text>#{index + 1}</Text>
              <TextInput
                placeholder="Email"
                value={guest.email}
                onChange={(e) =>
                  handleGuestChange(index, "email", e.currentTarget.value)
                }
                style={{ flex: 2 }}
              />
              <TextInput
                placeholder="Họ và tên"
                value={guest.fullName}
                onChange={(e) =>
                  handleGuestChange(index, "fullName", e.currentTarget.value)
                }
                style={{ flex: 2 }}
              />
              <NumberInput
                value={guest.quantity}
                onChange={(val) => handleGuestChange(index, "quantity", val || 1)}
                min={1}
                style={{ width: 100 }}
              />
              <ActionIcon
                color="red"
                variant="subtle"
                onClick={() => removeGuestRow(index)}
              >
                <IconTrash />
              </ActionIcon>
            </Flex>

          ))}
        </Stack>
        <Button onClick={addGuestRow} variant="light" leftSection={<IconPlus size={16} />} style={{ alignSelf: 'flex-start' }}>Thêm</Button>
        <Divider />
        <Group justify="space-between">
          <Text fw={500}>Tổng số vé sẽ tạo: {totalTickets}</Text>
          <Button onClick={handleSubmit} loading={loading} disabled={!selectedEventId || !selectedTicketTypeId || totalTickets === 0 || totalTickets > MAX_INVITED_TICKETS}>Gửi {totalTickets} vé mời</Button>
        </Group>
        {totalTickets > MAX_INVITED_TICKETS && <Alert color="red" title="Quá giới hạn" icon={<IconInfoCircle />}>Bạn chỉ có thể tạo tối đa {MAX_INVITED_TICKETS} vé trong một lần.</Alert>}
      </Stack>
    </Paper>
  );
}

// Component cho Tab Nhập từ file Excel
function ExcelInputTab({ events, ticketTypes, selectedEventId, setSelectedEventId, selectedTicketTypeId, setSelectedTicketTypeId }: any) {
  const [file, setFile] = useState<File | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(false);
  const totalTickets = useMemo(() => guests.reduce((sum, guest) => sum + (guest.quantity || 0), 0), [guests]);

  // ... các hàm handleFileChange, handleDownloadTemplate không thay đổi ...
  const handleFileChange = (selectedFile: File | null) => {
    setFile(selectedFile);
    if (!selectedFile) {
      setGuests([]);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const json: any[] = XLSX.utils.sheet_to_json(worksheet);

      const parsedGuests = json.map(row => ({
        email: String(row.email || ''),
        fullName: String(row.full_name || ''),
        quantity: Number(row.quantity || 1),
      }));
      setGuests(parsedGuests);
    };
    reader.readAsArrayBuffer(selectedFile);
  };

  const handleDownloadTemplate = () => {
    const data = [['STT', 'email', 'full_name', 'quantity']];
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'MauVeMoi');
    XLSX.writeFile(workbook, 'MauVeMoi.xlsx');
  };
  
  // <-- 3. TÁI CẤU TRÚC HÀM NÀY
  const handleSubmit = async () => {
    setLoading(true);
    const validGuests = guests.filter(g => g.email && g.fullName && g.quantity > 0);
    if (validGuests.length === 0 || !selectedEventId || !selectedTicketTypeId) {
      notifications.show({ title: 'Lỗi', message: 'Không có dữ liệu hợp lệ hoặc chưa chọn Sự kiện/Loại vé.', color: 'red' });
      setLoading(false);
      return;
    }

    try {
      // Gọi đến service thay vì supabase.functions.invoke
      await InvitedTicketsApi.createTickets({
        eventId: selectedEventId,
        ticketTypeId: selectedTicketTypeId,
        guests: validGuests,
      });

      notifications.show({ title: 'Thành công', message: `Đã gửi yêu cầu tạo ${totalTickets} vé mời.`, color: 'green' });
      setFile(null);
      setGuests([]);
    } catch (err: any) {
      notifications.show({ title: 'Thất bại', message: err.message, color: 'red' });
    } finally {
      setLoading(false);
    }
  };


  return (
    <Paper withBorder p="md" radius="md">
        {/* ... JSX của ExcelInputTab không thay đổi ... */}
        <Stack>
        <Flex gap="xs" mt="md">
          <Select required label="Chọn sự kiện" data={events} value={selectedEventId} onChange={setSelectedEventId} searchable flex={2} />
          <Select required label="Chọn loại vé" data={ticketTypes} value={selectedTicketTypeId} onChange={setSelectedTicketTypeId} disabled={!selectedEventId} searchable flex={2} />
          <Button onClick={handleDownloadTemplate} variant="light" leftSection={<IconDownload size={16} />} style={{ alignSelf: 'flex-end' }}>Tải file mẫu</Button>

        </Flex>
        <FileInput label="Tải lên file Excel" placeholder="Chọn file..." value={file} onChange={handleFileChange} accept=".xlsx, .xls" leftSection={<IconUpload size={16} />} />
        {guests.length > 0 && (
          <>
            <Title order={5} mt="md">Xem trước dữ liệu:</Title>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>STT</Table.Th>
                  <Table.Th>Email</Table.Th>
                  <Table.Th>Họ tên</Table.Th>
                  <Table.Th>Số lượng</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>{guests.map((g, i) => 
                <Table.Tr key={i}>
                  <Table.Td>#{i + 1}</Table.Td>
                  <Table.Td>{g.email}</Table.Td>
                  <Table.Td>{g.fullName}</Table.Td>
                  <Table.Td>{g.quantity}</Table.Td>
                </Table.Tr>
              )}</Table.Tbody>
            </Table>
            <Divider />
            <Group justify="space-between">
              <Text fw={500}>Tổng số vé sẽ tạo: {totalTickets}</Text>
              <Button onClick={handleSubmit} loading={loading} disabled={!selectedEventId || !selectedTicketTypeId || totalTickets === 0 || totalTickets > MAX_INVITED_TICKETS}>Gửi {totalTickets} vé mời</Button>
            </Group>
            {totalTickets > MAX_INVITED_TICKETS && <Alert color="red" title="Quá giới hạn" icon={<IconInfoCircle />}>Bạn chỉ có thể tạo tối đa {MAX_INVITED_TICKETS} vé trong một lần.</Alert>}
          </>
        )}
      </Stack>
    </Paper>
  );
}

// Component Trang chính không thay đổi
export function InvitedTicketsPage() {
  const [events, setEvents] = useState<{ value: string; label: string }[]>([]);
  const [ticketTypes, setTicketTypes] = useState<{ value: string; label: string }[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedTicketTypeId, setSelectedTicketTypeId] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      const { data } = await supabase.from('events').select('id, title').eq('is_active', true).order('created_at', { ascending: false });
      if (data) setEvents(data.map(e => ({ value: e.id, label: e.title })));
    };
    fetchEvents();
  }, []);

  useEffect(() => {
    const fetchTicketTypes = async () => {
      if (!selectedEventId) {
        setTicketTypes([]);
        setSelectedTicketTypeId(null);
        return;
      }
      const { data } = await supabase.from('ticket_types').select('id, name').eq('event_id', selectedEventId);
      if (data) setTicketTypes(data.map(t => ({ value: t.id, label: t.name })));
    };
    fetchTicketTypes();
  }, [selectedEventId]);

  const commonProps = { events, ticketTypes, selectedEventId, setSelectedEventId, selectedTicketTypeId, setSelectedTicketTypeId };

  return (
    <Container size="md" mt="md">
      <Title order={2} mb="xl">Vé mời</Title>
      <Tabs defaultValue="manual" variant="pills" radius="md">
        <Tabs.List justify='center'>
          <Tabs.Tab value="manual">Nhập thủ công</Tabs.Tab>
          <Tabs.Tab value="excel">Nhập Excel</Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="manual" pt="md">
          <ManualInputTab {...commonProps} />
        </Tabs.Panel>
        <Tabs.Panel value="excel" pt="md">
          <ExcelInputTab {...commonProps} />
        </Tabs.Panel>
      </Tabs>
    </Container>
  );
}