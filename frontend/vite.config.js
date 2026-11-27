import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // GitHub Pages serves from /workwell/; the deploy workflow sets VITE_BASE. Local dev stays at '/'.
  base: process.env.VITE_BASE || '/',
  plugins: [react()],
  server: { port: 5173, strictPort: false },
});
