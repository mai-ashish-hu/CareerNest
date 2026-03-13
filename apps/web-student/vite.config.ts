import { vitePlugin as remix } from '@remix-run/dev';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
export default defineConfig({
  plugins: [remix({ ssr: true }), tsconfigPaths()],
  ssr: { noExternal: ['@careernest/ui', '@careernest/lib', '@careernest/shared'] },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('lucide-react')) return 'vendor-icons';
        },
      },
    },
  },
  server: { port: 3003, proxy: { '/api': { target: 'http://localhost:4000', changeOrigin: true } } },
});
