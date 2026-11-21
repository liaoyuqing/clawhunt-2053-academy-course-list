import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 不配置任何外链资源（无 CDN / Google Fonts），构建产物只引用本地资源。
export default defineConfig({
  plugins: [react()],
  server: { port: 5201, strictPort: true },
  preview: { port: 5201, strictPort: true },
  build: { outDir: 'dist', sourcemap: false },
});
