import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite'
// https://vitejs.dev/config
export default defineConfig({
  resolve: {
    alias: {
      '@': '/src'
    }
  },
  build: {
    sourcemap: 'inline',
  },
  esbuild: {
    jsxFactory: 'React.createElement',
    jsxFragment: 'React.Fragment',
  },
  plugins: [
    tailwindcss(),
  ],
});
