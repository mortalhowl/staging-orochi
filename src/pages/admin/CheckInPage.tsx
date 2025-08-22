import { useState, useEffect } from 'react';
import { Container, Select, Paper, Stack, Divider, TextInput, Button, Center, Loader, Alert, Text, Group, Modal, Switch, Box, ActionIcon } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { supabase } from '../../services/supabaseClient';
import { Scanner } from '@yudiel/react-qr-scanner';
import { notifications } from '@mantine/notifications';
import { formatDateTime } from '../../utils/formatters';
import { IconAlertCircle, IconCircleCheck, IconX, IconScan, IconCamera, IconCameraOff } from '@tabler/icons-react';
import { getSupabaseFnError } from '../../utils/supabaseFnError';

interface EventSelectItem { value: string; label: string; }
interface ModalData {
  status: 'VALID' | 'ALREADY_USED' | 'INVALID' | 'SUCCESS';
  ticket: any | null;
  message: string | null;
}

// Component con để hiển thị kết quả trong Modal
function ResultDisplay({ data, onCheckIn, loading }: { data: ModalData, onCheckIn: (ticketId: string) => void, loading: boolean }) {
  const statusMap = {
    VALID: { color: 'blue', title: 'Vé Hợp Lệ', icon: <IconScan /> },
    SUCCESS: { color: 'green', title: 'Thành Công!', icon: <IconCircleCheck /> },
    ALREADY_USED: { color: 'orange', title: 'Vé Đã Được Sử Dụng', icon: <IconAlertCircle /> },
    INVALID: { color: 'red', title: 'Vé Không Hợp Lệ', icon: <IconX /> },
  };
  const { color, title, icon } = statusMap[data.status];

  return (
    <Stack>
      <Group>
        <Alert variant="light" color={color} title={title} icon={icon} w="100%">
          <Stack>
            {/* Nếu là SUCCESS thì chỉ hiển thị message */}
            {data.status === 'SUCCESS' ? (
              <Text fw={500} c="green">Đã Check-in thành công!</Text>
            ) : (
              <>
                {data.message && <Text>{data.message}</Text>}
                {data.ticket && (
                  <>
                    <Text><b>Mã vé:</b> {data.ticket.id}</Text>
                    <Text><b>Khách hàng:</b> {data.ticket.transactions?.users?.full_name || data.ticket.full_name}</Text>
                    <Text><b>Email:</b> {data.ticket.transactions?.users?.email || data.ticket.email}</Text>
                    <Text><b>Loại vé:</b> {data.ticket.ticket_types?.name}</Text>
                    {data.ticket.is_used && (
                      <Text><b>Thời gian check-in:</b> {formatDateTime(data.ticket.used_at)} bởi {data.ticket.checked_in_by_user?.full_name}</Text>
                    )}
                  </>
                )}
              </>
            )}
          </Stack>
        </Alert>
      </Group>

      {/* Chỉ hiển thị nút check-in khi status = VALID */}
      {data.status === 'VALID' && (
        <Button onClick={() => onCheckIn(data.ticket.id)} loading={loading}>
          Check-in
        </Button>
      )}
    </Stack>
  );
}

