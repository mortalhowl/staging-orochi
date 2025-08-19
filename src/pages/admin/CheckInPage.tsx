import { useState, useEffect, useRef } from 'react';
import { Container, Title, Select, Paper, Stack, TextInput, Button, Center, Loader, Alert, Text, Group, Modal, Switch, Box } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { supabase } from '../../services/supabaseClient';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';
import { notifications } from '@mantine/notifications';
import { formatDateTime } from '../../utils/formatters';
import { IconAlertCircle, IconCircleCheck, IconX, IconScan, IconCamera, IconCameraOff } from '@tabler/icons-react';

interface EventSelectItem { value: string; label: string; }
interface ModalData {
  status: 'VALID' | 'ALREADY_USED' | 'INVALID' | 'SUCCESS';
  ticket: any | null;
  message: string | null;
}

// Component con để hiển thị kết quả trong Modal
function ResultDisplay({ data, onCheckIn, loading }: { data: ModalData, onCheckIn: (ticketId: string) => void, loading: boolean }) {
  const statusMap = {
    VALID: { color: 'blue', title: 'Vé Hợp Lệ', icon: <IconScan/> },
    SUCCESS: { color: 'green', title: 'Check-in Thành Công!', icon: <IconCircleCheck/> },
    ALREADY_USED: { color: 'orange', title: 'Vé Đã Được Sử Dụng', icon: <IconAlertCircle/> },
    INVALID: { color: 'red', title: 'Vé Không Hợp Lệ', icon: <IconX/> },
  };
  const { color, title, icon } = statusMap[data.status];

  return (
    <Stack>
      <Group>
        <Alert variant="light" color={color} title={title} icon={icon} w="100%">
          <Stack>
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
          </Stack>
        </Alert>
      </Group>
      {data.status === 'VALID' && (
        <Button color="green" size="lg" onClick={() => onCheckIn(data.ticket.id)} loading={loading}>
          Check-in Ngay
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
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      const { data } = await supabase.from('events').select('id, title').eq('is_active', true);
      if (data) setEvents(data.map(e => ({ value: e.id, label: e.title })));
    };
    fetchEvents();
  }, []);

  // Effect quản lý camera
  useEffect(() => {
    if (!selectedEventId) return;

    if (!scannerRef.current) {
      scannerRef.current = new Html5Qrcode('qr-scanner-container');
    }
    const qrScanner = scannerRef.current;

    const startScanner = async () => {
      if (qrScanner.getState() === Html5QrcodeScannerState.SCANNING) return;
      
      try {
        const cameras = await Html5Qrcode.getCameras();
        if (cameras && cameras.length) {
          // Ưu tiên camera sau, nếu không có thì dùng camera đầu tiên
          const cameraId = cameras.find(c => c.label.toLowerCase().includes('back'))?.id || cameras[0].id;
          const config = { fps: 10, qrbox: { width: 250, height: 250 } };
          await qrScanner.start(cameraId, config, onScanSuccess, undefined);
        } else {
            throw new Error("No cameras found on this device.");
        }
      } catch (err) {
        console.error("Lỗi khởi động camera:", err);
        notifications.show({ title: 'Lỗi Camera', message: 'Không thể khởi động camera. Vui lòng kiểm tra quyền truy cập.', color: 'red' });
        setIsCameraOn(false);
      }
    };

    const stopScanner = async () => {
      const state = qrScanner.getState();
      if (state === Html5QrcodeScannerState.SCANNING || state === Html5QrcodeScannerState.PAUSED) {
        try {
          await qrScanner.stop();
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
    
    // Dọn dẹp khi component unmount
    return () => {
        stopScanner();
    };
  }, [isCameraOn, selectedEventId]);

  const onScanSuccess = (decodedText: string) => {
    const scanner = scannerRef.current;
    if (scanner && scanner.getState() === Html5QrcodeScannerState.SCANNING) {
      scanner.pause(true);
    }
    handleTicketLookup(decodedText);
  };

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
        const errorBody = JSON.parse(error.context.body);
        setModalData({ status: 'INVALID', ticket: null, message: errorBody.error });
      } else {
        setModalData({ status: data.status, ticket: data.ticket, message: null });
        if (data.status === 'SUCCESS') {
          setTimeout(() => handleModalClose(), 2000);
        }
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
        <Title order={2} ta="center" mb="xl">Soát vé (Check-in)</Title>
        <Paper withBorder p="md" radius="md">
          {!selectedEventId ? (
            <Select
              label="Bước 1: Chọn sự kiện để bắt đầu"
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
              <Title order={4} ta="center">Đang check-in cho sự kiện: {events.find(e => e.value === selectedEventId)?.label}</Title>
              
              <Paper withBorder p="sm" radius="md">
                <Group justify="space-between">
                    <Text fw={500}>Camera</Text>
                    <Switch
                        checked={isCameraOn}
                        onChange={(event) => setIsCameraOn(event.currentTarget.checked)}
                        label={isCameraOn ? "Đang bật" : "Đang tắt"}
                        thumbIcon={isCameraOn ? <IconCamera size={12} /> : <IconCameraOff size={12} />}
                    />
                </Group>
              </Paper>

              <Box
                id="qr-scanner-container"
                style={{ display: isCameraOn ? 'block' : 'none', width: '100%' }}
              />
              {!isCameraOn && (
                <Center h={250} bg="gray.1" style={{ borderRadius: 'var(--mantine-radius-md)' }}>
                  <Text c="dimmed">Camera đang tắt</Text>
                </Center>
              )}
              
              <TextInput
                label="Hoặc nhập mã vé thủ công"
                placeholder="Nhập mã vé..."
                value={ticketIdInput}
                onChange={(e) => setTicketIdInput(e.currentTarget.value)}
                onKeyDown={(event) => { if (event.key === 'Enter') handleTicketLookup(ticketIdInput); }}
              />
              <Button onClick={() => handleTicketLookup(ticketIdInput)} disabled={!ticketIdInput}>
                Kiểm tra vé
              </Button>
            </Stack>
          )}
        </Paper>
      </Container>
    </>
  );
}
