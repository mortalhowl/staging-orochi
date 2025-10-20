// src/pages/admin/CheckInPage.tsx
import { useState, useEffect } from 'react';
import { Container, Select, Stack, Divider, TextInput, Button, Center, Loader, Alert, Text, Group, Modal, Switch, Box, ActionIcon, ScrollArea, Paper} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { supabase } from '../../services/supabaseClient'; // Vẫn cần để lấy danh sách sự kiện
import { Scanner } from '@yudiel/react-qr-scanner';
import { notifications } from '@mantine/notifications';
import { formatDateTime } from '../../utils/formatters';
import { IconAlertCircle, IconCircleCheck, IconX, IconScan, IconCamera, IconCameraOff, IconArrowsLeftRight, IconChecks } from '@tabler/icons-react';
import { CheckInApi } from '../../services/api/checkin';

interface EventSelectItem { value: string; label: string; }
interface ModalData {
  status: 'VALID' | 'ALREADY_USED' | 'INVALID' | 'SUCCESS';
  ticket: any | null;
  message: string | null;
}

// Component con để hiển thị kết quả trong Modal
// Component con ResultDisplay không thay đổi
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
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [ticketIdInput, setTicketIdInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  const [modalData, setModalData] = useState<ModalData | null>(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [isUsingBackCamera, setIsUsingBackCamera] = useState(true);
  const [cameraLog, setCameraLog] = useState<string[]>([]);

  const handleToggleCamera = () => {
    if (!availableCameras.length) return;

    const backCamera = availableCameras.find(c =>
      c.label.toLowerCase().includes('back')
    );
    const frontCamera = availableCameras.find(c =>
      c.label.toLowerCase().includes('front')
    );

    if (isUsingBackCamera && frontCamera) {
      setSelectedCamera(frontCamera.deviceId);
      setIsUsingBackCamera(false);
    } else if (!isUsingBackCamera && backCamera) {
      setSelectedCamera(backCamera.deviceId);
      setIsUsingBackCamera(true);
    } else if (availableCameras.length > 0) {
      // fallback: nếu không tìm thấy thì chọn camera đầu tiên
      setSelectedCamera(availableCameras[0].deviceId);
    }
  };


  useEffect(() => {
    const fetchEvents = async () => {
      const { data } = await supabase.from('events').select('id, title').eq('is_active', true);
      if (data) setEvents(data.map(e => ({ value: e.id, label: e.title })));
    };
    fetchEvents();
  }, []);

// Lấy danh sách camera khi bật camera
  useEffect(() => {
    const log = (message: string) => {
      console.log(`[Camera Check] ${message}`);
      setCameraLog(prev => [...prev, `${new Date().toLocaleTimeString()} - ${message}`]); // Thêm log vào state
    };

    const getCameras = async () => {
      log('Attempting to get media devices...');
      setCameraLog(['Attempting to get media devices...']); // Reset log khi bắt đầu

      // Kiểm tra HTTPS
      if (window.location.protocol !== 'https:') {
        log('ERROR: Page is not served over HTTPS. Camera access denied.');
        notifications.show({
          title: 'Lỗi HTTPS',
          message: 'Trang phải được phục vụ qua HTTPS để truy cập camera.',
          color: 'red'
        });
        setIsCameraOn(false); // Tắt switch camera
        return;
      } else {
         log('HTTPS check passed.');
      }

      // Kiểm tra API hỗ trợ
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        log('ERROR: navigator.mediaDevices.enumerateDevices is not supported by this browser.');
         notifications.show({
          title: 'Trình duyệt không hỗ trợ',
          message: 'Trình duyệt của bạn không hỗ trợ API cần thiết để liệt kê camera.',
          color: 'red'
        });
        setIsCameraOn(false);
        return;
      } else {
         log('enumerateDevices API is supported.');
      }

      try {
        // Bước 1: Yêu cầu quyền truy cập (quan trọng)
        // enumerateDevices có thể không trả về label nếu chưa có quyền
        log('Requesting camera permission (getUserMedia)...');
        try {
            // Yêu cầu stream chỉ để kích hoạt prompt xin quyền
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
            log('getUserMedia successful (permission likely granted or previously granted).');
            // Dừng stream ngay lập tức vì chỉ cần xin quyền
            stream.getTracks().forEach(track => track.stop());
        } catch (permError: any) {
             log(`getUserMedia ERROR: ${permError.name} - ${permError.message}`);
             // Không dừng ở đây, vẫn thử enumerateDevices
             notifications.show({
                title: 'Lỗi Quyền Camera',
                message: `Không thể lấy quyền truy cập camera: ${permError.message}. Hãy kiểm tra cài đặt trình duyệt.`,
                color: 'orange',
                autoClose: 7000
            });
            // Vẫn tiếp tục thử enumerateDevices, có thể nó trả về deviceId mà không có label
        }

        // Bước 2: Liệt kê thiết bị
        log('Calling enumerateDevices...');
        const devices = await navigator.mediaDevices.enumerateDevices();
        log(`enumerateDevices returned ${devices.length} devices.`);

        const cameras = devices.filter(device => device.kind === 'videoinput');
        log(`Found ${cameras.length} video input devices.`);

        if (cameras.length > 0) {
          setAvailableCameras(cameras);
          log('Available cameras:');
          cameras.forEach((cam, index) => {
            log(`  [${index}] deviceId: ${cam.deviceId.substring(0,10)}..., label: "${cam.label}", kind: ${cam.kind}, groupId: ${cam.groupId.substring(0,10)}...`);
          });
          // Không tự động chọn camera nữa, để người dùng chọn
          // if (!selectedCamera && cameras[0]) {
          //   log(`Auto-selecting first camera: ${cameras[0].deviceId.substring(0,10)}...`);
          //   setSelectedCamera(cameras[0].deviceId);
          // }
        } else {
          log('No video input devices found.');
          setAvailableCameras([]);
          notifications.show({
            title: 'Không tìm thấy camera',
            message: 'Không tìm thấy thiết bị camera nào trên hệ thống.',
            color: 'yellow'
          });
        }
      } catch (error: any) {
        log(`ENUMERATE DEVICES CRITICAL ERROR: ${error.name} - ${error.message}`);
        notifications.show({
          title: 'Lỗi Camera Nghiêm trọng',
          message: `Không thể liệt kê thiết bị camera: ${error.message}`,
          color: 'red'
        });
        setIsCameraOn(false); // Tắt switch nếu có lỗi nghiêm trọng
      }
    };

    if (isCameraOn) {
      getCameras();
    } else {
      log('Camera turned off.');
      setAvailableCameras([]);
      // setSelectedCamera(''); // Reset khi tắt
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCameraOn]); // Chỉ chạy khi isCameraOn thay đổi

  const handleScanResult = (results: { rawValue: string }[]) => {
    const code = results?.[0]?.rawValue;
    if (code) {
      setIsCameraOn(false);
      handleTicketLookup(code);
    }
  };

  const handleModalClose = () => {
    closeModal();
    setIsCameraOn(true);
  };

  const handleTicketLookup = async (ticketId: string, performCheckIn = false) => {
    if (!ticketId.trim()) {
      notifications.show({ title: 'Lỗi', message: 'Vui lòng nhập mã vé.', color: 'red' });
      return;
    }
    setLoading(true);
    openModal();

    try {
      // Gọi đến service thay vì supabase.functions.invoke
      const data = await CheckInApi.lookupOrPerformCheckIn({
        ticketId,
        eventId: selectedEventId,
        performCheckIn,
      });

      setModalData({ status: data.status, ticket: data.ticket, message: null });
      if (data.status === 'SUCCESS') {
        setTimeout(() => handleModalClose(), 2000); // Đóng modal sau 2s nếu thành công
      }
    } catch (err: any) {
      // Lỗi đã được xử lý bởi service, chỉ cần hiển thị
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
              setIsCameraOn(true);
            }}
            searchable
          />
        ) : (
          <Stack gap={'xs'}>
            <Group justify="center" align="center" gap="xs">
              <Text>Sự kiện:</Text>
              <Text c="#008a87" fw={700}>
                {events.find(e => e.value === selectedEventId)?.label}
              </Text>
            </Group>

            {/* <Paper withBorder p="xs" radius="md">
              <Group justify="space-between">
                <Text fw={500}>Camera</Text>
                <Switch
                  checked={isCameraOn}
                  onChange={(event) => setIsCameraOn(event.currentTarget.checked)}
                  thumbIcon={isCameraOn ? <IconCamera size={12} /> : <IconCameraOff size={12} />}
                />
              </Group>
            </Paper> */}

            {/* {isCameraOn && ( */}
            <>
              <Group justify="space-between" align="center">
                <Select
                  // label="Chọn camera"
                  placeholder="Chưa chọn camera"
                  value={selectedCamera || null}
                  onChange={(value) => setSelectedCamera(value || '')}
                  data={availableCameras.map(camera => ({
                    value: camera.deviceId,
                    label: camera.label || `Camera ${camera.deviceId.slice(0, 8)}`
                  }))}
                  style={{ flex: 1 }}
                />
                <ActionIcon
                  variant="light"
                  size={36}
                  onClick={handleToggleCamera}
                  title="Đổi camera trước/sau"
                >
                  <IconArrowsLeftRight size={18} />
                </ActionIcon>
                <Switch
                  checked={isCameraOn}
                  onChange={(event) => setIsCameraOn(event.currentTarget.checked)}
                  thumbIcon={isCameraOn ? <IconCamera size={12} /> : <IconCameraOff size={12} />}
                />
              </Group>
            </>
            {/* )} */}

            <Box
              style={{
                border: '1px solid #ddd',
                width: '100%',
                aspectRatio: '1 / 1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden'
              }}
            >
              {isCameraOn ? (
                selectedCamera ? (
                  <Scanner
                    onScan={handleScanResult}
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
                      aspectRatio: 1 / 1
                    }}
                  // containerStyle={{ width: '100%', height: '100%' }}
                  />
                ) : (
                  <Text c="dimmed">Vui lòng chọn camera</Text>
                )
              ) : (
                <Text c="dimmed">Camera đang tắt</Text>
              )}
            </Box>

            <Divider label="Hoặc" />

            <Group wrap='nowrap' justify='space-between'>
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
                style={{ flex: 1 }}
              />
              {/* <Button onClick={() => handleTicketLookup(ticketIdInput)} disabled={!ticketIdInput}>
              Check
            </Button> */}
              <ActionIcon
                variant="light"
                size={36}
                onClick={() => handleTicketLookup(ticketIdInput)} disabled={!ticketIdInput}
                title="Check"
              >
                <IconChecks size={18} />
              </ActionIcon>
            </Group>

            {/* Hiển thị Log (Để Debug) */}
             <Paper withBorder p="xs" mt="md" radius="sm">
               <Text size="xs" fw={500} mb={5}>Camera Debug Log:</Text>
               <ScrollArea h={100}>
                 <Stack gap={2}>
                   {cameraLog.map((line, index) => (
                     <Text key={index} size="xs" c="dimmed" ff="monospace">{line}</Text>
                   ))}
                 </Stack>
               </ScrollArea>
             </Paper>
          </Stack>
        )}
      </Container>
    </>
  );
}