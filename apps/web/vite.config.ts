import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
export default defineConfig({plugins:[react()],base:'./',publicDir:fileURLToPath(new URL('../../public',import.meta.url)),server:{port:5180,strictPort:true,fs:{allow:[fileURLToPath(new URL('../..',import.meta.url))]}},build:{outDir:'dist',chunkSizeWarningLimit:1800,rollupOptions:{output:{manualChunks(id){if(id.includes('@babylonjs'))return 'scene';if(id.includes('react'))return 'ui';}}}}});
