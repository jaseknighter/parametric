/** @fileoverview vite.config.js */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import istanbul from 'vite-plugin-istanbul'; // 1. Import the plugin

export default defineConfig({
  plugins: [
    react(),
    // 2. Add Istanbul with the requireEnv guard
    istanbul({
      include: [
        'src/**/*.{js,ts,jsx,tsx}', // general instrumentation
        'src/containers/Parametric/**/*.{js,ts,jsx,tsx}', // 🟢 FORCE Display Layer
      ],
      exclude: ['node_modules', 'tests/'],
      extension: ['.js', '.ts', '.jsx', '.tsx'],
      requireEnv: true, // 🛡️ ONLY instrument if VITE_COVERAGE=true
      checkProd: false,  // Ensure it doesn't accidentally instrument prod builds
      forceBuildInstrument: true, // 🟢 Crucial: Ensures the dev server emits instrumented code
      verbose: true
    }),
    // 3. Diagnostic: Confirm Coverage Mode
    {
      name: 'log-coverage-env',
      config: () => {
        console.log('⚠️ [Vite] VITE_COVERAGE:', process.env.VITE_COVERAGE);
      }
    }
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
        include: [
          'src/**/*.{js,jsx}',
          'src/containers/Parametric/**/*.{js,jsx}'
        ],
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
    hmr: { overlay: false },
    watch: {
      // 🟢 Add these patterns to the ignored list
      ignored: ['**/coverage/**', '**/monocart-report/**']
    },
    headers: {
      // [cite: 2026-01-27] SAFARI FIX: Prevent caching of "null" worker responses on refresh
      'Cache-Control': 'no-store',
    }
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