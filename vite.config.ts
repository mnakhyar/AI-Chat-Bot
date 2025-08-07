import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    proxy: {
      '/api': {
        target: 'http://10.20.42.214:11434',
        changeOrigin: true
      }
    }
  }
})
