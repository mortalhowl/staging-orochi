import { create } from 'zustand';
import { persist } from 'zustand/middleware'; // 1. Import persist
import type { EventWithDetails } from '../types';

interface CartState {
  event: EventWithDetails | null;
  cart: { [key: string]: number };
  totalAmount: number;
  totalTickets: number;
  setEvent: (event: EventWithDetails) => void;
  updateCart: (ticketId: string, quantity: number) => void;
  clearCart: () => void;
}

// 2. Bọc toàn bộ store trong persist
export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      event: null,
      cart: {},
      totalAmount: 0,
      totalTickets: 0,
      
      setEvent: (event) => set({ event, cart: {}, totalAmount: 0, totalTickets: 0 }),

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

        set({ cart: newCart, totalAmount, totalTickets });
      },

      clearCart: () => set({ event: null, cart: {}, totalAmount: 0, totalTickets: 0 }),
    }),
    {
      name: 'orochi-ticket-cart', // Tên key trong localStorage
    }
  )
);