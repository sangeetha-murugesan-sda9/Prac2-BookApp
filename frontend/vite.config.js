import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // only the api - the audit service is internal-only, reached
      // through the api's /api/audit-log passthrough route
      '/api': 'http://localhost:4000'
    }
  }
});
