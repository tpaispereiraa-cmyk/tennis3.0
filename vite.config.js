import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,   // escuta em 0.0.0.0 → amigo acessa via IP da sua máquina
    port: 5173,
  },
});
