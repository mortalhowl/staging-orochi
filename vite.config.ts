// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path' // Thêm dòng này

// https://vite.dev/config/
export default defineConfig({
  base: "/",
  plugins: [react()],
  // Thêm đoạn code này
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})