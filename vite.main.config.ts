import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig({
    build: {
        sourcemap: 'inline',
        rollupOptions: {
            external: ['pdf-parse']
        }
    },
    optimizeDeps: {
        exclude: ['pdf-parse']
    }
});
