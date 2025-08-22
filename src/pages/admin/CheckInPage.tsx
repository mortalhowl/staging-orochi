import { useState, useEffect, useRef, useCallback } from 'react';
import { Container, Select, Paper, Stack, Divider, TextInput, Button, Center, Loader, Alert, Text, Group, Modal, Switch, Box, ActionIcon } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { supabase } from '../../services/supabaseClient';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';
import { notifications } from '@mantine/notifications';
import { formatDateTime } from '../../utils/formatters';
import { IconAlertCircle, IconCircleCheck, IconX, IconScan, IconCamera, IconCameraOff } from '@tabler/icons-react';
import { getSupabaseFnError } from '../../utils/supabaseFnError';

interface EventSelectItem { value: string; label: string; }
interface CameraSelectItem { value: string; label: string; }
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
  const [cameras, setCameras] = useState<CameraSelectItem[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [ticketIdInput, setTicketIdInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  const [modalData, setModalData] = useState<ModalData | null>(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isCameraInitialized, setIsCameraInitialized] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      const { data } = await supabase.from('events').select('id, title').eq('is_active', true);
      if (data) setEvents(data.map(e => ({ value: e.id, label: e.title })));
    };
    fetchEvents();
  }, []);

  // Lấy danh sách camera
  useEffect(() => {
    const getCameras = async () => {
      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length) {
          const cameraOptions = devices.map(device => ({
            value: device.id,
            label: device.label || `Camera ${device.id}`
          }));
          setCameras(cameraOptions);
          if (cameraOptions.length > 0) {
            setSelectedCameraId(cameraOptions[0].value);
          }
        }
      } catch (err) {
        console.error("Lỗi khi lấy danh sách camera:", err);
        notifications.show({ 
          title: 'Lỗi Camera', 
          message: 'Không thể lấy danh sách camera. Vui lòng kiểm tra quyền truy cập.', 
          color: 'red' 
        });
      }
    };
    
    if (isCameraOn) {
      getCameras();
    }
  }, [isCameraOn]);

  // Effect quản lý camera
  useEffect(() => {
    if (!selectedEventId || !selectedCameraId || !isCameraOn) return;

    // Đảm bảo phần tử DOM đã được render trước khi khởi tạo scanner
    const scannerContainer = document.getElementById('qr-scanner-container');
    if (!scannerContainer) {
      console.error("Không tìm thấy container cho scanner");
      return;
    }

    if (!scannerRef.current) {
      scannerRef.current = new Html5Qrcode('qr-scanner-container');
    }
    const qrScanner = scannerRef.current;

    const startScanner = async () => {
      if (qrScanner.getState() === Html5QrcodeScannerState.SCANNING) return;

      try {
        const config = { fps: 10, qrbox: { width: 250, height: 250 } };
        await qrScanner.start(selectedCameraId, config, onScanSuccess, undefined);
        setIsCameraInitialized(true);
      } catch (err) {
        console.error("Lỗi khởi động camera:", err);
        notifications.show({ 
          title: 'Lỗi Camera', 
          message: 'Không thể khởi động camera. Vui lòng kiểm tra lại kết nối.', 
          color: 'red' 
        });
        setIsCameraOn(false);
        setIsCameraInitialized(false);
      }
    };

    const stopScanner = async () => {
      const state = qrScanner.getState();
      if (state === Html5QrcodeScannerState.SCANNING || state === Html5QrcodeScannerState.PAUSED) {
        try {
          await qrScanner.stop();
          setIsCameraInitialized(false);
        } catch (err) {
          console.error("Lỗi khi tắt camera:", err);
        }
      }
    };

    if (isCameraOn) {
      startScanner();
    } else {
      stopScanner();
    }

    return () => {
      stopScanner();
    };
  }, [isCameraOn, selectedEventId, selectedCameraId]);

  const onScanSuccess = useCallback((decodedText: string) => {
    const scanner = scannerRef.current;
    if (scanner && scanner.getState() === Html5QrcodeScannerState.SCANNING) {
      scanner.pause(true);
    }
    handleTicketLookup(decodedText);
  }, []);

  const handleModalClose = () => {
    closeModal();
    const scanner = scannerRef.current;
    if (isCameraOn && scanner && scanner.getState() === Html5QrcodeScannerState.PAUSED) {
      scanner.resume();
    }
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
        const message = await getSupabaseFnError(error);
        throw new Error(message);
      }
      
      setModalData({ status: data.status, ticket: data.ticket, message: null });
      if (data.status === 'SUCCESS') {
        setTimeout(() => handleModalClose(), 2000);
      }
    } catch (err: any) {
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
            onChange={(value) => setSelectedEventId(value)}
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

            {isCameraOn && cameras.length > 0 && (
              <Select
                label="Chọn camera"
                placeholder="Chọn camera..."
                value={selectedCameraId}
                onChange={(value) => setSelectedCameraId(value)}
                data={cameras}
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
                minHeight: '300px'
              }}
            >
              {isCameraOn && selectedCameraId ? (
                <Box
                  id="qr-scanner-container"
                  style={{ width: '100%', height: '100%' }}
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