export function CheckInPage() {
  const [events, setEvents] = useState<EventSelectItem[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [ticketIdInput, setTicketIdInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  const [modalData, setModalData] = useState<ModalData | null>(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');

  useEffect(() => {
    const fetchEvents = async () => {
      const { data } = await supabase.from('events').select('id, title').eq('is_active', true);
      if (data) setEvents(data.map(e => ({ value: e.id, label: e.title })));
    };
    fetchEvents();
  }, []);

  // Lấy danh sách camera khi bật camera
  useEffect(() => {
    const getCameras = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter(device => device.kind === 'videoinput');
        setAvailableCameras(cameras);
        
        // Tự động chọn camera sau nếu có
        const backCamera = cameras.find(camera => 
          camera.label.toLowerCase().includes('back')
        );
        
        if (backCamera) {
          setSelectedCamera(backCamera.deviceId);
        } else if (cameras.length > 0) {
          setSelectedCamera(cameras[0].deviceId);
        }
      } catch (error) {
        console.error('Lỗi khi lấy danh sách camera:', error);
        notifications.show({ 
          title: 'Lỗi Camera', 
          message: 'Không thể truy cập camera. Vui lòng kiểm tra quyền truy cập.', 
          color: 'red' 
        });
        setIsCameraOn(false);
      }
    };

    if (isCameraOn) {
      getCameras();
    } else {
      setAvailableCameras([]);
    }
  }, [isCameraOn]);

  const handleScanResult = (result: string) => {
    handleTicketLookup(result);
  };

  const handleModalClose = () => {
    closeModal();
  };

  const handleTicketLookup = async (ticketId: string, performCheckIn = false) => {
    if (!ticketId.trim()) {
      notifications.show({ title: 'Lỗi', message: 'Vui lòng nhập mã vé.', color: 'red' });
      return;
    }
    setLoading(true);
    openModal();

    try {
      const { data, error } = await supabase.functions.invoke('check-in-ticket', {
        body: { ticketId, eventId: selectedEventId, performCheckIn },
      });

      if (error) {
        // Sử dụng hàm getSupabaseFnError để lấy lỗi chi tiết
        const message = await getSupabaseFnError(error);
        throw new Error(message);
      }
      
      setModalData({ status: data.status, ticket: data.ticket, message: null });
      if (data.status === 'SUCCESS') {
        setTimeout(() => handleModalClose(), 2000);
      }
    } catch (err: any) {
      // Khối catch này giờ sẽ nhận được thông báo lỗi chính xác
      setModalData({ status: 'INVALID', ticket: null, message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Modal opened={modalOpened} onClose={handleModalClose} title="Kết quả Quét vé" centered>
        {loading && <Center><Loader /></Center>}
        {!loading && modalData && (
          <ResultDisplay
            data={modalData}
            onCheckIn={(ticketId) => handleTicketLookup(ticketId, true)}
            loading={loading}
          />
        )}
      </Modal>

      <Container size="xs">
        {!selectedEventId ? (
          <Select
            label="Chọn sự kiện để bắt đầu"
            placeholder="Chọn sự kiện..."
            data={events}
            onChange={(value) => {
              setSelectedEventId(value);
              setIsCameraOn(true); // Tự động bật camera khi chọn sự kiện
            }}
            searchable
          />
        ) : (
          <Stack>
            <Group justify="center" align="center" gap="xs">
              <Text>Sự kiện:</Text>
              <Text c="#008a87" fw={700}>{events.find(e => e.value === selectedEventId)?.label}</Text>
            </Group>

            <Paper withBorder p="xs" radius="md">
              <Group justify="space-between">
                <Text fw={500}>Camera</Text>
                <Switch
                  checked={isCameraOn}
                  onChange={(event) => setIsCameraOn(event.currentTarget.checked)}
                  thumbIcon={isCameraOn ? <IconCamera size={12} /> : <IconCameraOff size={12} />}
                />
              </Group>
            </Paper>

            {isCameraOn && availableCameras.length > 1 && (
              <Select
                label="Chọn camera"
                value={selectedCamera}
                onChange={(value) => setSelectedCamera(value || '')}
                data={availableCameras.map(camera => ({
                  value: camera.deviceId,
                  label: camera.label || `Camera ${camera.deviceId.slice(0, 8)}`
                }))}
              />
            )}

            <Box
              style={{
                border: '1px solid #ddd',
                width: '100%',
                aspectRatio: '4 / 3',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden'
              }}
            >
              {isCameraOn ? (
                <Scanner
                  onDecode={handleScanResult}
                  onError={(error) => {
                    console.error('Lỗi camera:', error);
                    notifications.show({
                      title: 'Lỗi Camera',
                      message: 'Không thể khởi động camera. Vui lòng kiểm tra quyền truy cập.',
                      color: 'red'
                    });
                  }}
                  constraints={{ 
                    deviceId: selectedCamera,
                    facingMode: selectedCamera ? undefined : 'environment',
                    aspectRatio: 4/3 
                  }}
                  containerStyle={{ width: '100%', height: '100%' }}
                />
              ) : (
                <Text c="dimmed">Camera đang tắt</Text>
              )}
            </Box>
            <Divider my="md" label="Hoặc" />
            <TextInput
              placeholder="Nhập mã vé..."
              value={ticketIdInput}
              onChange={(e) => setTicketIdInput(e.currentTarget.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') handleTicketLookup(ticketIdInput); }}
              rightSection={
                ticketIdInput ? (
                  <ActionIcon
                    onClick={() => setTicketIdInput('')}
                    variant="subtle"
                    color="gray"
                  >
                    <IconX size={16} />
                  </ActionIcon>
                ) : null
              }
            />
            <Button onClick={() => handleTicketLookup(ticketIdInput)} disabled={!ticketIdInput}>
              Kiểm tra
            </Button>
          </Stack>
        )}
      </Container>
    </>
  );
}