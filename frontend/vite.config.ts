import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { '/api': 'http://localhost:3005' } },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@phosphor-icons')) return 'icons';
            if (id.includes('zod') || id.includes('react-hook-form') || id.includes('@hookform'))
              return 'forms';
            if (id.includes('@radix-ui')) return 'dialog';
            return 'vendor';
          }
        },
      },
    },
  },
});
