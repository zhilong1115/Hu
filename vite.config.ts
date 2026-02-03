import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  base: '/Hu/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'terser',
    target: 'es2020',
    cssCodeSplit: false,
    rollupOptions: {
      input: {
        main: 'index.html',
      },
      output: {
        manualChunks: undefined,
        inlineDynamicImports: true,
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]',
      },
    },
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
        passes: 2,
      },
      mangle: {
        safari10: true,
      },
      format: {
        comments: false,
      },
    } as any,
    chunkSizeWarningLimit: 2000,
    reportCompressedSize: true,
  },
  server: {
    port: 3000,
    open: true,
  },
  optimizeDeps: {
    include: ['phaser'],
  },
});