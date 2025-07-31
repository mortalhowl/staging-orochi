import { Paper, Title, Badge, Stack, Group, Text, Divider, Button, ActionIcon, NumberInput } from '@mantine/core';
import { useState, useMemo, useEffect } from 'react';
import type { EventWithDetails } from '../../types';
import { IconPlus, IconMinus } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';

interface TicketSelectionProps {
  event: EventWithDetails;
}

const MAX_TICKETS_PER_TYPE = 10;

export function TicketSelection({ event }: TicketSelectionProps) {
  const { ticket_types: ticketTypes, sale_start_time, sale_end_time } = event;
  const [cart, setCart] = useState<{ [key: string]: number }>({});
  
  // State để theo dõi các input không hợp lệ
  const [invalidInputs, setInvalidInputs] = useState<{[key: string]: boolean}>({});

  const isSaleOpen = useMemo(() => {
    if (!sale_start_time || !sale_end_time) {
      return true;
    }
    const now = new Date();
    const startTime = new Date(sale_start_time);
    const endTime = new Date(sale_end_time);
    return now >= startTime && now <= endTime;
  }, [sale_start_time, sale_end_time]);

  const handleQuantityChange = (ticketId: string, value: number | string) => {
    const ticket = ticketTypes.find(t => t.id === ticketId);
    if (!ticket) return;

    // Chuyển đổi an toàn sang số nguyên
    let newQuantity = parseInt(String(value), 10);

    // Xử lý giá trị không hợp lệ
    if (isNaN(newQuantity)) {
      newQuantity = 0;
    }

    // Tính toán giới hạn cho loại vé này
    const remaining = ticket.quantity_total !== null ? ticket.quantity_total - ticket.quantity_sold : Infinity;
    const maxAllowed = Math.min(MAX_TICKETS_PER_TYPE, remaining);

    // Kiểm tra nếu giá trị vượt quá giới hạn
    if (newQuantity > maxAllowed) {
      setInvalidInputs(prev => ({ ...prev, [ticketId]: true }));
    } else {
      setInvalidInputs(prev => ({ ...prev, [ticketId]: false }));
    }

    // Cập nhật giỏ hàng
    setCart((currentCart) => ({
      ...currentCart,
      [ticketId]: newQuantity,
    }));
  };

  // Sử dụng useEffect để kiểm tra và điều chỉnh giá trị sau khi cập nhật
  useEffect(() => {
    const newCart = { ...cart };
    let hasChanges = false;

    Object.entries(cart).forEach(([ticketId, quantity]) => {
      const ticket = ticketTypes.find(t => t.id === ticketId);
      if (!ticket) return;

      const remaining = ticket.quantity_total !== null ? ticket.quantity_total - ticket.quantity_sold : Infinity;
      const maxAllowed = Math.min(MAX_TICKETS_PER_TYPE, remaining);

      if (quantity > maxAllowed) {
        newCart[ticketId] = maxAllowed;
        hasChanges = true;
        
        // Hiển thị cảnh báo
        notifications.show({
          title: 'Số lượng không hợp lệ',
          message: `Bạn chỉ được mua tối đa ${maxAllowed} vé cho loại ${ticket.name}`,
          color: 'red',
          autoClose: 3000,
        });
      }
    });

    if (hasChanges) {
      setCart(newCart);
    }
  }, [cart, ticketTypes]);

  const totalAmount = useMemo(() => {
    return ticketTypes.reduce((total, ticket) => {
      const quantity = cart[ticket.id] || 0;
      return total + quantity * ticket.price;
    }, 0);
  }, [cart, ticketTypes]);

  const totalTickets = useMemo(() => 
    Object.values(cart).reduce((sum, qty) => sum + qty, 0), 
    [cart]
  );

  return (
    <Paper withBorder p="lg" radius="md" pos="sticky" top={80}>
      <Group justify="space-between">
        <Title order={3}>Mua vé</Title>
        <Badge size="lg" color={isSaleOpen ? '#008a87' : 'red'}>
          {isSaleOpen ? 'Đang mở bán' : 'Đã đóng'}
        </Badge>
      </Group>
      <Divider my="sm" />
      <Stack>
        {ticketTypes.filter(t => t.status === 'public').map((ticket) => {
          const quantity = cart[ticket.id] || 0;
          const remaining = ticket.quantity_total !== null ? ticket.quantity_total - ticket.quantity_sold : Infinity;
          const maxAllowed = Math.min(MAX_TICKETS_PER_TYPE, remaining);
          const isInvalid = invalidInputs[ticket.id];

          return (
            <div key={ticket.id}>
              <Group justify="space-between">
                <Stack gap={0}>
                  <Text fw={500}>{ticket.name}</Text>
                  <Text size="xs" c="dimmed">{ticket.description}</Text>
                </Stack>
                <Text fw={700}>{ticket.price.toLocaleString('vi-VN')}đ</Text>
              </Group>
              
              <Group justify="flex-end" gap="xs" mt="xs">
                <ActionIcon 
                  size={36} 
                  variant="default" 
                  onClick={() => handleQuantityChange(ticket.id, quantity - 1)}
                  disabled={quantity === 0 || !isSaleOpen}
                >
                  <IconMinus size={18} />
                </ActionIcon>
                
                <NumberInput
                  value={quantity}
                  onChange={(val) => handleQuantityChange(ticket.id, val)}
                  min={0}
                  max={maxAllowed}
                  disabled={!isSaleOpen || maxAllowed === 0}
                  hideControls
                  styles={{ 
                    input: { 
                      textAlign: 'center', 
                      width: '4rem',
                      borderColor: isInvalid ? 'red' : undefined,
                      //  backgroundColor: isInvalid ? '#fff0f0' : undefined
                    } 
                  }}
                />

                <ActionIcon 
                  size={36} 
                  variant="default" 
                  onClick={() => handleQuantityChange(ticket.id, quantity + 1)}
                  disabled={quantity >= maxAllowed || !isSaleOpen || maxAllowed === 0}
                >
                  <IconPlus size={18} />
                </ActionIcon>
              </Group>
              <Text size="xs" c="dimmed" ta="right">
                {remaining !== Infinity ? `Còn lại: ${remaining} vé` : ''}
              </Text>
              {maxAllowed === 0 && (
                <Text size="xs" c="red" ta="right">Loại vé này đã hết</Text>
              )}
            </div>
          );
        })}
      </Stack>
      <Divider my="sm" />
      <Group justify="space-between">
        <Text>Tổng cộng ({totalTickets} vé):</Text>
        <Text fw={700} size="xl">{totalAmount.toLocaleString('vi-VN')}đ</Text>
      </Group>
      <Button 
        fullWidth 
        mt="md" 
        size="md" 
        bg="#008a87"
        disabled={totalTickets === 0 || !isSaleOpen}
      >
        Thanh toán
      </Button>
    </Paper>
  );
}