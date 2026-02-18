import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/maze-game/',
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/@mysten')) return 'sui-sdk';
          if (id.includes('node_modules/react')) return 'react-vendor';
        },
      },
    },
  },
})
