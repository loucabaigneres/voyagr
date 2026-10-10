import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5174,
    strictPort: true, // Exit if the port is already in use (web app owns 5173)
  },
  preview: {
    port: 5174,
    strictPort: true,
  },
});
