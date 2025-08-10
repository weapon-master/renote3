import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig({
    build: {
        sourcemap: 'inline',
        rollupOptions: {
            external: [
                'pdf-parse', 
                'better-sqlite3',
                'electron'
            ],
            output: {
                format: 'commonjs'
            }
        }
    },
    optimizeDeps: {
        exclude: ['pdf-parse', 'better-sqlite3']
    },
    define: {
        'process.env.NODE_ENV': '"production"'
    }
});
