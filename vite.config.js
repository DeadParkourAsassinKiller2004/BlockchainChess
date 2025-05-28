import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
    plugins: [
        nodePolyfills({
            buffer: true,
            crypto: true,
            http: true,
            https: true,
            stream: true
        })
    ],
    define: {
        'process.env': {},
        global: 'globalThis'
    }
});