import { useRef } from 'react';
import { Card, Box, Group, Stack, Badge, Image, Button, Text, Title, ThemeIcon, useMantineColorScheme } from '@mantine/core';
import { IconClock, IconMapPin } from '@tabler/icons-react';
import { formatDateTime } from '../../utils/formatters';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { notifications } from '@mantine/notifications';

// Component này sẽ render một chiếc vé duy nhất và chứa logic tải về
export function DownloadableTicket({ ticket, group, index }: { ticket: any, group: any, index: number, total: number }) {
  const ticketRef = useRef<HTMLDivElement>(null);
  const { colorScheme } = useMantineColorScheme();
  const edgeColor = colorScheme === "dark" ? "#424242" : "#e9ecef";

  const handleDownload = async () => {
    const ticketElement = ticketRef.current;
    if (!ticketElement) return;

    // Tìm nút "Lưu vé" bên trong component
    const buttonElement = ticketElement.querySelector('.download-button') as HTMLElement;

    // Tạm thời ẩn nút đi trước khi "chụp ảnh"
    if (buttonElement) {
      buttonElement.style.visibility = 'hidden';
    }

    const notificationId = notifications.show({
      loading: true,
      title: 'Đang tạo file PDF',
      message: 'Vui lòng chờ trong giây lát...',
      autoClose: false,
      withCloseButton: false,
    });

    try {
      const canvas = await html2canvas(ticketElement, {
        scale: 2, // Tăng độ phân giải để ảnh nét hơn
        backgroundColor: colorScheme === 'dark' ? '#1a1b1e' : '#ffffff',
      });
      
      const imgData = canvas.toDataURL('image/png');
      
      // Thêm lề (margin) cho file PDF
      const margin = 40; // 40px margin
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        // Tạo một trang PDF lớn hơn kích thước của vé để chứa lề
        format: [canvas.width + margin * 2, canvas.height + margin * 2]
      });
      
      // Thêm ảnh vé đã chụp vào giữa trang PDF
      pdf.addImage(imgData, 'PNG', margin, margin, canvas.width, canvas.height);
      pdf.save(`Ve_${group.eventName.replace(/\s/g, '_')}_${ticket.id.split('-')[0]}.pdf`);

      notifications.update({
        id: notificationId,
        color: 'green',
        title: 'Thành công',
        message: 'Đã tải vé về thành công!',
        autoClose: 2000,
      });

    } catch (error) {
      notifications.update({
        id: notificationId,
        color: 'red',
        title: 'Thất bại',
        message: 'Không thể tạo file PDF. Vui lòng thử lại.',
        autoClose: 2000,
      });
      console.error("Error generating PDF:", error);
    } finally {
      // Luôn đảm bảo nút được hiển thị lại sau khi hoàn tất
      if (buttonElement) {
        buttonElement.style.visibility = 'visible';
      }
    }
  };

  return (
    <Group gap="xs" maw={590} miw={590}>
      <Card
        ref={ticketRef} // Gắn ref vào đây để có thể "chụp ảnh"
        px="lg"
        py="xs"
        mb="xs"
        style={{
          position: "relative",
          overflow: "hidden",
          width: "100%",
          borderTop: `2px dashed ${edgeColor}`,
          borderBottom: `2px dashed ${edgeColor}`,
        }}
      >
        <Box component="span" style={{
            pointerEvents: "none",
            position: "absolute",
            inset: 0,
        }}>
            <Box component="span" style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: 18, background: `linear-gradient(135deg, ${edgeColor} 8px, transparent 8px) 0 0/18px 18px repeat-y, linear-gradient(225deg, ${edgeColor} 8px, transparent 8px) 0 9px/18px 18px repeat-y` }} />
            <Box component="span" style={{ position: "absolute", top: 0, bottom: 0, right: 0, width: 18, background: `linear-gradient(135deg, ${edgeColor} 8px, transparent 8px) 0 0/18px 18px repeat-y, linear-gradient(225deg, ${edgeColor} 8px, transparent 8px) 0 9px/18px 18px repeat-y` }} />
            <Box component="span" style={{ position: "absolute", top: 12, bottom: 12, left: "29%", transform: "translateX(-50%)", width: 0, borderLeft: `2px dashed ${edgeColor}`, opacity: 0.8 }} />
        </Box>
        <Group justify='space-between' wrap="nowrap" gap="0">
          <Stack gap="xs" mx="xs" style={{ flex: 1, maxWidth: 148 }}>
            <Badge radius="sm" color="#008a87">#{index + 1}</Badge>
            <Box style={{ border: `2px dashed ${edgeColor}`, borderRadius: 8, padding: 12, textAlign: "center" }}>
              <Stack gap={0} align="center">
                <Image src={ticket.qrCodeUrl} w={100} h={100} fit="contain" alt={`QR Code for ticket ${ticket.id}`} />
                <Text size="xs" fz="10px" c="dimmed">Quét mã này tại cổng</Text>
              </Stack>
            </Box>
            {/* Thêm className để có thể tìm và ẩn nút này */}
            <Button className="download-button" variant="light" color="#008a87" radius="md" onClick={handleDownload}>Lưu vé</Button>
          </Stack>
          <Box style={{ width: 12, minWidth: 12 }} />
          <Stack gap="xs" mx="xs" align='start' style={{ minWidth: 322 }}>
            <Badge size="md" variant="light" radius="sm" color="#008a87" w="fit-content">VÉ VÀO CỬA</Badge>
            <Title order={4} style={{ lineHeight: 1.15 }}>Sự kiện {group.eventName}</Title>
            <Text size="xs" c="dimmed">MÃ VÉ: {ticket.id}</Text>
            <Text size="xs" c="dimmed">LOẠI VÉ: {ticket.typeName}</Text>
            <Text size="xs" c="dimmed">GIÁ: {ticket.price > 0 ? `${ticket.price.toLocaleString('vi-VN')}đ` : 'Miễn phí'}</Text>
            <Group gap="sm" wrap='nowrap'>
              <ThemeIcon variant="light" size="lg"><IconClock size={18} /></ThemeIcon>
              <Stack gap={0}>
                <Text size="xs">Thời gian</Text>
                <Text size="xs" c="dimmed">{formatDateTime(group.eventStartTime)} - {formatDateTime(group.eventEndTime)}</Text>
              </Stack>
            </Group>
            <Group gap="sm" wrap='nowrap'>
              <ThemeIcon variant="light" size="lg"><IconMapPin size={18} /></ThemeIcon>
              <Stack gap={0}>
                <Text size="xs">Địa điểm</Text>
                <Text size="xs" c="dimmed">{group.location}</Text>
              </Stack>
            </Group>
          </Stack>
        </Group>
      </Card>
    </Group>
  );
}
