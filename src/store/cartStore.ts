import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { EventWithDetails, Voucher } from '../types';

interface AppliedVoucherInfo {
  voucher: Voucher;
  discountAmount: number;
}

interface CartState {
  event: EventWithDetails | null;
  cart: { [key: string]: number };
  totalAmount: number;
  totalTickets: number;
  appliedVoucher: AppliedVoucherInfo | null; // State mới cho voucher
  finalAmount: number; // State mới cho tổng tiền cuối cùng
  setEvent: (event: EventWithDetails) => void;
  updateCart: (ticketId: string, quantity: number) => void;
  applyVoucher: (voucherInfo: AppliedVoucherInfo) => void; // Action mới
  removeVoucher: () => void; // Action mới
  clearCart: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      event: null,
      cart: {},
      totalAmount: 0,
      totalTickets: 0,
      appliedVoucher: null,
      finalAmount: 0,
      
      setEvent: (event) => set({ 
        event, 
        cart: {}, 
        totalAmount: 0, 
        totalTickets: 0, 
        appliedVoucher: null, 
        finalAmount: 0 
      }),

      updateCart: (ticketId, quantity) => {
        const { event, cart } = get();
        const newCart = { ...cart, [ticketId]: quantity };
        
        if (quantity === 0) {
          delete newCart[ticketId];
        }

        const ticketTypes = event?.ticket_types || [];
        const totalAmount = Object.entries(newCart).reduce((total, [id, qty]) => {
          const ticket = ticketTypes.find(t => t.id === id);
          return total + (ticket ? ticket.price * qty : 0);
        }, 0);
        
        const totalTickets = Object.values(newCart).reduce((sum, qty) => sum + qty, 0);

        // Khi giỏ hàng thay đổi, xóa voucher đã áp dụng
        set({ cart: newCart, totalAmount, totalTickets, appliedVoucher: null, finalAmount: totalAmount });
      },

      applyVoucher: (voucherInfo) => {
        const { totalAmount } = get();
        set({
          appliedVoucher: voucherInfo,
          finalAmount: totalAmount - voucherInfo.discountAmount,
        });
      },

      removeVoucher: () => {
        const { totalAmount } = get();
        set({ appliedVoucher: null, finalAmount: totalAmount });
      },

      clearCart: () => set({ 
        event: null, 
        cart: {}, 
        totalAmount: 0, 
        totalTickets: 0, 
        appliedVoucher: null, 
        finalAmount: 0 
      }),
    }),
    {
      name: 'orochi-ticket-cart',
    }
  )
);
