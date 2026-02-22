import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    // allow ngrok host for external access (only hostname, no protocol)
    allowedHosts: ['cd0d-106-77-164-36.ngrok-free.app'],
    proxy: {
      '/api': 'http://localhost:5001',
    },
  },
});
