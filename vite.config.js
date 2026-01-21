/** @fileoverview vite.config.js */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import istanbul from 'vite-plugin-istanbul'; // 1. Import the plugin

export default defineConfig({
  plugins: [
    react(),
    // 2. Add Istanbul with the requireEnv guard
    istanbul({
      include: 'src/**/*', // [cite: 2026-01-18] FIX: Recursive include to ensure utilities/services are instrumented
      exclude: ['node_modules', 'tests/'],
      extension: ['.js', '.jsx'],
      requireEnv: true, // 🛡️ ONLY instrument if VITE_COVERAGE=true
      checkProd: false,  // Ensure it doesn't accidentally instrument prod builds
    }),
  ],
  
  // 🟢 FIX: Allow JSX in .js files
  optimizeDeps: {
    esbuildOptions: {
      loader: { '.js': 'jsx' },
    },
  },
  esbuild: {
    loader: 'jsx',
    include: /src\/.*\.js$/,
    exclude: [],
  },

  // 🟢 CRITICAL WORKER CONFIG
  worker: {
    format: 'es',
    plugins: () => [
      react(),
      // 🎯 THE FIX: Add istanbul here too so the worker code is instrumented!
      istanbul({
        include: 'src/*',
        exclude: ['node_modules', 'tests/'],
        extension: ['.js', '.jsx'],
        requireEnv: true,
      }),
    ],
  },

  base: '/parametric/',

  server: {
    port: 3000,
    open: true,
    hmr: { overlay: false }
  },

  build: {
    assetsInlineLimit: 0, 
    rollupOptions: {
      output: {
        assetFileNames: 'assets/[name].[hash][extname]',
        chunkFileNames: 'assets/[name].[hash].js',
        entryFileNames: 'assets/[name].[hash].js',
      },
    },
  },
});