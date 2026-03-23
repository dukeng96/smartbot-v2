import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig(({ mode }) => {
  const isLoaderBuild = mode === 'loader'

  return {
  build: {
    lib: isLoaderBuild
      ? {
          entry: resolve(__dirname, 'src/loader.ts'),
          name: 'SmartbotLoader',
          formats: ['iife'],
          fileName: () => 'smartbot-widget-loader.iife.js',
        }
      : {
          entry: resolve(__dirname, 'src/index.ts'),
          name: 'SmartbotWidget',
          formats: ['iife'],
          fileName: () => 'smartbot-widget.iife.js',
        },
    cssCodeSplit: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        passes: 2,
        drop_console: false,
      },
      mangle: true,
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
    outDir: 'dist',
    // Only empty outDir for the main build, not loader
    emptyOutDir: !isLoaderBuild,
  },
  server: {
    port: 5173,
    strictPort: false,
  },
  preview: {
    port: 5174,
  },
  }
})
