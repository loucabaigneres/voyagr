import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tanstackRouter(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true, // Exit if the port is already in use
  },
});
