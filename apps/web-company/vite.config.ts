import { vitePlugin as remix } from '@remix-run/dev';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
export default defineConfig({
  plugins: [remix({ ssr: true }), tsconfigPaths()],
  ssr: { noExternal: ['@careernest/ui', '@careernest/lib', '@careernest/shared'] },
  server: { port: 3004, proxy: { '/api': { target: 'http://localhost:4000', changeOrigin: true } } },
});
