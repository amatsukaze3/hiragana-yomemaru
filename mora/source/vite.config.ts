import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// `npm run build:single`        … よめ丸（dist-single/index.html）
// `npm run build:single:shoot`  … よめ丸シューティング（dist-single-shoot/shooting.html）
const single = process.env.SINGLE === '1'

export default defineConfig({
  plugins: [react(), tailwindcss(), ...(single ? [viteSingleFile()] : [])],
  build: {
    assetsInlineLimit: single ? 100_000_000 : 4096,
    outDir: single ? 'dist-single' : 'dist',
    rollupOptions: { input: resolve(__dirname, 'index.html') },
  },
})
